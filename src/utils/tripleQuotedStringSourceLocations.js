import IndexRangeList from './IndexRangeList.js';
import SourceLocation from '../SourceLocation.js';
import type BufferedStream from './BufferedStream.js';
import { INTERPOLATION_START, INTERPOLATION_END, SPACE, STRING_START, STRING_CONTENT, STRING_END, TDSTRING, TSSTRING } from '../index.js';

const QUOTE_LENGTH = 3;

export default function tripleQuotedStringSourceLocations(source: string, stream: BufferedStream): Array<SourceLocation> {
  if (!stream.hasNext(TSSTRING) && !stream.hasNext(TDSTRING)) {
    return [];
  }

  let result = [];
  let ignoredRanges = new IndexRangeList();
  let firstLocation = stream.shift();

  result.push(new SourceLocation(STRING_START, firstLocation.index));

  let leadingMarginStart = firstLocation.index + QUOTE_LENGTH;
  let leadingMarginEnd = getLeadingMarginEnd(source, leadingMarginStart);

  ignoredRanges = ignoredRanges.addRange(leadingMarginStart, leadingMarginEnd);

  if (stream.peek().type === INTERPOLATION_START) {
    let interpolationDepth = 0;
    let start = null;

    for (;;) {
      let location = stream.shift();

      if (location.type === INTERPOLATION_START) {
        result.push(location);
        if (interpolationDepth === 0) {
          start = location.index;
        }
        interpolationDepth += 1;
      } else if (location.type === INTERPOLATION_END) {
        result.push(location);
        interpolationDepth -= 1;
        if (interpolationDepth === 0 && start !== null) {
          ignoredRanges = ignoredRanges.addRange(start, stream.peek().index);
        }
      } else if (location.type === firstLocation.type) {
        if (interpolationDepth === 0 && stream.peek().type !== INTERPOLATION_START) {
          break;
        }
      } else {
        result.push(location);
      }
    }
  }

  let trailingMarginEnd = stream.peek().index - QUOTE_LENGTH;
  let trailingMarginStart = getTrailingMarginStart(source, trailingMarginEnd);

  ignoredRanges = ignoredRanges.addRange(trailingMarginStart, trailingMarginEnd);

  let { sharedIndent, indexes } = getIndentInfoForRanges(source, ignoredRanges.invert(leadingMarginStart, trailingMarginEnd));

  let spaceRanges = new IndexRangeList()
    .addRange(leadingMarginStart, leadingMarginEnd)
    .addRange(trailingMarginStart, trailingMarginEnd);
  indexes.forEach(index => {
    spaceRanges = spaceRanges.addRange(index, index + sharedIndent.length);
    ignoredRanges = ignoredRanges.addRange(index, index + sharedIndent.length);
  });

  result.push(
    new SourceLocation(STRING_END, trailingMarginEnd)
  );

  let resultIndex = 0;

  spaceRanges.forEach(({ start, end }) => {
    while (result[resultIndex].index < start) {
      resultIndex++;
    }
    result.splice(resultIndex, 0, new SourceLocation(SPACE, start));
  });

  let contentRanges = ignoredRanges.invert(leadingMarginStart, trailingMarginEnd);

  if (contentRanges.length === 0) {
    // It's all content.
    result.splice(
      result.length - 1,
      0,
      new SourceLocation(STRING_CONTENT, leadingMarginEnd)
    );
  }

  resultIndex = 0;
  contentRanges.forEach(({ start }) => {
    while (result[resultIndex].index < start) {
      resultIndex++;
    }
    result.splice(resultIndex, 0, new SourceLocation(STRING_CONTENT, start));
  });

  return result;
}

function getLeadingMarginEnd(source: string, marginStart: number): number {
  for (let i = marginStart; i < source.length; i++) {
    let char = source.charAt(i);

    if (char === ' ' || char === '\t') {
      // Just part of the margin.
    } else if (char === '\n') {
      // End of the margin.
      return i + '\n'.length;
    } else if (char === '\r') {
      if (source.charAt(i + '\r'.length) === '\n') {
        // Ends with \r\n.
        return i + '\r\n'.length;
      } else {
        // Only ends with \r.
        return i + '\r'.length;
      }
    } else {
      // Non-space before a newline, so there is no margin.
      return marginStart;
    }
  }

  throw new Error(`unexpected EOF while looking for end of margin at offset ${marginStart}`);
}

function getTrailingMarginStart(source: string, marginEnd: number): number {
  for (let i = marginEnd - 1; i >= 0; i--) {
    let char = source.charAt(i);

    if (char === ' ' || char === '\t') {
      // Just part of the margin.
    } else if (char === '\n') {
      if (source.charAt(i - '\n'.length) === '\r') {
        // Starts with \r\n.
        return i - '\r'.length;
      } else {
        // Only ends with \n.
        return i;
      }
    } else if (char === '\r') {
      // Start of the margin.
      return i;
    } else {
      // Non-space before the ending, so there is no margin.
      return marginEnd;
    }
  }

  throw new Error(`unexpected SOF while looking for stat of margin at offset ${marginEnd}`);
}

function getIndentInfoForRanges(source: string, ranges: IndexRangeList): { sharedIndent: string, indexes: Array<number> } {
  let sharedIndent = null;
  let isAtStartOfLine = true;
  let indexes = [];

  ranges.forEach(({ start, end }) => {
    for (let i = start; i < end; i++) {
      let char = source[i];

      if (char === '\n' || char === '\r') {
        isAtStartOfLine = true;
      } else if (isAtStartOfLine) {
        isAtStartOfLine = false;
        indexes.push(i);

        let endOfPossibleIndent = sharedIndent ? i + sharedIndent.length : end;

        for (let j = i; j < endOfPossibleIndent; j++) {
          let maybeIndentChar = source[j];

          if (sharedIndent) {
            if (maybeIndentChar === sharedIndent[j - i]) {
              // Matches the known indent so far.
              continue;
            }
          } else if (maybeIndentChar === ' ' || maybeIndentChar === '\t') {
            // Looks like a valid indent character.
            continue;
          }

          // Set or shrink the known indent.
          sharedIndent = source.slice(i, j);
          i = j;
          break;
        }
      }
    }
  });

  if (sharedIndent === null) {
    return { sharedIndent: '', indexes: [] };
  }

  return { sharedIndent: sharedIndent, indexes };
}
