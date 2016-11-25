/* @flow */
import { SSTRING_START, SSTRING_END, DSTRING_START, DSTRING_END } from '../index.js';
import PaddingTracker from './PaddingTracker';

import type BufferedStream from './BufferedStream.js';
import type SourceLocation from '../SourceLocation.js';

/**
 * Compute the whitespace to remove in a multiline single or double quoted
 * string. The algorithm naturally handles handles the case of a string without
 * newlines, so we don't need a special case for that. We also generally need to
 * mark newlines as "line separators" so that later they will be turned into
 * spaces, and extra whitespace at the start and end of each line (except the
 * start of the first line and the end of the last line) is ignored.
 */
export default function calculateNormalStringPadding(source: string, stream: BufferedStream): Array<SourceLocation> {
  let paddingTracker;
  if (stream.hasNext(SSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, SSTRING_END);
  } else if (stream.hasNext(DSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, DSTRING_END);
  } else {
    return [];
  }

  // The general strategy is to find each newline character and mark it as a
  // line separator and mark all surrounding whitespace as padding.
  for (let fragmentIndex = 0; fragmentIndex < paddingTracker.fragments.length; fragmentIndex++) {
    let fragment = paddingTracker.fragments[fragmentIndex];
    let content = fragment.content;
    let lastNonWhitespace = -1;
    let pos = 0;

    while (pos < content.length) {
      if (content[pos] === '\n') {
        let startIndex = lastNonWhitespace + 1;
        fragment.markPadding(lastNonWhitespace + 1, pos);
        let newlinePos = pos;
        pos++;
        // Search forward until the next non-whitespace character. Even skip
        // newlines, so that two or more newlines with only spaces between them
        // will result in a single line separator.
        while (pos < content.length &&
            (content[pos] === ' ' || content[pos] === '\t' || content[pos] === '\n')) {
          pos++;
        }
        let endIndex = pos;
        if (isNewlineEscaped(content, newlinePos)) {
          // Escaped newlines behave a bit strangely: whitespace is removed from
          // the right side but not the left side, and the newline and its
          // escape character are removed.
          let backslashPos = content.lastIndexOf('\\', newlinePos);
          fragment.markPadding(backslashPos, endIndex);
        } else if ((fragmentIndex === 0 && startIndex === 0) ||
            (fragmentIndex === paddingTracker.fragments.length - 1 && endIndex === content.length)) {
          // We only want spaces between, not around, lines, so if we're up
          // against the left side or right side of the string, mark the newline
          // as padding.
          fragment.markPadding(startIndex, endIndex);
        } else {
          // Otherwise, the newline should be a line separator that will become
          // a space and everything else should be padding.
          fragment.markPadding(startIndex, newlinePos);
          fragment.markLineSeparator(newlinePos);
          fragment.markPadding(newlinePos + 1, endIndex);
        }
        lastNonWhitespace = pos;
      } else {
        if (content[pos] !== ' ' && content[pos] !== '\t') {
          lastNonWhitespace = pos;
        }
        pos++;
      }
    }
  }
  return paddingTracker.computeSourceLocations();
}

/**
 * A newline character is escaped if it's preceded by an odd number of
 * backslashes. Spaces are allowed between the backslashes and the newline.
 */
function isNewlineEscaped(content: string, newlinePos: number): boolean {
  let numSeenBackslashes = 0;
  let prevPos = newlinePos - 1;
  while (prevPos >= 0) {
    let char = content[prevPos];
    if (numSeenBackslashes === 0 && (char === ' ' || char === '\t')) {
      prevPos--;
    } else if (char === '\\') {
      numSeenBackslashes++;
      prevPos--;
    } else {
      break;
    }
  }
  return numSeenBackslashes % 2 == 1;
}
