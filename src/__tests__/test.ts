import lex, { consumeStream, stream, SourceType } from '../index';
import SourceLocation from '../SourceLocation';
import SourceToken from '../SourceToken';
import SourceTokenList from '../SourceTokenList';
import expect from './utils/customExpect';

function checkLocations(stream: () => SourceLocation, expectedLocations: Array<SourceLocation>) {
  let actualLocations = consumeStream(stream);
  expect(actualLocations).toEqualSourceLocations(expectedLocations);
}

describe('lexTest', () => {
  test('returns an empty list for an empty program', () => {
    expect(lex('').toArray()).toEqual([]);
  });

  test('builds a list of tokens omitting SPACE and EOF', () => {
    expect(lex(`a + b`).toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5)
    ]);
  });

  test('returns a `SourceTokenList`', () => {
    expect(lex('') instanceof SourceTokenList).toBeTruthy();
  });

  test('turns string interpolations into cohesive string tokens', () => {
    expect(lex(`"b#{c}d#{e}f"`).toArray()).toEqual([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 2),
      new SourceToken(SourceType.INTERPOLATION_START, 2, 4),
      new SourceToken(SourceType.IDENTIFIER, 4, 5),
      new SourceToken(SourceType.INTERPOLATION_END, 5, 6),
      new SourceToken(SourceType.STRING_CONTENT, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_START, 7, 9),
      new SourceToken(SourceType.IDENTIFIER, 9, 10),
      new SourceToken(SourceType.INTERPOLATION_END, 10, 11),
      new SourceToken(SourceType.STRING_CONTENT, 11, 12),
      new SourceToken(SourceType.DSTRING_END, 12, 13)
    ]);
  });

  test('inserts padding in the correct places for a multiline string', () => {
    expect(lex(`"  b#{c}  \n  d#{e}  \n  f  "`).toArray()).toEqual([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 4),
      new SourceToken(SourceType.INTERPOLATION_START, 4, 6),
      new SourceToken(SourceType.IDENTIFIER, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_END, 7, 8),
      new SourceToken(SourceType.STRING_PADDING, 8, 10),
      new SourceToken(SourceType.STRING_LINE_SEPARATOR, 10, 11),
      new SourceToken(SourceType.STRING_PADDING, 11, 13),
      new SourceToken(SourceType.STRING_CONTENT, 13, 14),
      new SourceToken(SourceType.INTERPOLATION_START, 14, 16),
      new SourceToken(SourceType.IDENTIFIER, 16, 17),
      new SourceToken(SourceType.INTERPOLATION_END, 17, 18),
      new SourceToken(SourceType.STRING_PADDING, 18, 20),
      new SourceToken(SourceType.STRING_LINE_SEPARATOR, 20, 21),
      new SourceToken(SourceType.STRING_PADDING, 21, 23),
      new SourceToken(SourceType.STRING_CONTENT, 23, 26),
      new SourceToken(SourceType.DSTRING_END, 26, 27)
    ]);
  });

  test('adds empty template content tokens between adjacent interpolations', () => {
    expect(lex(`"#{a}#{b}"`).toArray()).toEqual([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 1),
      new SourceToken(SourceType.INTERPOLATION_START, 1, 3),
      new SourceToken(SourceType.IDENTIFIER, 3, 4),
      new SourceToken(SourceType.INTERPOLATION_END, 4, 5),
      new SourceToken(SourceType.STRING_CONTENT, 5, 5),
      new SourceToken(SourceType.INTERPOLATION_START, 5, 7),
      new SourceToken(SourceType.IDENTIFIER, 7, 8),
      new SourceToken(SourceType.INTERPOLATION_END, 8, 9),
      new SourceToken(SourceType.STRING_CONTENT, 9, 9),
      new SourceToken(SourceType.DSTRING_END, 9, 10)
    ]);
  });

  test('turns triple-quoted string interpolations into string tokens', () => {
    expect(lex(`"""\n  b#{c}\n  d#{e}f\n"""`).toArray()).toEqual([
      new SourceToken(SourceType.TDSTRING_START, 0, 3),
      new SourceToken(SourceType.STRING_PADDING, 3, 6),
      new SourceToken(SourceType.STRING_CONTENT, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_START, 7, 9),
      new SourceToken(SourceType.IDENTIFIER, 9, 10),
      new SourceToken(SourceType.INTERPOLATION_END, 10, 11),
      new SourceToken(SourceType.STRING_CONTENT, 11, 12),
      new SourceToken(SourceType.STRING_PADDING, 12, 14),
      new SourceToken(SourceType.STRING_CONTENT, 14, 15),
      new SourceToken(SourceType.INTERPOLATION_START, 15, 17),
      new SourceToken(SourceType.IDENTIFIER, 17, 18),
      new SourceToken(SourceType.INTERPOLATION_END, 18, 19),
      new SourceToken(SourceType.STRING_CONTENT, 19, 20),
      new SourceToken(SourceType.STRING_PADDING, 20, 21),
      new SourceToken(SourceType.TDSTRING_END, 21, 24)
    ]);
  });

  test('turns triple-quoted strings with leading interpolation into string tokens', () => {
    expect(lex(`"""\n#{a}\n"""`).toArray()).toEqual([
      new SourceToken(SourceType.TDSTRING_START, 0, 3),
      new SourceToken(SourceType.STRING_PADDING, 3, 4),
      new SourceToken(SourceType.INTERPOLATION_START, 4, 6),
      new SourceToken(SourceType.IDENTIFIER, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_END, 7, 8),
      new SourceToken(SourceType.STRING_PADDING, 8, 9),
      new SourceToken(SourceType.TDSTRING_END, 9, 12)
    ]);
  });

  test('handles nested interpolations', () => {
    expect(lex(`"#{"#{a}"}"`).toArray()).toEqual([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 1),
      new SourceToken(SourceType.INTERPOLATION_START, 1, 3),
      new SourceToken(SourceType.DSTRING_START, 3, 4),
      new SourceToken(SourceType.STRING_CONTENT, 4, 4),
      new SourceToken(SourceType.INTERPOLATION_START, 4, 6),
      new SourceToken(SourceType.IDENTIFIER, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_END, 7, 8),
      new SourceToken(SourceType.STRING_CONTENT, 8, 8),
      new SourceToken(SourceType.DSTRING_END, 8, 9),
      new SourceToken(SourceType.INTERPOLATION_END, 9, 10),
      new SourceToken(SourceType.STRING_CONTENT, 10, 10),
      new SourceToken(SourceType.DSTRING_END, 10, 11)
    ]);
  });

  test('handles spaces in string interpolations appropriately', () => {
    expect(lex(`"#{ a }"`).toArray()).toEqual([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 1),
      new SourceToken(SourceType.INTERPOLATION_START, 1, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5),
      new SourceToken(SourceType.INTERPOLATION_END, 6, 7),
      new SourceToken(SourceType.STRING_CONTENT, 7, 7),
      new SourceToken(SourceType.DSTRING_END, 7, 8)
    ]);
  });

  test('identifies `not instanceof` as a single operator', () => {
    expect(lex('a not instanceof b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 16),
      new SourceToken(SourceType.IDENTIFIER, 17, 18)
    ]);
  });

  test('identifies `!instanceof` as a single operator', () => {
    expect(lex('a !instanceof b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 13),
      new SourceToken(SourceType.IDENTIFIER, 14, 15)
    ]);
  });

  test('identifies `not in` as a single operator', () => {
    expect(lex('a not in b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 8),
      new SourceToken(SourceType.IDENTIFIER, 9, 10)
    ]);
  });

  test('identifies `!in` as a single operator', () => {
    expect(lex('a !in b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 5),
      new SourceToken(SourceType.IDENTIFIER, 6, 7)
    ]);
  });

  test('identifies `not of` as a single operator', () => {
    expect(lex('a not of b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 8),
      new SourceToken(SourceType.IDENTIFIER, 9, 10)
    ]);
  });

  test('identifies `!of` as a single operator', () => {
    expect(lex('a !of b').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 5),
      new SourceToken(SourceType.IDENTIFIER, 6, 7)
    ]);
  });

  test('identifies parentheses immediately after callable tokens as CALL_START', () => {
    expect(lex('a(super(@(b[0](), true&(false), b?())))').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.CALL_START, 1, 2),
      new SourceToken(SourceType.SUPER, 2, 7),
      new SourceToken(SourceType.CALL_START, 7, 8),
      new SourceToken(SourceType.AT, 8, 9),
      new SourceToken(SourceType.CALL_START, 9, 10),
      new SourceToken(SourceType.IDENTIFIER, 10, 11),
      new SourceToken(SourceType.LBRACKET, 11, 12),
      new SourceToken(SourceType.NUMBER, 12, 13),
      new SourceToken(SourceType.RBRACKET, 13, 14),
      new SourceToken(SourceType.CALL_START, 14, 15),
      new SourceToken(SourceType.CALL_END, 15, 16),
      new SourceToken(SourceType.COMMA, 16, 17),
      new SourceToken(SourceType.BOOL, 18, 22),
      new SourceToken(SourceType.OPERATOR, 22, 23),
      new SourceToken(SourceType.LPAREN, 23, 24),
      new SourceToken(SourceType.BOOL, 24, 29),
      new SourceToken(SourceType.RPAREN, 29, 30),
      new SourceToken(SourceType.COMMA, 30, 31),
      new SourceToken(SourceType.IDENTIFIER, 32, 33),
      new SourceToken(SourceType.EXISTENCE, 33, 34),
      new SourceToken(SourceType.CALL_START, 34, 35),
      new SourceToken(SourceType.CALL_END, 35, 36),
      new SourceToken(SourceType.CALL_END, 36, 37),
      new SourceToken(SourceType.CALL_END, 37, 38),
      new SourceToken(SourceType.CALL_END, 38, 39)
    ]);
  });

  test('identifies parentheses immediately after a CALL_END as CALL_START', () => {
    expect(lex('a()()').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.CALL_START, 1, 2),
      new SourceToken(SourceType.CALL_END, 2, 3),
      new SourceToken(SourceType.CALL_START, 3, 4),
      new SourceToken(SourceType.CALL_END, 4, 5)
    ]);
  });

  test('identifies `new` as a NEW token', () => {
    expect(lex('new A').toArray()).toEqual([
      new SourceToken(SourceType.NEW, 0, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5)
    ]);
  });

  test('identifies `new` as an IDENTIFIER in a property name', () => {
    expect(lex('a\n  new: 5').toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.NEWLINE, 1, 2),
      new SourceToken(SourceType.IDENTIFIER, 4, 7),
      new SourceToken(SourceType.COLON, 7, 8),
      new SourceToken(SourceType.NUMBER, 9, 10)
    ]);
  });

  test('identifies closing interpolations inside objects', () => {
    expect(lex(`{ id: "#{a}" }`).toArray()).toEqual([
      new SourceToken(SourceType.LBRACE, 0, 1),
      new SourceToken(SourceType.IDENTIFIER, 2, 4),
      new SourceToken(SourceType.COLON, 4, 5),
      new SourceToken(SourceType.DSTRING_START, 6, 7),
      new SourceToken(SourceType.STRING_CONTENT, 7, 7),
      new SourceToken(SourceType.INTERPOLATION_START, 7, 9),
      new SourceToken(SourceType.IDENTIFIER, 9, 10),
      new SourceToken(SourceType.INTERPOLATION_END, 10, 11),
      new SourceToken(SourceType.STRING_CONTENT, 11, 11),
      new SourceToken(SourceType.DSTRING_END, 11, 12),
      new SourceToken(SourceType.RBRACE, 13, 14)
    ]);
  });

  test('represents triple-quoted strings as a series of tokens to ignore the non-semantic parts', () => {
    expect(lex(`foo = '''\n      abc\n\n      def\n      '''`).toArray()).toEqual([
      new SourceToken(SourceType.IDENTIFIER, 0, 3),
      new SourceToken(SourceType.OPERATOR, 4, 5),
      new SourceToken(SourceType.TSSTRING_START, 6, 9),
      new SourceToken(SourceType.STRING_PADDING, 9, 16),
      new SourceToken(SourceType.STRING_CONTENT, 16, 21),
      new SourceToken(SourceType.STRING_PADDING, 21, 27),
      new SourceToken(SourceType.STRING_CONTENT, 27, 30),
      new SourceToken(SourceType.STRING_PADDING, 30, 37),
      new SourceToken(SourceType.TSSTRING_END, 37, 40)
    ]);
  });

  test('@on() is a function call not and not a bool followed by parens', () => {
    expect(lex(`@on()`).toArray()).toEqual([
      new SourceToken(SourceType.AT, 0, 1),
      new SourceToken(SourceType.IDENTIFIER, 1, 3),
      new SourceToken(SourceType.CALL_START, 3, 4),
      new SourceToken(SourceType.CALL_END, 4, 5)
    ]);
  });

  test('@ followed by a newline + `if` lexes as AT and IF (#175)', () => {
    expect(lex('@\nif a then b').toArray()).toEqual([
      new SourceToken(SourceType.AT, 0, 1),
      new SourceToken(SourceType.NEWLINE, 1, 2),
      new SourceToken(SourceType.IF, 2, 4),
      new SourceToken(SourceType.IDENTIFIER, 5, 6),
      new SourceToken(SourceType.THEN, 7, 11),
      new SourceToken(SourceType.IDENTIFIER, 12, 13)
    ]);
  });
});

