import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript.js';

describe('calculateNormalStringPadding', () => {
  it('does not strip whitespace in a string with no newlines', () => {
    verifyStringMatchesCoffeeScript(`"  a b  "`, ['  a b  ']);
  });

  it('inserts spaces for newlines', () => {
    verifyStringMatchesCoffeeScript(`"
      a
      b
    "`, ['a b']);
  });

  it('removes spaces when there is an interpolation', () => {
    verifyStringMatchesCoffeeScript(`"
      a  #{b}
      c
    "`, ['a  ', ' c']);
  });

  it('does not remove spaces when the only newline is across an interpolation', () => {
    verifyStringMatchesCoffeeScript(`" a #{
  b} c "`, [' a ', ' c ']);
  });

  it('removes leading and trailing tab characters', () => {
    verifyStringMatchesCoffeeScript(`"
\ta
    b\t
"`, ['a b']);
  });

  it('does not add an intermediate space when a newline is escaped', () => {
    verifyStringMatchesCoffeeScript(`"a\\
b"`, ['ab']);
  });

  it('adds an intermediate space on a double backslash', () => {
    verifyStringMatchesCoffeeScript(`"a\\\\
b"`, ['a\\\\ b']);
  });

  it('does not add an intermediate space on a triple backslash', () => {
    verifyStringMatchesCoffeeScript(`"a\\\\\\
b"`, ['a\\\\b']);
  });

  it('does not remove spaces to the left of an escaped newline', () => {
    verifyStringMatchesCoffeeScript(`"a   \\
b"`, ['a   b']);
  });

  it('treats a backslash, then spaces, then a newline as an escaped newline', () => {
    verifyStringMatchesCoffeeScript(`"
a\\  
b"`, ['ab']);
  });
});
