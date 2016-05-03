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

  // Handle the start of the string.
  result.push(new SourceLocation(STRING_START, firstLocation.index));

  let leadingMarginStart = firstLocation.index + QUOTE_LENGTH;
  let leadingMarginEnd = getLeadingMarginEnd(source, leadingMarginStart);

  ignoredRanges = ignoredRanges.addRange(leadingMarginStart, leadingMarginEnd);

  // Determine whether this string has interpolations.
  if (stream.peek().type === INTERPOLATION_START) {
    let start = null;
    let done = false;

    // We need to copy over the locations, but also keep track of where the
    // interpolations are so we don't consider them as part of the indents.
    forEachLocationWithInterpolationDepth(() => done ? null : stream.shift(), (location, depth) => {
      if (location.type === INTERPOLATION_START) {
        result.push(location);
        if (depth === 0) {
          start = location.index;
        }
      } else if (location.type === INTERPOLATION_END) {
        result.push(location);
        if (depth === 1 && start !== null) {
          ignoredRanges = ignoredRanges.addRange(start, stream.peek().index);
        }
      } else if (location.type === firstLocation.type) {
        if (depth === 0 && stream.peek().type !== INTERPOLATION_START) {
          done = true;
        }
      } else {
        result.push(location);
      }
    });
  }

  let trailingMarginEnd = stream.peek().index - QUOTE_LENGTH;
  let trailingMarginStart = getTrailingMarginStart(source, trailingMarginEnd);

  ignoredRanges = ignoredRanges.addRange(trailingMarginStart, trailingMarginEnd);

  // Determine where the indents are, only looking at the string content parts,
  // i.e. not the leading or trailing margins or the interpolations.
  let { sharedIndent, indexes } = getIndentInfoForRanges(
    source,
    ignoredRanges.invert(leadingMarginStart, trailingMarginEnd)
  );

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

  spaceRanges.forEach(({ start }) => {
    result = locationsWithLocationSorted(
      result,
      new SourceLocation(SPACE, start)
    );
  });

  let contentRanges = ignoredRanges.invert(leadingMarginStart, trailingMarginEnd);

  // Add STIRNG_CONTENT locations for all the places we can tell there should be
  // ones based on where we stop ignoring content. Note that this does not get
  // all the content because IndexRangeList merges adjacent ranges, so this
  // won't add a location between adjacent string interpolations (`}${`).
  contentRanges.forEach(({ start }) => {
    result = locationsWithLocationSorted(
      result,
      new SourceLocation(STRING_CONTENT, start)
    );
  });

  let spaceAfterLeadingMarginRange = spaceRanges.getRangeContainingIndex(leadingMarginEnd);
  let firstContentStart = spaceAfterLeadingMarginRange ? spaceAfterLeadingMarginRange.end : leadingMarginEnd;

  // Add a location right after the leading margin and any indent that follows.
  result = locationsWithLocationSorted(
    result,
    new SourceLocation(STRING_CONTENT, firstContentStart)
  );

  let lastInterpolation = null;

  // Add content locations between adjacent interpolations.
  forEachLocationWithInterpolationDepth(arrayIterator(result), (location, depth, previous) => {
    if (depth === 0) {
      if (location.type === INTERPOLATION_START) {
        if (previous && previous.type === INTERPOLATION_END) {
          result = locationsWithLocationSorted(
            result,
            new SourceLocation(STRING_CONTENT, location.index)
          );
        }
      }
    }

    if (location.type === INTERPOLATION_END) {
      lastInterpolation = location;
    }
  });

  // Add content location after the last interpolation.
  if (lastInterpolation) {
    result = locationsWithLocationSorted(
      result,
      new SourceLocation(STRING_CONTENT, lastInterpolation.index + '}'.length)
    );
  }

  return result.filter((location, i) => {
    // Remove duplicate locations, notably STRING_CONTENT.
    let previous = result[i - 1];
    return !(previous && previous.type === location.type);
  });
}

function arrayIterator<T>(array: Array<T>): () => ?T {
  let i = 0;
  return () => i < array.length - 1 ? array[i++] : null;
}

function forEachLocationWithInterpolationDepth(next: () => ?SourceLocation, iterator: (location: SourceLocation, interpolationDepth: number, previous?: ?SourceLocation) => void) {
  let interpolationDepth = 0;
  let previous = null;

  for (;;) {
    let location = next();

    if (!location) {
      break;
    }

    iterator(location, interpolationDepth, previous);

    if (location.type === INTERPOLATION_START) {
      interpolationDepth += 1;
    } else if (location.type === INTERPOLATION_END) {
      interpolationDepth -= 1;
    }

    previous = location;
  }
}

function locationsWithLocationSorted(locations: Array<SourceLocation>, location: SourceLocation): Array<SourceLocation> {
  for (let i = 0; i < locations.length; i++) {
    let currentLocation = locations[i];

    if (location.index <= currentLocation.index) {
      return [
        ...locations.slice(0, i),
        location,
        ...locations.slice(i)
      ];
    }
  }

  return [...locations, location];
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
