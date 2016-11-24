import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript.js';

describe('calculateHeregexpPadding', () => {
  it('removes whitespace from single-line heregexes', () => {
    verifyStringMatchesCoffeeScript(`///a b///`, ['ab']);
  });

  it('handles heregexp comments', () => {
    verifyStringMatchesCoffeeScript(`///
    b  # foo
    c
    ///`, ['bc']);
  });

  it('does not treat # as a comment if it is preceded by non-whitespace', () => {
    verifyStringMatchesCoffeeScript(`///
    b# foo
    c
    ///`, ['b#fooc']);
  });

  it('handles interpolations within heregexes', () => {
    verifyStringMatchesCoffeeScript(`///
    a  #{b}
    c
    ///`, ['a', 'c']);
  });

  it('allows interpolations in comments and ends the comment at the interpolation', () => {
    verifyStringMatchesCoffeeScript(`///
    a #b #{c}d
    e
    ///`, ['a', 'de']);
  });

  it('allows escaped spaces in heregexes', () => {
    verifyStringMatchesCoffeeScript(`///
    a \\ b #{c}d
    e
    ///`, ['a b', 'de']);
  });

  it('does not escape a space on a double backslash', () => {
    verifyStringMatchesCoffeeScript(`///
    a \\\\ b #{c}d
    e
    ///`, ['a\\\\\\\\b', 'de']);
  });

  it('escapes a space on a triple backslash', () => {
    verifyStringMatchesCoffeeScript(`///
    a \\\\\\ b #{c}d
    e
    ///`, ['a\\\\\\\\ b', 'de']);
  });

  it('handles a hergexp consisting of only a backslash', () => {
    verifyStringMatchesCoffeeScript(`///
    \\a
    ///`, ['\\\\a']);
  });
});
