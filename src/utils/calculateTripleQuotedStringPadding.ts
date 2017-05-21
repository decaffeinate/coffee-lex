import SourceLocation from '../SourceLocation';
import SourceType from '../SourceType';
import BufferedStream from './BufferedStream';
import isNewlineEscaped from './isNewlineEscaped';
import PaddingTracker from './PaddingTracker';
import { TrackedFragment } from './PaddingTracker';

/**
 * Compute the padding (the extra spacing to remove) for the given herestring.
 *
 * CoffeeScript removes spacing in the following situations:
 * - If the first or last line is completely blank, it is removed.
 * - The "common leading whitespace" is removed from each line if possible. This
 *   is computed by taking the smallest nonzero amount of leading whitespace
 *   among all lines except the partial line immediately after the open quotes
 *   and except lines that consist only of whitespace. Note that this "smallest
 *   nonzero amount" behavior doesn't just ignore blank lines; *any* line with
 *   no leading whitespace will be ignored when calculating this value. Even
 *   though the initial partial line has no effect when computing leading
 *   whitespace, the common leading whitespace is still removed from that line
 *   if possible.
 * - Due to a bug in CoffeeScript, if the first full line (the one after the
 *   partial line) is nonempty and has indent zero, the entire string is
 *   considered to have "common leading whitespace" zero.
 * - Due to another bug in CoffeeScript, if the herestring has exactly two lines
 *   that both consist of only whitespace, the whitespace and newline is removed
 *   from the first line, but the second line keeps all of its whitespace.
 *
 * See the stringToken function in lexer.coffee in the CoffeeScript source code
 * for CoffeeScript's implementation of this.
 */
export default function calculateTripleQuotedStringPadding(source: string, stream: BufferedStream): Array<SourceLocation> {
  let paddingTracker;
  if (stream.hasNext(SourceType.TSSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, SourceType.TSSTRING_END);
  } else if (stream.hasNext(SourceType.TDSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, SourceType.TDSTRING_END);
  } else {
    return [];
  }

  let firstFragment = paddingTracker.fragments[0];
  let firstContent = firstFragment.content;
  let lastFragment = paddingTracker.fragments[paddingTracker.fragments.length - 1];
  let lastContent = lastFragment.content;

  let sharedIndent = getIndentForFragments(paddingTracker.fragments);

  if (firstContent.indexOf('\n') > -1 && isWhitespace(firstContent.split('\n')[0])) {
    firstFragment.markPadding(0, firstContent.indexOf('\n') + 1);
  }
  if (!shouldSkipRemovingLastLine(paddingTracker)) {
    let lastLines = lastContent.split('\n');
    if (lastLines.length > 1) {
      let lastLine = lastLines[lastLines.length - 1];
      if (isWhitespace(lastLine)) {
        lastFragment.markPadding(
          lastFragment.content.length - lastLine.length - 1,
          lastFragment.content.length
        );
      }
    }
  }

  for (let fragment of paddingTracker.fragments) {
    for (let i = 0; i < fragment.content.length; i++) {
      if (fragment.content[i] === '\n' && isNewlineEscaped(fragment.content, i)) {
        let backslashPos = fragment.content.lastIndexOf('\\', i);
        fragment.markPadding(backslashPos, i + 1);
      }

      let isStartOfLine = i > 0 && fragment.content[i - 1] === '\n';
      let isStartOfString = fragment.index === 0 && i === 0;
      if (isStartOfLine || isStartOfString) {
        let paddingStart = i;
        let paddingEnd = i + sharedIndent.length;
        if (fragment.content.slice(paddingStart, paddingEnd) === sharedIndent) {
          fragment.markPadding(paddingStart, paddingEnd);
        }
      }
    }
  }

  return paddingTracker.computeSourceLocations();
}

function getIndentForFragments(fragments: Array<TrackedFragment>): string {
  let hasSeenLine = false;
  let smallestIndent: string | null = null;
  for (let fragment of fragments) {
    let lines = fragment.content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      let indent = getLineIndent(line);

      // Replicate a bug in CoffeeScript: if the first line considered has
      // indentation zero and is nonempty, the empty indentation isn't ignored
      // like it should be, so the empty string is used as the indentation.
      if (!hasSeenLine && indent.length === 0 && line.length > 0) {
        return '';
      }
      hasSeenLine = true;

      let isFullLine = i < lines.length - 1 || fragment.index === fragments.length - 1;
      // Ignore zero-indentation lines and whitespace-only lines.
      if (indent.length === 0 || (isFullLine && indent === line)) {
        continue;
      }
      if (smallestIndent === null || indent.length < smallestIndent.length) {
        smallestIndent = indent;
      }
    }
  }
  if (smallestIndent === null) {
    return '';
  }
  return smallestIndent;
}

/**
 * Replicate a bug in CoffeeScript: if the string is whitespace-only with
 * exactly two lines, we run the code to remove the first line but not the last
 * line.
 */
function shouldSkipRemovingLastLine(paddingTracker: PaddingTracker): boolean {
  if (paddingTracker.fragments.length !== 1) {
    return false;
  }
  let lines = paddingTracker.fragments[0].content.split('\n');
  return lines.length === 2 && isWhitespace(lines[0]) && isWhitespace(lines[1]);
}

function getLineIndent(line: string): string {
  let match = /[^\n\S]*/.exec(line);
  if (match) {
    return match[0];
  } else {
    return '';
  }
}

function isWhitespace(line: string): boolean {
  return /^[^\n\S]*$/.test(line);
}