describe('SourceTokenListTest', () => {
  test('has a `startIndex` that represents the first token', () => {
    let list = lex('0');
    let token = list.tokenAtIndex(list.startIndex);
    expect(token).toEqual(new SourceToken(SourceType.NUMBER, 0, 1));
  });

  test('has an `endIndex` that represents the virtual token after the last one', () => {
    let { startIndex, endIndex } = lex(''); // no tokens
    expect(endIndex).toBe(startIndex);
  });

  test('always returns the same index when advancing to the same offset', () => {
    let { startIndex, endIndex } = lex('a'); // one token
    expect(startIndex.next()).toBe(endIndex);
    expect(endIndex.previous()).toBe(startIndex);
  });

  test('allows getting a containing token index by source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenContainingSourceIndex(0)).toBe(oneIndex); // o
    expect(list.indexOfTokenContainingSourceIndex(1)).toBe(oneIndex); // n
    expect(list.indexOfTokenContainingSourceIndex(2)).toBe(oneIndex); // e
    expect(list.indexOfTokenContainingSourceIndex(3)).toBe(null); //
    expect(list.indexOfTokenContainingSourceIndex(4)).toBe(plusIndex); // +
    expect(list.indexOfTokenContainingSourceIndex(5)).toBe(null); //
    expect(list.indexOfTokenContainingSourceIndex(6)).toBe(twoIndex); // t
    expect(list.indexOfTokenContainingSourceIndex(7)).toBe(twoIndex); // w
    expect(list.indexOfTokenContainingSourceIndex(8)).toBe(twoIndex); // o
    expect(list.indexOfTokenContainingSourceIndex(9)).toBe(null); // <EOF>
  });

  test('allows getting a nearby token index by source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenNearSourceIndex(0)).toBe(oneIndex); // o
    expect(list.indexOfTokenNearSourceIndex(1)).toBe(oneIndex); // n
    expect(list.indexOfTokenNearSourceIndex(2)).toBe(oneIndex); // e
    expect(list.indexOfTokenNearSourceIndex(3)).toBe(oneIndex); //
    expect(list.indexOfTokenNearSourceIndex(4)).toBe(plusIndex); // +
    expect(list.indexOfTokenNearSourceIndex(5)).toBe(plusIndex); //
    expect(list.indexOfTokenNearSourceIndex(6)).toBe(twoIndex); // t
    expect(list.indexOfTokenNearSourceIndex(7)).toBe(twoIndex); // w
    expect(list.indexOfTokenNearSourceIndex(8)).toBe(twoIndex); // o
    expect(list.indexOfTokenNearSourceIndex(9)).toBe(twoIndex); // <EOF>
  });

  test('allows getting a token index by its starting source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenStartingAtSourceIndex(0)).toBe(oneIndex); // o
    expect(list.indexOfTokenStartingAtSourceIndex(1)).toBe(null); // n
    expect(list.indexOfTokenStartingAtSourceIndex(2)).toBe(null); // e
    expect(list.indexOfTokenStartingAtSourceIndex(3)).toBe(null); //
    expect(list.indexOfTokenStartingAtSourceIndex(4)).toBe(plusIndex); // +
    expect(list.indexOfTokenStartingAtSourceIndex(5)).toBe(null); //
    expect(list.indexOfTokenStartingAtSourceIndex(6)).toBe(twoIndex); // t
    expect(list.indexOfTokenStartingAtSourceIndex(7)).toBe(null); // w
    expect(list.indexOfTokenStartingAtSourceIndex(8)).toBe(null); // o
    expect(list.indexOfTokenStartingAtSourceIndex(9)).toBe(null); // <EOF>
  });

  test('allows getting a token index by its ending source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenEndingAtSourceIndex(0)).toBe(null); // o
    expect(list.indexOfTokenEndingAtSourceIndex(1)).toBe(null); // n
    expect(list.indexOfTokenEndingAtSourceIndex(2)).toBe(null); // e
    expect(list.indexOfTokenEndingAtSourceIndex(3)).toBe(oneIndex); //
    expect(list.indexOfTokenEndingAtSourceIndex(4)).toBe(null); // +
    expect(list.indexOfTokenEndingAtSourceIndex(5)).toBe(plusIndex); //
    expect(list.indexOfTokenEndingAtSourceIndex(6)).toBe(null); // t
    expect(list.indexOfTokenEndingAtSourceIndex(7)).toBe(null); // w
    expect(list.indexOfTokenEndingAtSourceIndex(8)).toBe(null); // o
    expect(list.indexOfTokenEndingAtSourceIndex(9)).toBe(twoIndex); // <EOF>
  });

  test('allows searching through a token index range by a predicate', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER)).toBe(oneIndex);
    expect(list.indexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER, plusIndex)).toBe(twoIndex);
    expect(list.indexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER, plusIndex, twoIndex)).toBe(
      null
    );
  });

  test('allows searching backwards through a token index range by a predicate', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.lastIndexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER)).toBe(twoIndex);
    expect(list.lastIndexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER, plusIndex)).toBe(
      oneIndex
    );
    expect(
      list.lastIndexOfTokenMatchingPredicate(token => token.type === SourceType.IDENTIFIER, plusIndex, oneIndex)
    ).toBe(null);
  });

  test('allows getting the range of an interpolated string by source index', () => {
    let list = lex('a = "b#{c}d".length');
    let expectedStartIndex = list.startIndex.advance(2);
    let expectedStart = expectedStartIndex && list.tokenAtIndex(expectedStartIndex);
    let expectedEndIndex = list.startIndex.advance(9);
    let expectedEnd = expectedEndIndex && list.tokenAtIndex(expectedEndIndex);

    function assertNullAtSourceIndex(sourceIndex: number) {
      let index = list.indexOfTokenContainingSourceIndex(sourceIndex);
      if (!index) {
        // No token contains this index, so of course it'll be null.
        return;
      }
      if (list.rangeOfInterpolatedStringTokensContainingTokenIndex(index) !== null) {
        throw new Error(`expected no range for source index ${sourceIndex}`);
      }
    }

    function assertMatchesAtSourceIndex(sourceIndex: number) {
      let index = list.indexOfTokenContainingSourceIndex(sourceIndex);
      let range = index && list.rangeOfInterpolatedStringTokensContainingTokenIndex(index);

      if (!range) {
        throw new Error(`range should not be null for source index ${sourceIndex}`);
      }

      let [start, end] = range;

      if (list.tokenAtIndex(start) !== expectedStart) {
        throw new Error(`wrong start token for source index ${sourceIndex}`);
      }

      if (list.tokenAtIndex(end) !== expectedEnd) {
        throw new Error(`wrong end token for source index ${sourceIndex}`);
      }
    }

    assertNullAtSourceIndex(0); // a
    assertNullAtSourceIndex(1); // <SPACE>
    assertNullAtSourceIndex(2); // =
    assertNullAtSourceIndex(3); // <SPACE>
    assertMatchesAtSourceIndex(4); // "
    assertMatchesAtSourceIndex(5); // b
    assertMatchesAtSourceIndex(6); // #
    assertMatchesAtSourceIndex(7); // {
    assertMatchesAtSourceIndex(8); // c
    assertMatchesAtSourceIndex(9); // }
    assertMatchesAtSourceIndex(10); // d
    assertMatchesAtSourceIndex(11); // "
    assertNullAtSourceIndex(12); // .
    assertNullAtSourceIndex(13); // l
    assertNullAtSourceIndex(14); // e
    assertNullAtSourceIndex(15); // n
    assertNullAtSourceIndex(16); // g
    assertNullAtSourceIndex(17); // t
    assertNullAtSourceIndex(18); // h
    assertNullAtSourceIndex(19); // <EOF>
  });

  test('can find the containing interpolated string starting at an interpolation boundary', () => {
    let list = lex('"#{a}b"');
    let expectedStart = list.startIndex;
    let expectedEnd = list.endIndex;

    // Go past DSTRING_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let interpolationStartToken = interpolationStart && list.tokenAtIndex(interpolationStart);

    if (!interpolationStart || !interpolationStartToken) {
      throw new Error(`unable to find interpolation start token`);
    }

    expect(interpolationStartToken).toHaveSourceType(SourceType.INTERPOLATION_START);

    let range = list.rangeOfInterpolatedStringTokensContainingTokenIndex(interpolationStart);
    expect(range && range[0]).toBe(expectedStart);
    expect(range && range[1]).toBe(expectedEnd);
  });

  test('can determine the interpolated string range with an interior string', () => {
    let list = lex('"#{"a"}"');

    expect(list.map(t => t.type)).toEqual([
      SourceType.DSTRING_START,
      SourceType.STRING_CONTENT,
      SourceType.INTERPOLATION_START,
      SourceType.DSTRING_START,
      SourceType.STRING_CONTENT,
      SourceType.DSTRING_END,
      SourceType.INTERPOLATION_END,
      SourceType.STRING_CONTENT,
      SourceType.DSTRING_END
    ]);

    // Go past DSTRING_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let range = interpolationStart && list.rangeOfInterpolatedStringTokensContainingTokenIndex(interpolationStart);

    if (!range) {
      throw new Error(`unable to determine range of interpolation start`);
    }

    expect(range[0]).toBe(list.startIndex);
    expect(range[1]).toBe(list.endIndex);
  });

  test('can determine the interpolated string range for a heregex', () => {
    let list = lex('///a#{b}c///');

    expect(list.map(t => t.type)).toEqual([
      SourceType.HEREGEXP_START,
      SourceType.STRING_CONTENT,
      SourceType.INTERPOLATION_START,
      SourceType.IDENTIFIER,
      SourceType.INTERPOLATION_END,
      SourceType.STRING_CONTENT,
      SourceType.HEREGEXP_END
    ]);

    // Go past HEREGEXP_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let range = interpolationStart && list.rangeOfInterpolatedStringTokensContainingTokenIndex(interpolationStart);

    if (!range) {
      throw new Error(`unable to determine range of interpolation start`);
    }

    expect(range[0]).toBe(list.startIndex);
    expect(range[1]).toBe(list.endIndex);
  });

  test('allows comparing indexes', () => {
    let list = lex('a b');
    let { startIndex, endIndex } = list;

    expect(startIndex.compare(startIndex)).toEqual(0);
    expect(startIndex.compare(endIndex)).toBeGreaterThan(0);
    expect(endIndex.compare(startIndex)).toBeLessThan(0);
    expect(startIndex.isBefore(endIndex)).toBe(true);
    expect(endIndex.isBefore(startIndex)).toBe(false);
    expect(endIndex.isAfter(startIndex)).toBe(true);
    expect(startIndex.isAfter(endIndex)).toBe(false);
  });

  test('handles heregex padding with comments when in CS2 mode', () => {
    let list = lex('r = ///\na # #{b}c\n d///', { useCS2: true });

    expect(list.map(t => t.type)).toEqual([
      SourceType.IDENTIFIER,
      SourceType.OPERATOR,
      SourceType.HEREGEXP_START,
      SourceType.STRING_PADDING,
      SourceType.STRING_CONTENT,
      SourceType.STRING_PADDING,
      SourceType.HEREGEXP_COMMENT,
      SourceType.STRING_PADDING,
      SourceType.STRING_CONTENT,
      SourceType.HEREGEXP_END
    ]);
  });
});

