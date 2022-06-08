import { deepEqual } from 'assert'
import * as CoffeeScript from 'decaffeinate-coffeescript'

import lex from '../../index'
import { SourceType } from '../../SourceType'

/**
 * Given code containing a string, herestring, or heregex, verify that the
 * quasis have the expected values, and run the same code through the
 * CoffeeScript lexer to verify that the values match.
 *
 * This function uses a simple and imperfect algorithm to extract the string
 * contents from the coffee-lex and CoffeeScript output, so it should only be
 * given relatively simple cases, e.g. no string literals within interpolations.
 * Also, empty quasis are removed to account for unimportant differences between
 * coffee-lex and the CoffeeScript lexer. It can always be made more advanced if
 * more complicated cases are useful to test.
 */
export function verifyStringMatchesCoffeeScript(
  code: string,
  expectedQuasis: Array<string>
): void {
  const coffeeLexResult = getCoffeeLexQuasis(code)
  const coffeeScriptResult = getCoffeeScriptQuasis(code)
  deepEqual(
    coffeeLexResult,
    coffeeScriptResult,
    'coffee-lex output and CoffeeScript output disagreed.'
  )
  deepEqual(
    coffeeLexResult,
    expectedQuasis,
    'coffee-lex output and expected output disagreed.'
  )
}

function getCoffeeLexQuasis(code: string): Array<string> {
  const tokens = lex(code)
  let quasis = ['']
  tokens.forEach((token) => {
    if (token.type === SourceType.STRING_CONTENT) {
      quasis[quasis.length - 1] += code.slice(token.start, token.end)
    } else if (token.type === SourceType.STRING_LINE_SEPARATOR) {
      quasis[quasis.length - 1] += ' '
    } else if (token.type === SourceType.INTERPOLATION_START) {
      quasis.push('')
    }
  })
  // As a special case, if this is a heregexp, escaping rules are different, so
  // convert backslash to double backslash. Code using coffee-lex is responsible
  // for adding these escape characters.
  if (tokens.toArray()[0].type === SourceType.HEREGEXP_START) {
    quasis = quasis.map((str) => str.replace(/\\/g, '\\\\'))
  } else {
    quasis = quasis.map(normalizeSpaces)
  }
  return quasis.filter((quasi) => quasi.length > 0)
}

function getCoffeeScriptQuasis(code: string): Array<string> {
  const tokens = CoffeeScript.tokens(code)
  const resultQuasis: Array<string> = []
  for (const token of tokens) {
    if (token[0] === 'STRING') {
      let stringForm = normalizeSpaces(token[1].replace(/\t/g, '\\t'))
      if (stringForm[0] === "'") {
        stringForm = `"${stringForm.slice(1, -1)}"`
      }
      resultQuasis.push(JSON.parse(stringForm).replace(/\\/g, '\\\\'))
    } else if (token[0] === 'REGEX') {
      const stringForm = `"${token[1].slice(1, -1)}"`
        .replace(/\\/g, '\\\\')
        .replace(/\t/g, '\\t')
      resultQuasis.push(JSON.parse(stringForm).replace(/\\/g, '\\\\'))
    }
  }
  return resultQuasis.filter((quasi) => quasi.length > 0)
}

function normalizeSpaces(str: string): string {
  let fixedStr = ''
  let numBackslashes = 0
  for (const chr of str) {
    if (chr === ' ' && numBackslashes % 2 === 1) {
      fixedStr = fixedStr.slice(0, fixedStr.length - 1)
    }
    if (chr === '\\') {
      numBackslashes++
    } else {
      numBackslashes = 0
    }
    fixedStr += chr
  }
  return fixedStr
}
