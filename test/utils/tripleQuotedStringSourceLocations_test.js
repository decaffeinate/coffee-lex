import BufferedStream from '../../src/utils/BufferedStream.js';
import SourceLocation from '../../src/SourceLocation.js';
import getTripleQuotedStringSemanticRanges from '../../src/utils/tripleQuotedStringSourceLocations.js';
import { IDENTIFIER, INTERPOLATION_START, INTERPOLATION_END, SPACE, STRING_START, STRING_CONTENT, STRING_END, stream } from '../../src/index.js';
import { deepEqual } from 'assert';

describe('tripleQuotedStringSourceLocations', () => {
  it('returns an array with an empty string content for an empty triple-quoted string', () => {
    let source = `''''''`;
    deepEqual(
      getTripleQuotedStringSemanticRanges(source, bufferedStream(source)),
      [
        new SourceLocation(STRING_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(STRING_END, 3)
      ]
    )
  });

  it('returns an array with SPACE for the leading and trailing newline', () => {
    let source = `'''\na\n'''`;
    deepEqual(
      getTripleQuotedStringSemanticRanges(source, bufferedStream(source)),
      [
        new SourceLocation(STRING_START, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(STRING_CONTENT, 4),
        new SourceLocation(SPACE, 5),
        new SourceLocation(STRING_END, 6)
      ]
    )
  });

  it('returns an array with SPACE for shared indents in triple-single-quoted strings', () => {
    let source = `'''\n      abc\n\n      def\n      '''`;
    deepEqual(
      getTripleQuotedStringSemanticRanges(source, bufferedStream(source)),
      [
        new SourceLocation(STRING_START, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(STRING_CONTENT, 10),
        new SourceLocation(SPACE, 15),
        new SourceLocation(STRING_CONTENT, 21),
        new SourceLocation(SPACE, 24),
        new SourceLocation(STRING_END, 31)
      ]
    )
  });

  it('returns an array with SPACE for shared indents in triple-double-quoted strings', () => {
    let source = `"""\n      abc\n\n      def\n      """`;
    deepEqual(
      getTripleQuotedStringSemanticRanges(source, bufferedStream(source)),
      [
        new SourceLocation(STRING_START, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(STRING_CONTENT, 10),
        new SourceLocation(SPACE, 15),
        new SourceLocation(STRING_CONTENT, 21),
        new SourceLocation(SPACE, 24),
        new SourceLocation(STRING_END, 31)
      ]
    )
  });

  it('returns an array with SPACE for shared indents in interpolated strings', () => {
    let source = `"""\n      a#{b}c\n\n      d#{e}f\n      """`;
    deepEqual(
      getTripleQuotedStringSemanticRanges(source, bufferedStream(source)),
      [
        new SourceLocation(STRING_START, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(STRING_CONTENT, 10),
        new SourceLocation(INTERPOLATION_START, 11),
        new SourceLocation(IDENTIFIER, 13),
        new SourceLocation(INTERPOLATION_END, 14),
        new SourceLocation(STRING_CONTENT, 15),
        new SourceLocation(SPACE, 18),
        new SourceLocation(STRING_CONTENT, 24),
        new SourceLocation(INTERPOLATION_START, 25),
        new SourceLocation(IDENTIFIER, 27),
        new SourceLocation(INTERPOLATION_END, 28),
        new SourceLocation(STRING_CONTENT, 29),
        new SourceLocation(SPACE, 30),
        new SourceLocation(STRING_END, 37)
      ]
    )
  });

  function bufferedStream(source: string): BufferedStream {
    return new BufferedStream(stream(source));
  }
});
