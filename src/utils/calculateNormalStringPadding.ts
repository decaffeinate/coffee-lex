import { SourceLocation } from '../SourceLocation'
import { SourceType } from '../SourceType'
import { BufferedStream } from './BufferedStream'
import { isNewlineEscaped } from './isNewlineEscaped'
import { PaddingTracker } from './PaddingTracker'

/**
 * Compute the whitespace to remove in a multiline single or double quoted
 * string. The algorithm naturally handles handles the case of a string without
 * newlines, so we don't need a special case for that. We also generally need to
 * mark newlines as "line separators" so that later they will be turned into
 * spaces, and extra whitespace at the start and end of each line (except the
 * start of the first line and the end of the last line) is ignored.
 */
export function calculateNormalStringPadding(
  source: string,
  stream: BufferedStream
): Array<SourceLocation> {
  let paddingTracker
  if (stream.hasNext(SourceType.SSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, SourceType.SSTRING_END)
  } else if (stream.hasNext(SourceType.DSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, SourceType.DSTRING_END)
  } else {
    return []
  }

  // The general strategy is to find each newline character and mark it as a
  // line separator and mark all surrounding whitespace as padding.
  for (
    let fragmentIndex = 0;
    fragmentIndex < paddingTracker.fragments.length;
    fragmentIndex++
  ) {
    const fragment = paddingTracker.fragments[fragmentIndex]
    const content = fragment.content
    let lastNonWhitespace = -1
    let pos = 0

    while (pos < content.length) {
      if (content[pos] === '\n') {
        const startIndex = lastNonWhitespace + 1
        fragment.markPadding(lastNonWhitespace + 1, pos)
        const newlinePos = pos
        pos++
        // Search forward until the next non-whitespace character. Even skip
        // newlines, so that two or more newlines with only spaces between them
        // will result in a single line separator. Escaped newline characters
        // are also allowed and should be skipped.
        while (
          (pos < content.length && ' \t\n'.includes(content[pos])) ||
          content.slice(pos, pos + 2) === '\\\n'
        ) {
          pos++
        }
        const endIndex = pos
        if (isNewlineEscaped(content, newlinePos)) {
          // Escaped newlines behave a bit strangely: whitespace is removed from
          // the right side but not the left side, and the newline and its
          // escape character are removed.
          const backslashPos = content.lastIndexOf('\\', newlinePos)
          fragment.markPadding(backslashPos, endIndex)
        } else if (
          (fragmentIndex === 0 && startIndex === 0) ||
          (fragmentIndex === paddingTracker.fragments.length - 1 &&
            endIndex === content.length)
        ) {
          // We only want spaces between, not around, lines, so if we're up
          // against the left side or right side of the string, mark the newline
          // as padding.
          fragment.markPadding(startIndex, endIndex)
        } else {
          // Otherwise, the newline should be a line separator that will become
          // a space and everything else should be padding.
          fragment.markPadding(startIndex, newlinePos)
          fragment.markLineSeparator(newlinePos)
          fragment.markPadding(newlinePos + 1, endIndex)
        }
        lastNonWhitespace = pos
      } else {
        if (content[pos] !== ' ' && content[pos] !== '\t') {
          lastNonWhitespace = pos
        }
        pos++
      }
    }
  }
  return paddingTracker.computeSourceLocations()
}
