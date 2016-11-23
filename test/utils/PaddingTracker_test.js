import { deepEqual, strictEqual, throws } from 'assert';

import {
  DSTRING_END,
  DSTRING_START,
  IDENTIFIER,
  INTERPOLATION_START,
  INTERPOLATION_END,
  STRING_CONTENT,
  STRING_LINE_SEPARATOR,
  STRING_PADDING,
  stream
} from '../../src/index.js';
import BufferedStream from '../../src/utils/BufferedStream.js';
import PaddingTracker from '../../src/utils/PaddingTracker.js';
import SourceLocation from '../../src/SourceLocation';

describe('PaddingTracker', () => {
  it('exposes the fragments in a string and allows marking padding', () => {
    let source = '"a\nb#{cd}e f"';
    let bufferedStream = new BufferedStream(stream(source));
    let tracker = new PaddingTracker(source, bufferedStream, DSTRING_END);
    strictEqual(tracker.fragments.length, 2);
    strictEqual(tracker.fragments[0].content, 'a\nb');
    strictEqual(tracker.fragments[1].content, 'e f');
    tracker.fragments[0].markLineSeparator(1);
    tracker.fragments[1].markPadding(1, 2);
    deepEqual(
      tracker.computeSourceLocations(),
      [
        new SourceLocation(DSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(STRING_LINE_SEPARATOR, 2),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(INTERPOLATION_START, 4),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(INTERPOLATION_END, 8),
        new SourceLocation(STRING_CONTENT, 9),
        new SourceLocation(STRING_PADDING, 10),
        new SourceLocation(STRING_CONTENT, 11),
        new SourceLocation(DSTRING_END, 12),
      ]
    );
  });

  it('allows overlapping padding and merges padding regions', () => {
    let source = '"abcdefg"';
    let bufferedStream = new BufferedStream(stream(source));
    let tracker = new PaddingTracker(source, bufferedStream, DSTRING_END);
    tracker.fragments[0].markPadding(1, 3);
    tracker.fragments[0].markPadding(2, 4);
    tracker.fragments[0].markPadding(4, 5);
    deepEqual(
      tracker.computeSourceLocations(),
      [
        new SourceLocation(DSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(STRING_PADDING, 2),
        new SourceLocation(STRING_CONTENT, 6),
        new SourceLocation(DSTRING_END, 8),
      ]
    );
  });

  it('does not allow padding and a line separator in the same position', () => {
    let source = '"abcdefg"';
    let bufferedStream = new BufferedStream(stream(source));
    let tracker = new PaddingTracker(source, bufferedStream, DSTRING_END);
    tracker.fragments[0].markPadding(1, 3);
    tracker.fragments[0].markLineSeparator(2);
    throws(() => tracker.computeSourceLocations(), /Illegal padding state/);
  });
});
