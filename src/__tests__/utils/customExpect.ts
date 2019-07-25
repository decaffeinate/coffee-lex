import { inspect } from 'util';
import SourceLocation from '../../SourceLocation';
import SourceToken from '../../SourceToken';
import SourceType from '../../SourceType';
import lex from '../..';

interface Matchers<T> extends jest.Matchers<T> {
  toEqualSourceLocations(expected: Array<SourceLocation>): T;
  toHaveSourceType(expected: SourceType): T;
  toLexAs(expected: Array<SourceToken>): T;
}

expect.extend({
  toEqualSourceLocations(actual: Array<SourceLocation>, expected: Array<SourceLocation>): jest.CustomMatcherResult {
    return {
      pass: this.equals(actual, expected),
      message: () => `mismatched tokens:\n${this.utils.diff(expected, actual)}`
    };
  },

  toHaveSourceType(token: SourceToken, type: SourceType): jest.CustomMatcherResult {
    return {
      pass: token.type === type,
      message: () => `expected ${inspect(token)} to have type ${SourceType[type]}`
    };
  },

  toLexAs(source: string, tokens: Array<SourceToken>): jest.CustomMatcherResult {
    const actual = lex(source).toArray();

    return {
      pass: this.equals(actual, tokens),
      message: () => `tokens for ${inspect(source)} did not match:\n${this.utils.diff(tokens, actual)}`
    };
  }
});

export default function customExpect<T>(value: T): Matchers<T> {
  return expect(value) as Matchers<T>;
}
