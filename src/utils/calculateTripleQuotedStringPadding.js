/* @flow */

import PaddingTracker from './PaddingTracker.js';
import type { TrackedFragment } from './PaddingTracker.js';
import SourceLocation from '../SourceLocation.js';
import type BufferedStream from './BufferedStream.js';
import {
  TDSTRING_START,
  TDSTRING_END,
  TSSTRING_START,
  TSSTRING_END,
} from '../index.js';

export default function calculateTripleQuotedStringPadding(source: string, stream: BufferedStream): Array<SourceLocation> {
  let paddingTracker;
  if (stream.hasNext(TSSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, TSSTRING_END);
  } else if (stream.hasNext(TDSTRING_START)) {
    paddingTracker = new PaddingTracker(source, stream, TDSTRING_END);
  } else {
    return [];
  }

  let firstFragment = paddingTracker.fragments[0];
  let lastFragment = paddingTracker.fragments[paddingTracker.fragments.length - 1];

  let leadingMarginStart = firstFragment.start;
  let leadingMarginEnd = getLeadingMarginEnd(source, leadingMarginStart);
  let trailingMarginEnd = lastFragment.end;
  let trailingMarginStart = getTrailingMarginStart(source, trailingMarginEnd);

  // Determine where the indents are, only looking at the string content parts,
  // i.e. not the leading or trailing margins or the interpolations.
  let { sharedIndent, indexes } = getIndentInfoForFragments(
    source,
    paddingTracker.fragments,
    leadingMarginEnd,
    trailingMarginStart
  );

  firstFragment.markPadding(0, leadingMarginEnd - firstFragment.start);
  lastFragment.markPadding(trailingMarginStart - lastFragment.start, lastFragment.content.length);
  // For now just do two nested loops to find indexes (line starts) within each
  // fragment so we know which ranges to ignore.
  for (let fragment of paddingTracker.fragments) {
    for (let lineStart of indexes) {
      if (lineStart >= fragment.start && lineStart < fragment.end) {
        let fragmentLineStart = lineStart - fragment.start;
        fragment.markPadding(fragmentLineStart, fragmentLineStart + sharedIndent.length)
      }
    }
  }

  return paddingTracker.computeSourceLocations();
}

function getLeadingMarginEnd(source: string, marginStart: number): number {
  for (let i = marginStart; i < source.length; i++) {
    let char = source.charAt(i);

    if (char === ' ' || char === '\t') {
      // Just part of the margin.
    } else if (char === '\n') {
      // End of the margin.
      return i + '\n'.length;
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
      return i;
    } else {
      // Non-space before the ending, so there is no margin.
      return marginEnd;
    }
  }

  throw new Error(`unexpected SOF while looking for start of margin at offset ${marginEnd}`);
}

function getIndentInfoForFragments(
    source: string, fragments: Array<TrackedFragment>, leadingMarginEnd: number,
    trailingMarginStart: number): { sharedIndent: string, indexes: Array<number> } {
  let sharedIndent = null;
  let isAtStartOfLine = true;
  let indexes = [];

  fragments.forEach(({ start, end }) => {
    start = Math.max(start, leadingMarginEnd);
    end = Math.min(end, trailingMarginStart);
    for (let i = start; i < end; i++) {
      let char = source[i];

      if (char === '\n') {
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
