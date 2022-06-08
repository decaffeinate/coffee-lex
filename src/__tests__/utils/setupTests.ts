import { inspect } from 'util'
import { SourceLocation } from '../../SourceLocation'
import { SourceToken } from '../../SourceToken'
import { SourceType } from '../../SourceType'
import lex from '../..'

declare global {
  // eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T> {
      toEqualSourceLocations(expected: Array<SourceLocation>): R
      toHaveSourceType(expected: SourceType): R
      toLexAs(expected: Array<SourceToken>): R
    }
  }
}

expect.extend({
  toEqualSourceLocations(
    actual: Array<SourceLocation>,
    expected: Array<SourceLocation>
  ): jest.CustomMatcherResult {
    return {
      pass: this.equals(actual, expected),
      message: () => `mismatched tokens:\n${this.utils.diff(expected, actual)}`,
    }
  },

  toHaveSourceType(
    token: SourceToken,
    type: SourceType
  ): jest.CustomMatcherResult {
    return {
      pass: token.type === type,
      message: () =>
        `expected ${inspect(token)} to have type ${SourceType[type]}`,
    }
  },

  toLexAs(
    source: string,
    tokens: Array<SourceToken>
  ): jest.CustomMatcherResult {
    const actual = lex(source).toArray()

    return {
      pass: this.equals(actual, tokens),
      message: () =>
        `tokens for ${inspect(source)} did not match:\n${this.utils.diff(
          tokens,
          actual
        )}`,
    }
  },
})
