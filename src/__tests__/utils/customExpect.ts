import { inspect } from 'util';
import SourceLocation from '../../SourceLocation';
import SourceToken from '../../SourceToken';
import SourceType from '../../SourceType';

interface Matchers<T> extends jest.Matchers<T> {
  toEqualSourceLocations(expected: Array<SourceLocation>): T;
  toHaveSourceType(expected: SourceType): T;
}

function formatLocationsCode(locations: Array<SourceLocation>): string {
  return locations.map(loc => `new SourceLocation(SourceType.${loc.type}, ${loc.index}),`).join('\n');
}

expect.extend({
  toEqualSourceLocations(actual: Array<SourceLocation>, expected: Array<SourceLocation>): jest.CustomMatcherResult {
    return {
      pass: this.equals(actual, expected),
      message: () => `Mismatched tokens.
Expected:
${formatLocationsCode(expected)}
Found:
${formatLocationsCode(actual)}`
    };
  },

  toHaveSourceType(token: SourceToken, type: SourceType): jest.CustomMatcherResult {
    return {
      pass: token.type === type,
      message: () => `expected ${inspect(token)} to have type ${SourceType[type]}`
    };
  }
});

export default function customExpect<T>(value: T): Matchers<T> {
  return expect(value) as Matchers<T>;
}
