import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript';

describe('calculateNormalStringPaddingTest', () => {
  test('does not strip whitespace in a string with no newlines', () => {
    verifyStringMatchesCoffeeScript(`"  a b  "`, ['  a b  ']);
  });

  test('inserts spaces for newlines', () => {
    verifyStringMatchesCoffeeScript(
      `"
      a
      b
    "`,
      ['a b']
    );
  });

  test('removes spaces when there is an interpolation', () => {
    verifyStringMatchesCoffeeScript(
      `"
      a  #{b}
      c
    "`,
      ['a  ', ' c']
    );
  });

  test('does not remove spaces when the only newline is across an interpolation', () => {
    verifyStringMatchesCoffeeScript(
      `" a #{
    b} c "`,
      [' a ', ' c ']
    );
  });

  test('removes leading and trailing tab characters', () => {
    verifyStringMatchesCoffeeScript(
      `"
\ta
    b\t
"`,
      ['a b']
    );
  });

  test('does not add an intermediate space when a newline is escaped', () => {
    verifyStringMatchesCoffeeScript(
      `"a\\
b"`,
      ['ab']
    );
  });

  test('adds an intermediate space on a double backslash', () => {
    verifyStringMatchesCoffeeScript(
      `"a\\\\
b"`,
      ['a\\\\ b']
    );
  });

  test('does not add an intermediate space on a triple backslash', () => {
    verifyStringMatchesCoffeeScript(
      `"a\\\\\\
b"`,
      ['a\\\\b']
    );
  });

  test('does not remove spaces to the left of an escaped newline', () => {
    verifyStringMatchesCoffeeScript(
      `"a   \\
b"`,
      ['a   b']
    );
  });

  test('treats a backslash, then spaces, then a newline as an escaped newline', () => {
    verifyStringMatchesCoffeeScript(
      `"
  a\\  
  b"`,
      ['ab']
    );
  });

  test('does not add trailing spacing for an escaped newline at the end', () => {
    verifyStringMatchesCoffeeScript(
      `"
a
\\
"`,
      ['a']
    );
  });

  test('does not remove spacing to the right of an escaped space', () => {
    verifyStringMatchesCoffeeScript(
      `"
a
   \\  b
"`,
      ['a   b']
    );
  });
});
