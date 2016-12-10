import { HEREGEXP_END, HEREGEXP_START } from '../index';
import PaddingTracker from './PaddingTracker';

import SourceLocation from '../SourceLocation';
import BufferedStream from './BufferedStream';

/**
 * Compute the whitespace to remove in a heregexp. All unescaped whitespace
 * characters are removed, and comments are respected.
 */
export default function calculateHeregexpPadding(source: string, stream: BufferedStream): Array<SourceLocation> {
  if (!stream.hasNext(HEREGEXP_START)) {
    return [];
  }
  let paddingTracker = new PaddingTracker(source, stream, HEREGEXP_END);

  for (let fragment of paddingTracker.fragments) {
    let content = fragment.content;
    let pos = 0;
    while (pos < content.length) {
      if (/\s/.test(content[pos])) {
        if (isWhitespaceEscaped(content, pos)) {
          // The escape character should be removed instead of the space.
          fragment.markPadding(pos - 1, pos);
        } else {
          fragment.markPadding(pos, pos + 1);
        }
        pos++;
      } else if (content[pos] === '#' && (pos === 0 || /\s/.test(content[pos - 1]))) {
        let commentStart = pos;
        while (pos < content.length && content[pos] !== '\n') {
          pos++;
        }
        fragment.markPadding(commentStart, pos);
      } else {
        pos++;
      }
    }
  }
  return paddingTracker.computeSourceLocations();
}

/**
 * A space, tab, or newline is escaped if it is preceded by an odd number of
 * backslashes.
 */
function isWhitespaceEscaped(content: string, whitespacePos: number): boolean {
  let prevPos = whitespacePos - 1;
  while (prevPos >= 0 && content[prevPos] === '\\') {
    prevPos--;
  }
  return (whitespacePos - prevPos) % 2 === 0;
}
