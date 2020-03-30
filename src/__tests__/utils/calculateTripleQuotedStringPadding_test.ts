import { stream, SourceType } from '../../index'
import SourceLocation from '../../SourceLocation'
import BufferedStream from '../../utils/BufferedStream'
import calculateTripleQuotedStringPadding from '../../utils/calculateTripleQuotedStringPadding'
import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript'

function bufferedStream(source: string): BufferedStream {
  return new BufferedStream(stream(source))
}

describe('tripleQuotedStringSourceLocationsTest', () => {
  it('returns an empty string for an empty triple-quoted string', () => {
    verifyStringMatchesCoffeeScript(`''''''`, [])
  })

  it('marks a leading and trailing newline as padding', () => {
    verifyStringMatchesCoffeeScript(`'''\na\n'''`, ['a'])
  })

  it('marks shared indents as padding in triple-single-quoted strings', () => {
    verifyStringMatchesCoffeeScript(`'''\n      abc\n\n      def\n      '''`, [
      'abc\n\ndef',
    ])
  })

  it('marks shared indents as padding in triple-double-quoted strings', () => {
    verifyStringMatchesCoffeeScript(`"""\n      abc\n\n      def\n      """`, [
      'abc\n\ndef',
    ])
  })

  it('marks shared indents as padding in interpolated strings', () => {
    verifyStringMatchesCoffeeScript(
      `"""\n      a#{b}c\n\n      d#{e}f\n      """`,
      ['a', 'c\n\nd', 'f']
    )
  })

  it('ignores the indentation level of the first line in herestrings', () => {
    verifyStringMatchesCoffeeScript(
      `'''a
      b'''`,
      ['a\nb']
    )
  })

  it('removes leading nonempty indentation in herestrings', () => {
    verifyStringMatchesCoffeeScript(
      `'''
 a
  b
c
d'''`,
      ['a\n b\nc\nd']
    )
  })

  it('preserves leading indentation on the first line in herestrings if necessary', () => {
    verifyStringMatchesCoffeeScript(
      `''' a
            b
              c
            d'''`,
      [' a\nb\n  c\nd']
    )
  })

  it('removes indentation normally if the first full line is empty', () => {
    verifyStringMatchesCoffeeScript(
      `'''

  a
  b
  c'''`,
      ['\na\nb\nc']
    )
  })

  it('uses indentation 0 for herestrings if the first full line is nonempty and has indentation 0', () => {
    verifyStringMatchesCoffeeScript(
      `'''
  a
    b
   c
  d'''`,
      ['a\n  b\n c\nd']
    )
  })

  it('does not remove indentation from the first line', () => {
    verifyStringMatchesCoffeeScript(
      `'''     a
      b
    c
      d'''`,
      ['     a\n  b\nc\n  d']
    )
  })

  it('keeps spacing in the second line if there are two lines and both are only whitespace', () => {
    verifyStringMatchesCoffeeScript(
      `'''    
   '''`,
      ['   ']
    )
  })

  it('removes leading whitespace from herestrings with tabs', () => {
    verifyStringMatchesCoffeeScript(
      `'''
\t\t\t\ta
\t\tb'''`,
      ['\t\ta\nb']
    )
  })

  it('handles a string with a leading and trailing blank line', () => {
    verifyStringMatchesCoffeeScript(
      `'''
a
'''`,
      ['a']
    )
  })

  it('handles a string with a blank line with spaces in it', () => {
    verifyStringMatchesCoffeeScript(
      `'''
  a
 
  b'''`,
      ['a\n \nb']
    )
  })

  it('handles a string where the last line is a blank line with spaces', () => {
    verifyStringMatchesCoffeeScript(
      `'''
    a
    b
   '''`,
      ['a\nb']
    )
  })

  it('keeps leading spaces in a herestring with interpolations', () => {
    verifyStringMatchesCoffeeScript(
      `"""    a
b#{c}
"""`,
      ['    a\nb']
    )
  })

  it('keeps leading spaces in a herestring with interpolations #2', () => {
    verifyStringMatchesCoffeeScript(
      `"""
  #{a}
"""`,
      []
    )
  })

  it('allows escaping newlines, even with spaces between the backslash and newline', () => {
    verifyStringMatchesCoffeeScript(
      `"""a\\  
  b"""`,
      ['ab']
    )
  })

  it('does not escape newlines on an even number of backslashes', () => {
    verifyStringMatchesCoffeeScript(
      `"""a\\\\  
b"""`,
      ['a\\\\  \nb']
    )
  })

  it('removes all whitespace following an escaped newline', () => {
    verifyStringMatchesCoffeeScript(
      `"""a\\  
     b
   c
     d"""`,
      ['ab\nc\n  d']
    )
  })

  it('ignores the newline at the end of the last content line when followed by an escaped newline', () => {
    verifyStringMatchesCoffeeScript(
      `"""  
        first line
        second line
        \\
        """`,
      ['first line\nsecond line']
    )
  })

  it('properly trims the first line when there is an escaped newline', () => {
    verifyStringMatchesCoffeeScript(
      `"""  
      \\  
      a
      """`,
      ['a']
    )
  })

  it('handles escaped and unescaped newlines after the last content line', () => {
    verifyStringMatchesCoffeeScript(
      `'''
    first line
    second line

      \\

  '''`,
      ['first line\nsecond line\n']
    )
  })

  it('returns an array with empty leading and trailing string content tokens for a string containing only an interpolation', () => {
    const source = `"""\n#{a}\n"""`
    expect(
      calculateTripleQuotedStringPadding(source, bufferedStream(source))
    ).toStrictEqual([
      new SourceLocation(SourceType.TDSTRING_START, 0),
      new SourceLocation(SourceType.STRING_PADDING, 3),
      new SourceLocation(SourceType.INTERPOLATION_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.INTERPOLATION_END, 7),
      new SourceLocation(SourceType.STRING_PADDING, 8),
      new SourceLocation(SourceType.TDSTRING_END, 9),
    ])
  })

  it('returns an array with empty string content token between adjacent interpolations', () => {
    const source = `"""#{a}#{b}"""`
    expect(
      calculateTripleQuotedStringPadding(source, bufferedStream(source))
    ).toStrictEqual([
      new SourceLocation(SourceType.TDSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.INTERPOLATION_START, 3),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.INTERPOLATION_END, 6),
      new SourceLocation(SourceType.STRING_CONTENT, 7),
      new SourceLocation(SourceType.INTERPOLATION_START, 7),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.INTERPOLATION_END, 10),
      new SourceLocation(SourceType.STRING_CONTENT, 11),
      new SourceLocation(SourceType.TDSTRING_END, 11),
    ])
  })

  it('consumes only as many locations as it needs', () => {
    const source = `"""abc""" + 99`
    const stream = bufferedStream(source)
    expect(calculateTripleQuotedStringPadding(source, stream)).toStrictEqual([
      new SourceLocation(SourceType.TDSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.TDSTRING_END, 6),
    ])
    expect(stream.peek()).toStrictEqual(new SourceLocation(SourceType.SPACE, 9))
  })
})
