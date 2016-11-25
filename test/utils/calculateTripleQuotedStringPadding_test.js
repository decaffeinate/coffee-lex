import { deepEqual } from 'assert';
import BufferedStream from '../../src/utils/BufferedStream.js';
import SourceLocation from '../../src/SourceLocation.js';
import calculateTripleQuotedStringPadding from '../../src/utils/calculateTripleQuotedStringPadding.js';
import {
  IDENTIFIER,
  INTERPOLATION_START,
  INTERPOLATION_END,
  SPACE,
  STRING_CONTENT,
  STRING_PADDING,
  TDSTRING_START,
  TDSTRING_END,
  stream
} from '../../src/index.js';
import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript.js';

describe('tripleQuotedStringSourceLocations', () => {
  it('returns an empty string for an empty triple-quoted string', () => {
    verifyStringMatchesCoffeeScript(`''''''`, []);
  });

  it('marks a leading and trailing newline as padding', () => {
    verifyStringMatchesCoffeeScript(`'''\na\n'''`, ['a']);
  });

  it('marks shared indents as padding in triple-single-quoted strings', () => {
    verifyStringMatchesCoffeeScript(
      `'''\n      abc\n\n      def\n      '''`,
      ['abc\n\ndef']
    );
  });

  it('marks shared indents as padding in triple-double-quoted strings', () => {
    verifyStringMatchesCoffeeScript(
      `"""\n      abc\n\n      def\n      """`,
      ['abc\n\ndef']
    );
  });

  it('marks shared indents as padding in interpolated strings', () => {
    verifyStringMatchesCoffeeScript(
      `"""\n      a#{b}c\n\n      d#{e}f\n      """`,
      ['a', 'c\n\nd', 'f']
    );
  });

  it('ignores the indentation level of the first line in herestrings', () => {
    verifyStringMatchesCoffeeScript(`'''a
      b'''`, ['a\nb']);
  });

  it('removes leading nonempty indentation in herestrings', () => {
    verifyStringMatchesCoffeeScript(`'''
 a
  b
c
d'''`, ['a\n b\nc\nd']);
  });

  it('preserves leading indentation on the first line in herestrings if necessary', () => {
    verifyStringMatchesCoffeeScript(`''' a
          b
            c
          d'''`, [' a\nb\n  c\nd']);
  });

  it('removes indentation normally if the first full line is empty', () => {
    verifyStringMatchesCoffeeScript(`'''

  a
  b
  c'''`, ['\na\nb\nc']);
  });

  it('uses indentation 0 for herestrings if the first full line is nonempty and has indentation 0', () => {
    verifyStringMatchesCoffeeScript(`'''
a
  b
 c
d'''`, ['a\n  b\n c\nd']);
  });

  it('removes indentation from the first line if possible', () => {
    verifyStringMatchesCoffeeScript(`'''     a
      b
    c
      d'''`,
      [' a\n  b\nc\n  d']);
  });

  it('keeps spacing in the second line if there are two lines and both are only whitespace', () => {
    verifyStringMatchesCoffeeScript(`'''    
   '''`,
      ['   ']);
  });

  it('removes leading whitespace from herestrings with tabs', () => {
    verifyStringMatchesCoffeeScript(`'''
\t\t\t\ta
\t\tb'''`,
      ['\t\ta\nb']);
  });

  it('handles a string with a leading and trailing blank line', () => {
    verifyStringMatchesCoffeeScript(`'''
a
'''`,
      ['a']);
  });

  it('handles a string with a blank line with spaces in it', () => {
    verifyStringMatchesCoffeeScript(`'''
  a
 
  b'''`,
      ['a\n \nb']);
  });

  it('handles a string where the last line is a blank line with spaces', () => {
    verifyStringMatchesCoffeeScript(`'''
  a
  b
 '''`,
      ['a\nb']);
  });

  it('keeps leading spaces in a herestring with interpolations', () => {
    verifyStringMatchesCoffeeScript(`"""    a
b#{c}
"""`,
      ['    a\nb']);
  });

  it('returns an array with empty leading and trailing string content tokens for a string containing only an interpolation', () => {
    let source = `"""\n#{a}\n"""`;
    deepEqual(
      calculateTripleQuotedStringPadding(source, bufferedStream(source)),
      [
        new SourceLocation(TDSTRING_START, 0),
        new SourceLocation(STRING_PADDING, 3),
        new SourceLocation(INTERPOLATION_START, 4),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(INTERPOLATION_END, 7),
        new SourceLocation(STRING_PADDING, 8),
        new SourceLocation(TDSTRING_END, 9)
      ]
    )
  });

  it('returns an array with empty string content token between adjacent interpolations', () => {
    let source = `"""#{a}#{b}"""`;
    deepEqual(
      calculateTripleQuotedStringPadding(source, bufferedStream(source)),
      [
        new SourceLocation(TDSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(INTERPOLATION_START, 3),
        new SourceLocation(IDENTIFIER, 5),
        new SourceLocation(INTERPOLATION_END, 6),
        new SourceLocation(STRING_CONTENT, 7),
        new SourceLocation(INTERPOLATION_START, 7),
        new SourceLocation(IDENTIFIER, 9),
        new SourceLocation(INTERPOLATION_END, 10),
        new SourceLocation(STRING_CONTENT, 11),
        new SourceLocation(TDSTRING_END, 11)
      ]
    )
  });

  it('consumes only as many locations as it needs', () => {
    let source = `"""abc""" + 99`;
    let stream = bufferedStream(source);
    deepEqual(
      calculateTripleQuotedStringPadding(source, stream),
      [
        new SourceLocation(TDSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(TDSTRING_END, 6)
      ]
    );
    deepEqual(
      stream.peek(),
      new SourceLocation(SPACE, 9)
    );
  });

  function bufferedStream(source: string): BufferedStream {
    return new BufferedStream(stream(source));
  }
});