describe('streamTest', () => {
  test('yields EOF when given an empty program', () => {
    checkLocations(stream(''), [new SourceLocation(SourceType.EOF, 0)]);
  });

  test('identifies single-quoted strings', () => {
    checkLocations(stream(`'abc'`), [
      new SourceLocation(SourceType.SSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.SSTRING_END, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  test('identifies double-quoted strings', () => {
    checkLocations(stream(`"abc"`), [
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.DSTRING_END, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  test('identifies triple-single-quoted strings', () => {
    checkLocations(stream(`'''abc'''`), [
      new SourceLocation(SourceType.TSSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.TSSTRING_END, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies triple-double-quoted strings', () => {
    checkLocations(stream(`"""abc"""`), [
      new SourceLocation(SourceType.TDSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.TDSTRING_END, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies identifiers', () => {
    checkLocations(stream(`a`), [new SourceLocation(SourceType.IDENTIFIER, 0), new SourceLocation(SourceType.EOF, 1)]);
  });

  test('identifies whitespace', () => {
    checkLocations(stream(`a b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  test('transitions to INTERPOLATION_START at a string interpolation', () => {
    checkLocations(stream(`"a#{b}c"`), [
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.INTERPOLATION_START, 2),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.INTERPOLATION_END, 5),
      new SourceLocation(SourceType.STRING_CONTENT, 6),
      new SourceLocation(SourceType.DSTRING_END, 7),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('handles nested string interpolation', () => {
    checkLocations(stream(`"#{"#{}"}"`), [
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.INTERPOLATION_START, 1),
      new SourceLocation(SourceType.DSTRING_START, 3),
      new SourceLocation(SourceType.STRING_CONTENT, 4),
      new SourceLocation(SourceType.INTERPOLATION_START, 4),
      new SourceLocation(SourceType.INTERPOLATION_END, 6),
      new SourceLocation(SourceType.STRING_CONTENT, 7),
      new SourceLocation(SourceType.DSTRING_END, 7),
      new SourceLocation(SourceType.INTERPOLATION_END, 8),
      new SourceLocation(SourceType.STRING_CONTENT, 9),
      new SourceLocation(SourceType.DSTRING_END, 9),
      new SourceLocation(SourceType.EOF, 10)
    ]);
  });

  test('identifies integers as numbers', () => {
    checkLocations(stream(`10`), [new SourceLocation(SourceType.NUMBER, 0), new SourceLocation(SourceType.EOF, 2)]);
  });

  test('identifies floats as numbers', () => {
    checkLocations(stream(`1.23`), [new SourceLocation(SourceType.NUMBER, 0), new SourceLocation(SourceType.EOF, 4)]);
  });

  test('identifies floats with leading dots as numbers', () => {
    checkLocations(stream(`.23`), [new SourceLocation(SourceType.NUMBER, 0), new SourceLocation(SourceType.EOF, 3)]);
  });

  test('identifies + as an operator', () => {
    checkLocations(stream(`a + b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  test('identifies opening and closing parentheses', () => {
    checkLocations(stream(`(b)*2`), [
      new SourceLocation(SourceType.LPAREN, 0),
      new SourceLocation(SourceType.IDENTIFIER, 1),
      new SourceLocation(SourceType.RPAREN, 2),
      new SourceLocation(SourceType.OPERATOR, 3),
      new SourceLocation(SourceType.NUMBER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  test('identifies opening and closing braces', () => {
    checkLocations(stream(`{ a: '{}' }`), [
      new SourceLocation(SourceType.LBRACE, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.COLON, 3),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.SSTRING_START, 5),
      new SourceLocation(SourceType.STRING_CONTENT, 6),
      new SourceLocation(SourceType.SSTRING_END, 8),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.RBRACE, 10),
      new SourceLocation(SourceType.EOF, 11)
    ]);
  });

  test('identifies opening and closing brackets', () => {
    checkLocations(stream(`[ a[1], b['f]['] ]`), [
      new SourceLocation(SourceType.LBRACKET, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.LBRACKET, 3),
      new SourceLocation(SourceType.NUMBER, 4),
      new SourceLocation(SourceType.RBRACKET, 5),
      new SourceLocation(SourceType.COMMA, 6),
      new SourceLocation(SourceType.SPACE, 7),
      new SourceLocation(SourceType.IDENTIFIER, 8),
      new SourceLocation(SourceType.LBRACKET, 9),
      new SourceLocation(SourceType.SSTRING_START, 10),
      new SourceLocation(SourceType.STRING_CONTENT, 11),
      new SourceLocation(SourceType.SSTRING_END, 14),
      new SourceLocation(SourceType.RBRACKET, 15),
      new SourceLocation(SourceType.SPACE, 16),
      new SourceLocation(SourceType.RBRACKET, 17),
      new SourceLocation(SourceType.EOF, 18)
    ]);
  });

  test('identifies embedded JavaScript', () => {
    checkLocations(stream('`1` + 2'), [
      new SourceLocation(SourceType.JS, 0),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.NUMBER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  test('identifies LF as a newline', () => {
    checkLocations(stream(`a\nb`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.NEWLINE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  test('identifies @', () => {
    checkLocations(stream(`@a`), [
      new SourceLocation(SourceType.AT, 0),
      new SourceLocation(SourceType.IDENTIFIER, 1),
      new SourceLocation(SourceType.EOF, 2)
    ]);
  });

  test('identifies semicolons', () => {
    checkLocations(stream(`a; b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SEMICOLON, 1),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies adjacent operators as distinct', () => {
    checkLocations(stream(`a=++b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.OPERATOR, 1),
      new SourceLocation(SourceType.INCREMENT, 2),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  test('identifies comparison operators', () => {
    checkLocations(stream(`a < b <= c; a > b >= c`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.OPERATOR, 6),
      new SourceLocation(SourceType.SPACE, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.SEMICOLON, 10),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.SPACE, 13),
      new SourceLocation(SourceType.OPERATOR, 14),
      new SourceLocation(SourceType.SPACE, 15),
      new SourceLocation(SourceType.IDENTIFIER, 16),
      new SourceLocation(SourceType.SPACE, 17),
      new SourceLocation(SourceType.OPERATOR, 18),
      new SourceLocation(SourceType.SPACE, 20),
      new SourceLocation(SourceType.IDENTIFIER, 21),
      new SourceLocation(SourceType.EOF, 22)
    ]);
  });

  test('identifies dots', () => {
    checkLocations(stream(`a.b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.DOT, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  test('identifies block comments', () => {
    checkLocations(stream(`### a ###`), [
      new SourceLocation(SourceType.HERECOMMENT, 0),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('does not treat markdown-style headings as block comments', () => {
    checkLocations(stream(`#### FOO`), [
      new SourceLocation(SourceType.COMMENT, 0),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('treats `->` as a function', () => {
    checkLocations(stream(`-> a`), [
      new SourceLocation(SourceType.FUNCTION, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('treats `=>` as a function', () => {
    checkLocations(stream(`=> a`), [
      new SourceLocation(SourceType.FUNCTION, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies division as distinct from regular expressions', () => {
    checkLocations(stream(`1/0 + 2/4`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.OPERATOR, 1),
      new SourceLocation(SourceType.NUMBER, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.NUMBER, 6),
      new SourceLocation(SourceType.OPERATOR, 7),
      new SourceLocation(SourceType.NUMBER, 8),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies regular expressions as RHS in assignment', () => {
    checkLocations(stream(`a = /foo/`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.REGEXP, 4),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies regular expressions at the start of the source', () => {
    checkLocations(stream(`/foo/.test 'abc'`), [
      new SourceLocation(SourceType.REGEXP, 0),
      new SourceLocation(SourceType.DOT, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.SPACE, 10),
      new SourceLocation(SourceType.SSTRING_START, 11),
      new SourceLocation(SourceType.STRING_CONTENT, 12),
      new SourceLocation(SourceType.SSTRING_END, 15),
      new SourceLocation(SourceType.EOF, 16)
    ]);
  });

  test('identifies regular expressions with flags', () => {
    checkLocations(stream(`/foo/g.test 'abc'`), [
      new SourceLocation(SourceType.REGEXP, 0),
      new SourceLocation(SourceType.DOT, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.SSTRING_START, 12),
      new SourceLocation(SourceType.STRING_CONTENT, 13),
      new SourceLocation(SourceType.SSTRING_END, 16),
      new SourceLocation(SourceType.EOF, 17)
    ]);
  });

  test('identifies all regex flags', () => {
    checkLocations(stream(`/a/gimuy`), [
      new SourceLocation(SourceType.REGEXP, 0),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('identifies regex-like division operations after an increment', () => {
    checkLocations(stream(`a++ /b/g`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.INCREMENT, 1),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.OPERATOR, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('identifies regex-like division operations after a decrement', () => {
    checkLocations(stream(`a-- /b/g`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.DECREMENT, 1),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.OPERATOR, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('identifies simple heregexes', () => {
    checkLocations(stream(`///abc///g.test 'foo'`), [
      new SourceLocation(SourceType.HEREGEXP_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.HEREGEXP_END, 6),
      new SourceLocation(SourceType.DOT, 10),
      new SourceLocation(SourceType.IDENTIFIER, 11),
      new SourceLocation(SourceType.SPACE, 15),
      new SourceLocation(SourceType.SSTRING_START, 16),
      new SourceLocation(SourceType.STRING_CONTENT, 17),
      new SourceLocation(SourceType.SSTRING_END, 20),
      new SourceLocation(SourceType.EOF, 21)
    ]);
  });

  test('identifies heregexes with interpolations', () => {
    checkLocations(stream(`///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`), [
      new SourceLocation(SourceType.HEREGEXP_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.INTERPOLATION_START, 10),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.INTERPOLATION_END, 13),
      new SourceLocation(SourceType.STRING_CONTENT, 14),
      new SourceLocation(SourceType.HEREGEXP_END, 39),
      new SourceLocation(SourceType.DOT, 43),
      new SourceLocation(SourceType.IDENTIFIER, 44),
      new SourceLocation(SourceType.SPACE, 48),
      new SourceLocation(SourceType.SSTRING_START, 49),
      new SourceLocation(SourceType.STRING_CONTENT, 50),
      new SourceLocation(SourceType.SSTRING_END, 53),
      new SourceLocation(SourceType.EOF, 54)
    ]);
  });

  test('computes the right padding for heregexes with interpolations', () => {
    expect(lex(`///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`).toArray()).toEqual([
      new SourceToken(SourceType.HEREGEXP_START, 0, 3),
      new SourceToken(SourceType.STRING_CONTENT, 3, 6),
      new SourceToken(SourceType.STRING_PADDING, 6, 7),
      new SourceToken(SourceType.STRING_CONTENT, 7, 10),
      new SourceToken(SourceType.INTERPOLATION_START, 10, 12),
      new SourceToken(SourceType.IDENTIFIER, 12, 13),
      new SourceToken(SourceType.INTERPOLATION_END, 13, 14),
      new SourceToken(SourceType.STRING_PADDING, 14, 36),
      new SourceToken(SourceType.STRING_CONTENT, 36, 39),
      new SourceToken(SourceType.HEREGEXP_END, 39, 43),
      new SourceToken(SourceType.DOT, 43, 44),
      new SourceToken(SourceType.IDENTIFIER, 44, 48),
      new SourceToken(SourceType.SSTRING_START, 49, 50),
      new SourceToken(SourceType.STRING_CONTENT, 50, 53),
      new SourceToken(SourceType.SSTRING_END, 53, 54)
    ]);
  });

  test('identifies keywords for conditionals', () => {
    checkLocations(stream(`if a then b else c`), [
      new SourceLocation(SourceType.IF, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.THEN, 5),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.IDENTIFIER, 10),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.ELSE, 12),
      new SourceLocation(SourceType.SPACE, 16),
      new SourceLocation(SourceType.IDENTIFIER, 17),
      new SourceLocation(SourceType.EOF, 18)
    ]);
  });

  test('identifies keywords for conditionals when followed by semicolons (decaffeinate/decaffeinate#718)', () => {
    checkLocations(stream(`if a then { b: c }`), [
      new SourceLocation(SourceType.IF, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.THEN, 5),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.LBRACE, 10),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.COLON, 13),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.IDENTIFIER, 15),
      new SourceLocation(SourceType.SPACE, 16),
      new SourceLocation(SourceType.RBRACE, 17),
      new SourceLocation(SourceType.EOF, 18)
    ]);
  });

  test('identifies keywords for `unless` conditionals', () => {
    checkLocations(stream(`b unless a`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IF, 2),
      new SourceLocation(SourceType.SPACE, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.EOF, 10)
    ]);
  });

  test('identifies keywords for switch', () => {
    checkLocations(stream(`switch a\n  when b\n    c\n  else d`), [
      new SourceLocation(SourceType.SWITCH, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.NEWLINE, 8),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.WHEN, 11),
      new SourceLocation(SourceType.SPACE, 15),
      new SourceLocation(SourceType.IDENTIFIER, 16),
      new SourceLocation(SourceType.NEWLINE, 17),
      new SourceLocation(SourceType.SPACE, 18),
      new SourceLocation(SourceType.IDENTIFIER, 22),
      new SourceLocation(SourceType.NEWLINE, 23),
      new SourceLocation(SourceType.SPACE, 24),
      new SourceLocation(SourceType.ELSE, 26),
      new SourceLocation(SourceType.SPACE, 30),
      new SourceLocation(SourceType.IDENTIFIER, 31),
      new SourceLocation(SourceType.EOF, 32)
    ]);
  });

  test('identifies keywords for `for` loops', () => {
    checkLocations(stream(`for own a in b then a`), [
      new SourceLocation(SourceType.FOR, 0),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OWN, 4),
      new SourceLocation(SourceType.SPACE, 7),
      new SourceLocation(SourceType.IDENTIFIER, 8),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.RELATION, 10),
      new SourceLocation(SourceType.SPACE, 12),
      new SourceLocation(SourceType.IDENTIFIER, 13),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.THEN, 15),
      new SourceLocation(SourceType.SPACE, 19),
      new SourceLocation(SourceType.IDENTIFIER, 20),
      new SourceLocation(SourceType.EOF, 21)
    ]);
  });

  test('identifies keywords for `while` loops', () => {
    checkLocations(stream(`loop then until a then while b then c`), [
      new SourceLocation(SourceType.LOOP, 0),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.THEN, 5),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.WHILE, 10),
      new SourceLocation(SourceType.SPACE, 15),
      new SourceLocation(SourceType.IDENTIFIER, 16),
      new SourceLocation(SourceType.SPACE, 17),
      new SourceLocation(SourceType.THEN, 18),
      new SourceLocation(SourceType.SPACE, 22),
      new SourceLocation(SourceType.WHILE, 23),
      new SourceLocation(SourceType.SPACE, 28),
      new SourceLocation(SourceType.IDENTIFIER, 29),
      new SourceLocation(SourceType.SPACE, 30),
      new SourceLocation(SourceType.THEN, 31),
      new SourceLocation(SourceType.SPACE, 35),
      new SourceLocation(SourceType.IDENTIFIER, 36),
      new SourceLocation(SourceType.EOF, 37)
    ]);
  });

  test('identifies `class` as a keyword', () => {
    checkLocations(stream(`class A`), [
      new SourceLocation(SourceType.CLASS, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  test('identifies `return` as a keyword', () => {
    checkLocations(stream(`return 0`), [
      new SourceLocation(SourceType.RETURN, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.NUMBER, 7),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  test('identifies `break` and `continue` as keywords', () => {
    checkLocations(stream(`break;continue;`), [
      new SourceLocation(SourceType.BREAK, 0),
      new SourceLocation(SourceType.SEMICOLON, 5),
      new SourceLocation(SourceType.CONTINUE, 6),
      new SourceLocation(SourceType.SEMICOLON, 14),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  test('identifies object keys with keyword names as identifiers', () => {
    checkLocations(stream(`{break:1,continue:2,this :3}`), [
      new SourceLocation(SourceType.LBRACE, 0),
      new SourceLocation(SourceType.IDENTIFIER, 1),
      new SourceLocation(SourceType.COLON, 6),
      new SourceLocation(SourceType.NUMBER, 7),
      new SourceLocation(SourceType.COMMA, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.COLON, 17),
      new SourceLocation(SourceType.NUMBER, 18),
      new SourceLocation(SourceType.COMMA, 19),
      new SourceLocation(SourceType.IDENTIFIER, 20),
      new SourceLocation(SourceType.SPACE, 24),
      new SourceLocation(SourceType.COLON, 25),
      new SourceLocation(SourceType.NUMBER, 26),
      new SourceLocation(SourceType.RBRACE, 27),
      new SourceLocation(SourceType.EOF, 28)
    ]);
  });

  test('identifies identifiers with keyword names after dot access', () => {
    checkLocations(stream(`s.else(0)`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.DOT, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.CALL_START, 6),
      new SourceLocation(SourceType.NUMBER, 7),
      new SourceLocation(SourceType.CALL_END, 8),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies identifiers with keyword names after dot access after a newline', () => {
    checkLocations(
      stream(`s.
else(0)`),
      [
        new SourceLocation(SourceType.IDENTIFIER, 0),
        new SourceLocation(SourceType.DOT, 1),
        new SourceLocation(SourceType.NEWLINE, 2),
        new SourceLocation(SourceType.IDENTIFIER, 3),
        new SourceLocation(SourceType.CALL_START, 7),
        new SourceLocation(SourceType.NUMBER, 8),
        new SourceLocation(SourceType.CALL_END, 9),
        new SourceLocation(SourceType.EOF, 10)
      ]
    );
  });

  test('identifies identifiers with keyword names after proto access', () => {
    checkLocations(stream(`s::delete`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.PROTO, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies `null`', () => {
    checkLocations(stream(`null`), [new SourceLocation(SourceType.NULL, 0), new SourceLocation(SourceType.EOF, 4)]);
  });

  test('identifies `undefined`', () => {
    checkLocations(stream(`undefined`), [
      new SourceLocation(SourceType.UNDEFINED, 0),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies `this`', () => {
    checkLocations(stream(`this`), [new SourceLocation(SourceType.THIS, 0), new SourceLocation(SourceType.EOF, 4)]);
  });

  test('identifies `super`', () => {
    checkLocations(stream(`super`), [new SourceLocation(SourceType.SUPER, 0), new SourceLocation(SourceType.EOF, 5)]);
  });

  test('identifies `delete`', () => {
    checkLocations(stream(`delete a.b`), [
      new SourceLocation(SourceType.DELETE, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.DOT, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.EOF, 10)
    ]);
  });

  test('identifies booleans', () => {
    checkLocations(stream(`true;false;yes;no;on;off`), [
      new SourceLocation(SourceType.BOOL, 0),
      new SourceLocation(SourceType.SEMICOLON, 4),
      new SourceLocation(SourceType.BOOL, 5),
      new SourceLocation(SourceType.SEMICOLON, 10),
      new SourceLocation(SourceType.BOOL, 11),
      new SourceLocation(SourceType.SEMICOLON, 14),
      new SourceLocation(SourceType.BOOL, 15),
      new SourceLocation(SourceType.SEMICOLON, 17),
      new SourceLocation(SourceType.BOOL, 18),
      new SourceLocation(SourceType.SEMICOLON, 20),
      new SourceLocation(SourceType.BOOL, 21),
      new SourceLocation(SourceType.EOF, 24)
    ]);
  });

  test('identifies existence operators', () => {
    checkLocations(stream(`a?.b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.EXISTENCE, 1),
      new SourceLocation(SourceType.DOT, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies proto operators', () => {
    checkLocations(stream(`a::b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.PROTO, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies inclusive ranges', () => {
    checkLocations(stream(`a..b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.RANGE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies line continuations', () => {
    checkLocations(stream(`a = \\\n  b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CONTINUATION, 4),
      new SourceLocation(SourceType.NEWLINE, 5),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.IDENTIFIER, 8),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies floor division', () => {
    checkLocations(stream(`7 // 3`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.NUMBER, 5),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  test('identifies compound assignment', () => {
    checkLocations(stream(`a ?= 3`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.NUMBER, 5),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  test('identifies compound assignment with word operators', () => {
    checkLocations(stream(`a or= 3`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.NUMBER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  test('identifies keyword operators', () => {
    checkLocations(stream(`a and b is c or d`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.SPACE, 7),
      new SourceLocation(SourceType.OPERATOR, 8),
      new SourceLocation(SourceType.SPACE, 10),
      new SourceLocation(SourceType.IDENTIFIER, 11),
      new SourceLocation(SourceType.SPACE, 12),
      new SourceLocation(SourceType.OPERATOR, 13),
      new SourceLocation(SourceType.SPACE, 15),
      new SourceLocation(SourceType.IDENTIFIER, 16),
      new SourceLocation(SourceType.EOF, 17)
    ]);
  });

  test('identifies `in` and `of` as relations', () => {
    checkLocations(stream(`a in b or c of d`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.RELATION, 2),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.OPERATOR, 7),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.IDENTIFIER, 10),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.RELATION, 12),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.IDENTIFIER, 15),
      new SourceLocation(SourceType.EOF, 16)
    ]);
  });

  test('identifies keywords for `try/catch/finally`', () => {
    checkLocations(stream('try a catch e then b finally c'), [
      new SourceLocation(SourceType.TRY, 0),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.CATCH, 6),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.SPACE, 13),
      new SourceLocation(SourceType.THEN, 14),
      new SourceLocation(SourceType.SPACE, 18),
      new SourceLocation(SourceType.IDENTIFIER, 19),
      new SourceLocation(SourceType.SPACE, 20),
      new SourceLocation(SourceType.FINALLY, 21),
      new SourceLocation(SourceType.SPACE, 28),
      new SourceLocation(SourceType.IDENTIFIER, 29),
      new SourceLocation(SourceType.EOF, 30)
    ]);
  });

  test('identifies `do` as a keyword', () => {
    checkLocations(stream('do foo'), [
      new SourceLocation(SourceType.DO, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  test('identifies `yield` as a keyword', () => {
    checkLocations(stream('yield foo'), [
      new SourceLocation(SourceType.YIELD, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  test('identifies `yield from` as keyword', () => {
    checkLocations(stream('yield  from foo'), [
      new SourceLocation(SourceType.YIELDFROM, 0),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  test('identifies `from` as an identifier without yield', () => {
    checkLocations(stream('from'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  test('identifies `extends` as a keyword', () => {
    checkLocations(stream('a extends b'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.EXTENDS, 2),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.IDENTIFIER, 10),
      new SourceLocation(SourceType.EOF, 11)
    ]);
  });

  test('identifies `throw` as a keyword', () => {
    checkLocations(stream('throw a'), [
      new SourceLocation(SourceType.THROW, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  test('handles normal import statements', () => {
    checkLocations(stream('import a from "b"'), [
      new SourceLocation(SourceType.IMPORT, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.SPACE, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.SPACE, 13),
      new SourceLocation(SourceType.DSTRING_START, 14),
      new SourceLocation(SourceType.STRING_CONTENT, 15),
      new SourceLocation(SourceType.DSTRING_END, 16),
      new SourceLocation(SourceType.EOF, 17)
    ]);
  });

  test('handles normal export statements', () => {
    checkLocations(stream('export default a'), [
      new SourceLocation(SourceType.EXPORT, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.DEFAULT, 7),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.IDENTIFIER, 15),
      new SourceLocation(SourceType.EOF, 16)
    ]);
  });

  test('handles herejs blocks', () => {
    checkLocations(stream('```\na + `b`\n```'), [
      new SourceLocation(SourceType.HEREJS, 0),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  test('handles inline js with escaped backticks', () => {
    checkLocations(stream('`a + \\`b\\``'), [
      new SourceLocation(SourceType.JS, 0),
      new SourceLocation(SourceType.EOF, 11)
    ]);
  });

  test('handles CSX with a simple interpolation', () => {
    checkLocations(stream('x = <div>Hello {name}</div>'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 8),
      new SourceLocation(SourceType.CSX_BODY, 9),
      new SourceLocation(SourceType.INTERPOLATION_START, 15),
      new SourceLocation(SourceType.IDENTIFIER, 16),
      new SourceLocation(SourceType.INTERPOLATION_END, 20),
      new SourceLocation(SourceType.CSX_BODY, 21),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 21),
      new SourceLocation(SourceType.IDENTIFIER, 23),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 26),
      new SourceLocation(SourceType.EOF, 27)
    ]);
  });

  test('handles nested CSX', () => {
    checkLocations(stream('x = <div>a<span>b</span>c</div>'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 8),
      new SourceLocation(SourceType.CSX_BODY, 9),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 10),
      new SourceLocation(SourceType.IDENTIFIER, 11),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 15),
      new SourceLocation(SourceType.CSX_BODY, 16),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 17),
      new SourceLocation(SourceType.IDENTIFIER, 19),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 23),
      new SourceLocation(SourceType.CSX_BODY, 24),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 25),
      new SourceLocation(SourceType.IDENTIFIER, 27),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 30),
      new SourceLocation(SourceType.EOF, 31)
    ]);
  });

  test('handles CSX properties with a greater-than sign', () => {
    checkLocations(stream('x = <Foo a={b>c}>test</Foo>'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.SPACE, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.OPERATOR, 10),
      new SourceLocation(SourceType.LBRACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.OPERATOR, 13),
      new SourceLocation(SourceType.IDENTIFIER, 14),
      new SourceLocation(SourceType.RBRACE, 15),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 16),
      new SourceLocation(SourceType.CSX_BODY, 17),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 21),
      new SourceLocation(SourceType.IDENTIFIER, 23),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 26),
      new SourceLocation(SourceType.EOF, 27)
    ]);
  });

  test('handles standalone self-closing CSX', () => {
    checkLocations(stream('render(<Foo a={b} />)'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.CALL_START, 6),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 7),
      new SourceLocation(SourceType.IDENTIFIER, 8),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.OPERATOR, 13),
      new SourceLocation(SourceType.LBRACE, 14),
      new SourceLocation(SourceType.IDENTIFIER, 15),
      new SourceLocation(SourceType.RBRACE, 16),
      new SourceLocation(SourceType.SPACE, 17),
      new SourceLocation(SourceType.CSX_SELF_CLOSING_TAG_END, 18),
      new SourceLocation(SourceType.CALL_END, 20),
      new SourceLocation(SourceType.EOF, 21)
    ]);
  });

  test('handles nested self-closing CSX', () => {
    checkLocations(stream('x = <div><span /></div>'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 8),
      new SourceLocation(SourceType.CSX_BODY, 9),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 9),
      new SourceLocation(SourceType.IDENTIFIER, 10),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.CSX_SELF_CLOSING_TAG_END, 15),
      new SourceLocation(SourceType.CSX_BODY, 17),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 17),
      new SourceLocation(SourceType.IDENTIFIER, 19),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 22),
      new SourceLocation(SourceType.EOF, 23)
    ]);
  });

  test('handles CSX fragments', () => {
    checkLocations(stream('x = <><span /></>'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 4),
      new SourceLocation(SourceType.CSX_OPEN_TAG_END, 5),
      new SourceLocation(SourceType.CSX_BODY, 6),
      new SourceLocation(SourceType.CSX_OPEN_TAG_START, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.CSX_SELF_CLOSING_TAG_END, 12),
      new SourceLocation(SourceType.CSX_BODY, 14),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_START, 14),
      new SourceLocation(SourceType.CSX_CLOSE_TAG_END, 16),
      new SourceLocation(SourceType.EOF, 17)
    ]);
  });

  test('handles non-CSX after a close-bracket', () => {
    checkLocations(stream('a[b]<c'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.LBRACKET, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.RBRACKET, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.IDENTIFIER, 5),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  test('does not ignore heregex comments when in CS1 mode', () => {
    checkLocations(stream('r = ///\na # #{b}c\n///'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.HEREGEXP_START, 4),
      new SourceLocation(SourceType.STRING_CONTENT, 7),
      new SourceLocation(SourceType.INTERPOLATION_START, 12),
      new SourceLocation(SourceType.IDENTIFIER, 14),
      new SourceLocation(SourceType.INTERPOLATION_END, 15),
      new SourceLocation(SourceType.STRING_CONTENT, 16),
      new SourceLocation(SourceType.HEREGEXP_END, 18),
      new SourceLocation(SourceType.EOF, 21)
    ]);
  });

  test('ignores heregex comments when in CS2 mode', () => {
    checkLocations(stream('r = ///\na # #{b}c\n///', 0, { useCS2: true }), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.HEREGEXP_START, 4),
      new SourceLocation(SourceType.STRING_CONTENT, 7),
      new SourceLocation(SourceType.HEREGEXP_COMMENT, 10),
      new SourceLocation(SourceType.STRING_CONTENT, 17),
      new SourceLocation(SourceType.HEREGEXP_END, 18),
      new SourceLocation(SourceType.EOF, 21)
    ]);
  });

  test('does not consider a hash in a heregex to start a comment unless it its preceded by whitespace', () => {
    checkLocations(stream('r = ///\n[a#]\n///', 0, { useCS2: true }), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.HEREGEXP_START, 4),
      new SourceLocation(SourceType.STRING_CONTENT, 7),
      new SourceLocation(SourceType.HEREGEXP_END, 13),
      new SourceLocation(SourceType.EOF, 16)
    ]);
  });

  test('does not infinite loop on incomplete string interpolations', () => {
    try {
      lex('a = "#{');
      throw new Error('Expected an exception to be thrown.');
    } catch (e) {
      expect(e.message.indexOf('unexpected EOF while in context INTERPOLATION') > -1).toBeTruthy();
    }
  });

  test('does not infinite loop on incomplete triple-quoted string interpolations', () => {
    try {
      lex('a = """#{');
      throw new Error('Expected an exception to be thrown.');
    } catch (e) {
      expect(e.message.indexOf('unexpected EOF while in context INTERPOLATION') > -1).toBeTruthy();
    }
  });
});
