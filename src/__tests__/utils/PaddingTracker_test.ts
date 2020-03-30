import { stream } from '../../index'
import SourceLocation from '../../SourceLocation'
import SourceType from '../../SourceType'
import BufferedStream from '../../utils/BufferedStream'
import PaddingTracker from '../../utils/PaddingTracker'

describe('paddingTrackerTest', () => {
  it('exposes the fragments in a string and allows marking padding', () => {
    const source = '"a\nb#{cd}e f"'
    const bufferedStream = new BufferedStream(stream(source))
    const tracker = new PaddingTracker(
      source,
      bufferedStream,
      SourceType.DSTRING_END
    )
    expect(tracker.fragments).toHaveLength(2)
    expect(tracker.fragments[0].content).toBe('a\nb')
    expect(tracker.fragments[1].content).toBe('e f')
    tracker.fragments[0].markLineSeparator(1)
    tracker.fragments[1].markPadding(1, 2)
    expect(tracker.computeSourceLocations()).toStrictEqual([
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.STRING_LINE_SEPARATOR, 2),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.INTERPOLATION_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.INTERPOLATION_END, 8),
      new SourceLocation(SourceType.STRING_CONTENT, 9),
      new SourceLocation(SourceType.STRING_PADDING, 10),
      new SourceLocation(SourceType.STRING_CONTENT, 11),
      new SourceLocation(SourceType.DSTRING_END, 12),
    ])
  })

  it('allows overlapping padding and merges padding regions', () => {
    const source = '"abcdefg"'
    const bufferedStream = new BufferedStream(stream(source))
    const tracker = new PaddingTracker(
      source,
      bufferedStream,
      SourceType.DSTRING_END
    )
    tracker.fragments[0].markPadding(1, 3)
    tracker.fragments[0].markPadding(2, 4)
    tracker.fragments[0].markPadding(4, 5)
    expect(tracker.computeSourceLocations()).toStrictEqual([
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.STRING_PADDING, 2),
      new SourceLocation(SourceType.STRING_CONTENT, 6),
      new SourceLocation(SourceType.DSTRING_END, 8),
    ])
  })

  it('does not allow padding and a line separator in the same position', () => {
    const source = '"abcdefg"'
    const bufferedStream = new BufferedStream(stream(source))
    const tracker = new PaddingTracker(
      source,
      bufferedStream,
      SourceType.DSTRING_END
    )
    tracker.fragments[0].markPadding(1, 3)
    tracker.fragments[0].markLineSeparator(2)
    expect(() => tracker.computeSourceLocations()).toThrow(
      /Illegal padding state/
    )
  })
})
