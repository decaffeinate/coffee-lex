import * as CoffeeScript from 'decaffeinate-coffeescript';

import BufferedStream from '../../src/utils/BufferedStream.js';
import calculateNormalStringPadding from '../../src/utils/calculateNormalStringPadding.js';
import {
  INTERPOLATION_START,
  STRING_CONTENT,
  STRING_LINE_SEPARATOR,
  stream
} from '../../src/index.js';
import { deepEqual } from 'assert';

describe('calculateNormalStringPadding', () => {
  it('does not strip whitespace in a string with no newlines', () => {
    verifyStringMatchesCoffeeScript(`  a b  `, ['  a b  ']);
  });

  it('inserts spaces for newlines', () => {
    verifyStringMatchesCoffeeScript(`
      a
      b
    `, ['a b']);
  });

  it('removes spaces when there is an interpolation', () => {
    verifyStringMatchesCoffeeScript(`
      a  #{b}
      c
    `, ['a  ', ' c']);
  });

  it('does not remove spaces when the only newline is across an interpolation', () => {
    verifyStringMatchesCoffeeScript(` a #{
  b} c `, [' a ', ' c ']);
  });

  it('removes leading and trailing tab characters', () => {
    verifyStringMatchesCoffeeScript(`
\ta
    b\t
`, ['a b']);
  });

  it('does not add an intermediate space when a newline is escaped', () => {
    verifyStringMatchesCoffeeScript(`a\\
b`, ['ab']);
  });

  it('adds an intermediate space on a double backslash', () => {
    verifyStringMatchesCoffeeScript(`a\\\\
b`, ['a\\\\ b']);
  });

  it('does not add an intermediate space on a triple backslash', () => {
    verifyStringMatchesCoffeeScript(`a\\\\\\
b`, ['a\\\\b']);
  });

  it('does not remove spaces to the left of an escaped newline', () => {
    verifyStringMatchesCoffeeScript(`a   \\
b`, ['a   b']);
  });

  it('treats a backslash, then spaces, then a newline as an escaped newline', () => {
    verifyStringMatchesCoffeeScript(`
a\\  
b`, ['ab']);
  });

  function verifyStringMatchesCoffeeScript(stringContents, expectedQuasis) {
    let code = `"${stringContents}"`;
    let coffeeLexResult = getCoffeeLexQuasis(code);
    let coffeeScriptResult = getCoffeeScriptQuasis(code);
    deepEqual(coffeeLexResult, coffeeScriptResult);
    deepEqual(coffeeLexResult, expectedQuasis);
  }

  function getCoffeeLexQuasis(code) {
    let bufferedStream = new BufferedStream(stream(code));
    let locations = calculateNormalStringPadding(code, bufferedStream);
    let quasis = [''];
    for (let i = 0; i < locations.length - 1; i++) {
      if (locations[i].type === STRING_CONTENT) {
        quasis[quasis.length - 1] += code.slice(locations[i].index, locations[i + 1].index);
      } else if (locations[i].type === STRING_LINE_SEPARATOR) {
        quasis[quasis.length - 1] += ' ';
      } else if (locations[i].type === INTERPOLATION_START) {
        quasis.push('');
      }
    }
    return quasis;
  }

  function getCoffeeScriptQuasis(code) {
    let tokens = CoffeeScript.tokens(code);
    let resultQuasis = [];
    for (let token of tokens) {
      if (token[0] === 'STRING') {
        resultQuasis.push(
          JSON.parse(token[1].replace(/\t/g, '\\t')).replace(/\\/, '\\\\')
        );
      }
    }
    return resultQuasis;
  }
});
