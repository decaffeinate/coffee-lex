import { strict as assert } from 'assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * 
 * @param {typeof import('../src').lex} lex
 * @param {typeof import('../src').SourceType} SourceType
 */
function validateLex(lex, SourceType) {
  assert.deepEqual(lex('a = 1').map((token) => token.type), [
    SourceType.IDENTIFIER,
    SourceType.OPERATOR,
    SourceType.NUMBER,
  ]);
}

async function validateEsmBuild() {
  process.stdout.write('Validating ESM build…');
  /** @type {import('../src')} */
  const coffeeLex = await import('coffee-lex');
  validateLex(coffeeLex.lex, coffeeLex.SourceType);
  validateLex(coffeeLex.default, coffeeLex.SourceType);
  process.stdout.write(' ✅\n');
}

async function validateCommonJsBuild() {
  process.stdout.write('Validating CommonJS build…');
  /** @type {import('../src')} */
  const coffeeLex = require('../');
  validateLex(coffeeLex.lex, coffeeLex.SourceType);
  validateLex(coffeeLex.default, coffeeLex.SourceType);
  process.stdout.write(' ✅\n');
}

async function validatePackage() {
  await validateEsmBuild();
  await validateCommonJsBuild();
}

await validatePackage();
