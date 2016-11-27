import { suite, test } from 'mocha-typescript';
import { deepEqual } from 'assert';
import BufferedStream from '../../src/utils/BufferedStream';
import SourceLocation from '../../src/SourceLocation';
import calculateTripleQuotedStringPadding from '../../src/utils/calculateTripleQuotedStringPadding';
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
} from '../../src/index';
import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript';

function bufferedStream(source: string): BufferedStream {
  return new BufferedStream(stream(source));
}

@suite class tripleQuotedStringSourceLocationsTest {
  @test 'returns an empty string for an empty triple-quoted string'() {
    verifyStringMatchesCoffeeScript(`''''''`, []);
  }

  @test 'marks a leading and trailing newline as padding'() {
    verifyStringMatchesCoffeeScript(`'''\na\n'''`, ['a']);
  }

  @test 'marks shared indents as padding in triple-single-quoted strings'() {
    verifyStringMatchesCoffeeScript(
      `'''\n      abc\n\n      def\n      '''`,
      ['abc\n\ndef']
    );
  }

  @test 'marks shared indents as padding in triple-double-quoted strings'() {
    verifyStringMatchesCoffeeScript(
      `"""\n      abc\n\n      def\n      """`,
      ['abc\n\ndef']
    );
  }

  @test 'marks shared indents as padding in interpolated strings'() {
    verifyStringMatchesCoffeeScript(
      `"""\n      a#{b}c\n\n      d#{e}f\n      """`,
      ['a', 'c\n\nd', 'f']
    );
  }

  @test 'ignores the indentation level of the first line in herestrings'() {
    verifyStringMatchesCoffeeScript(`'''a
      b'''`, ['a\nb']);
  }

  @test 'removes leading nonempty indentation in herestrings'() {
    verifyStringMatchesCoffeeScript(`'''
 a
  b
c
d'''`, ['a\n b\nc\nd']);
  }

  @test 'preserves leading indentation on the first line in herestrings if necessary'() {
    verifyStringMatchesCoffeeScript(`''' a
          b
            c
          d'''`, [' a\nb\n  c\nd']);
  }

  @test 'removes indentation normally if the first full line is empty'() {
    verifyStringMatchesCoffeeScript(`'''

  a
  b
  c'''`, ['\na\nb\nc']);
  }

  @test 'uses indentation 0 for herestrings if the first full line is nonempty and has indentation 0'() {
    verifyStringMatchesCoffeeScript(`'''
a
  b
 c
d'''`, ['a\n  b\n c\nd']);
  }

  @test 'removes indentation from the first line if possible'() {
    verifyStringMatchesCoffeeScript(`'''     a
      b
    c
      d'''`,
      [' a\n  b\nc\n  d']);
  }

  @test 'keeps spacing in the second line if there are two lines and both are only whitespace'() {
    verifyStringMatchesCoffeeScript(`'''    
   '''`,
      ['   ']);
  }

  @test 'removes leading whitespace from herestrings with tabs'() {
    verifyStringMatchesCoffeeScript(`'''
\t\t\t\ta
\t\tb'''`,
      ['\t\ta\nb']);
  }

  @test 'handles a string with a leading and trailing blank line'() {
    verifyStringMatchesCoffeeScript(`'''
a
'''`,
      ['a']);
  }

  @test 'handles a string with a blank line with spaces in it'() {
    verifyStringMatchesCoffeeScript(`'''
  a
 
  b'''`,
      ['a\n \nb']);
  }

  @test 'handles a string where the last line is a blank line with spaces'() {
    verifyStringMatchesCoffeeScript(`'''
  a
  b
 '''`,
      ['a\nb']);
  }

  @test 'keeps leading spaces in a herestring with interpolations'() {
    verifyStringMatchesCoffeeScript(`"""    a
b#{c}
"""`,
      ['    a\nb']);
  }

  @test 'returns an array with empty leading and trailing string content tokens for a string containing only an interpolation'() {
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
  }

  @test 'returns an array with empty string content token between adjacent interpolations'() {
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
  }

  @test 'consumes only as many locations as it needs'() {
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
  }
}
