import lex, { consumeStream, stream, SourceType } from '../index';
import SourceLocation from '../SourceLocation';
import SourceToken from '../SourceToken';
import SourceTokenList from '../SourceTokenList';
import expect from './utils/customExpect';

function checkLocations(
  stream: () => SourceLocation,
  expectedLocations: Array<SourceLocation>
): void {
  let actualLocations = consumeStream(stream);
  expect(actualLocations).toEqualSourceLocations(expectedLocations);
}

describe('lexTest', () => {
  it('returns an empty list for an empty program', () => {
    expect('').toLexAs([]);
  });

  it('builds a list of tokens omitting SPACE and EOF', () => {
    expect(`a + b`).toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5)
    ]);
  });

  it('returns a `SourceTokenList`', () => {
    expect(lex('')).toBeInstanceOf(SourceTokenList);
  });

  it('turns string interpolations into cohesive string tokens', () => {
    expect(`"b#{c}d#{e}f"`).toLexAs([
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

  it('inserts padding in the correct places for a multiline string', () => {
    expect(`"  b#{c}  \n  d#{e}  \n  f  "`).toLexAs([
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

  it('adds empty template content tokens between adjacent interpolations', () => {
    expect(`"#{a}#{b}"`).toLexAs([
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

  it('turns triple-quoted string interpolations into string tokens', () => {
    expect(`"""\n  b#{c}\n  d#{e}f\n"""`).toLexAs([
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

  it('turns triple-quoted strings with leading interpolation into string tokens', () => {
    expect(`"""\n#{a}\n"""`).toLexAs([
      new SourceToken(SourceType.TDSTRING_START, 0, 3),
      new SourceToken(SourceType.STRING_PADDING, 3, 4),
      new SourceToken(SourceType.INTERPOLATION_START, 4, 6),
      new SourceToken(SourceType.IDENTIFIER, 6, 7),
      new SourceToken(SourceType.INTERPOLATION_END, 7, 8),
      new SourceToken(SourceType.STRING_PADDING, 8, 9),
      new SourceToken(SourceType.TDSTRING_END, 9, 12)
    ]);
  });

  it('handles nested interpolations', () => {
    expect(`"#{"#{a}"}"`).toLexAs([
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

  it('handles spaces in string interpolations appropriately', () => {
    expect(`"#{ a }"`).toLexAs([
      new SourceToken(SourceType.DSTRING_START, 0, 1),
      new SourceToken(SourceType.STRING_CONTENT, 1, 1),
      new SourceToken(SourceType.INTERPOLATION_START, 1, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5),
      new SourceToken(SourceType.INTERPOLATION_END, 6, 7),
      new SourceToken(SourceType.STRING_CONTENT, 7, 7),
      new SourceToken(SourceType.DSTRING_END, 7, 8)
    ]);
  });

  it('identifies `not instanceof` as a single operator', () => {
    expect('a not instanceof b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 16),
      new SourceToken(SourceType.IDENTIFIER, 17, 18)
    ]);
  });

  it('identifies `!instanceof` as a single operator', () => {
    expect('a !instanceof b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.OPERATOR, 2, 13),
      new SourceToken(SourceType.IDENTIFIER, 14, 15)
    ]);
  });

  it('identifies `not in` as a single operator', () => {
    expect('a not in b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 8),
      new SourceToken(SourceType.IDENTIFIER, 9, 10)
    ]);
  });

  it('identifies `!in` as a single operator', () => {
    expect('a !in b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 5),
      new SourceToken(SourceType.IDENTIFIER, 6, 7)
    ]);
  });

  it('identifies `not of` as a single operator', () => {
    expect('a not of b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 8),
      new SourceToken(SourceType.IDENTIFIER, 9, 10)
    ]);
  });

  it('identifies `!of` as a single operator', () => {
    expect('a !of b').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.RELATION, 2, 5),
      new SourceToken(SourceType.IDENTIFIER, 6, 7)
    ]);
  });

  it('identifies parentheses immediately after callable tokens as CALL_START', () => {
    expect(
      'a(super(@(b[0](), true&(false), b?())))'
    ).toLexAs([
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

  it('identifies parentheses immediately after a CALL_END as CALL_START', () => {
    expect('a()()').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.CALL_START, 1, 2),
      new SourceToken(SourceType.CALL_END, 2, 3),
      new SourceToken(SourceType.CALL_START, 3, 4),
      new SourceToken(SourceType.CALL_END, 4, 5)
    ]);
  });

  it('identifies `new` as a NEW token', () => {
    expect('new A').toLexAs([
      new SourceToken(SourceType.NEW, 0, 3),
      new SourceToken(SourceType.IDENTIFIER, 4, 5)
    ]);
  });

  it('identifies `new` as an IDENTIFIER in a property name', () => {
    expect('a\n  new: 5').toLexAs([
      new SourceToken(SourceType.IDENTIFIER, 0, 1),
      new SourceToken(SourceType.NEWLINE, 1, 2),
      new SourceToken(SourceType.IDENTIFIER, 4, 7),
      new SourceToken(SourceType.COLON, 7, 8),
      new SourceToken(SourceType.NUMBER, 9, 10)
    ]);
  });

  it('identifies closing interpolations inside objects', () => {
    expect(`{ id: "#{a}" }`).toLexAs([
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

  it('represents triple-quoted strings as a series of tokens to ignore the non-semantic parts', () => {
    expect(
      `foo = '''\n      abc\n\n      def\n      '''`
    ).toLexAs([
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

  it('@on() is a function call not and not a bool followed by parens', () => {
    expect(`@on()`).toLexAs([
      new SourceToken(SourceType.AT, 0, 1),
      new SourceToken(SourceType.IDENTIFIER, 1, 3),
      new SourceToken(SourceType.CALL_START, 3, 4),
      new SourceToken(SourceType.CALL_END, 4, 5)
    ]);
  });

  it('@ followed by a newline + `if` lexes as AT and IF (#175)', () => {
    expect('@\nif a then b').toLexAs([
      new SourceToken(SourceType.AT, 0, 1),
      new SourceToken(SourceType.NEWLINE, 1, 2),
      new SourceToken(SourceType.IF, 2, 4),
      new SourceToken(SourceType.IDENTIFIER, 5, 6),
      new SourceToken(SourceType.THEN, 7, 11),
      new SourceToken(SourceType.IDENTIFIER, 12, 13)
    ]);
  });
});

describe('sourceTokenListTest', () => {
  it('has a `startIndex` that represents the first token', () => {
    let list = lex('0');
    let token = list.tokenAtIndex(list.startIndex);
    expect(token).toStrictEqual(new SourceToken(SourceType.NUMBER, 0, 1));
  });

  it('has an `endIndex` that represents the virtual token after the last one', () => {
    let { startIndex, endIndex } = lex(''); // no tokens
    expect(endIndex).toBe(startIndex);
  });

  it('always returns the same index when advancing to the same offset', () => {
    let { startIndex, endIndex } = lex('a'); // one token
    expect(startIndex.next()).toBe(endIndex);
    expect(endIndex.previous()).toBe(startIndex);
  });

  it('allows getting a containing token index by source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenContainingSourceIndex(0)).toBe(oneIndex); // o
    expect(list.indexOfTokenContainingSourceIndex(1)).toBe(oneIndex); // n
    expect(list.indexOfTokenContainingSourceIndex(2)).toBe(oneIndex); // e
    expect(list.indexOfTokenContainingSourceIndex(3)).toBeNull(); //
    expect(list.indexOfTokenContainingSourceIndex(4)).toBe(plusIndex); // +
    expect(list.indexOfTokenContainingSourceIndex(5)).toBeNull(); //
    expect(list.indexOfTokenContainingSourceIndex(6)).toBe(twoIndex); // t
    expect(list.indexOfTokenContainingSourceIndex(7)).toBe(twoIndex); // w
    expect(list.indexOfTokenContainingSourceIndex(8)).toBe(twoIndex); // o
    expect(list.indexOfTokenContainingSourceIndex(9)).toBeNull(); // <EOF>
  });

  it('allows getting a nearby token index by source index', () => {
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

  it('allows getting a token index by its starting source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenStartingAtSourceIndex(0)).toBe(oneIndex); // o
    expect(list.indexOfTokenStartingAtSourceIndex(1)).toBeNull(); // n
    expect(list.indexOfTokenStartingAtSourceIndex(2)).toBeNull(); // e
    expect(list.indexOfTokenStartingAtSourceIndex(3)).toBeNull(); //
    expect(list.indexOfTokenStartingAtSourceIndex(4)).toBe(plusIndex); // +
    expect(list.indexOfTokenStartingAtSourceIndex(5)).toBeNull(); //
    expect(list.indexOfTokenStartingAtSourceIndex(6)).toBe(twoIndex); // t
    expect(list.indexOfTokenStartingAtSourceIndex(7)).toBeNull(); // w
    expect(list.indexOfTokenStartingAtSourceIndex(8)).toBeNull(); // o
    expect(list.indexOfTokenStartingAtSourceIndex(9)).toBeNull(); // <EOF>
  });

  it('allows getting a token index by its ending source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(list.indexOfTokenEndingAtSourceIndex(0)).toBeNull(); // o
    expect(list.indexOfTokenEndingAtSourceIndex(1)).toBeNull(); // n
    expect(list.indexOfTokenEndingAtSourceIndex(2)).toBeNull(); // e
    expect(list.indexOfTokenEndingAtSourceIndex(3)).toBe(oneIndex); //
    expect(list.indexOfTokenEndingAtSourceIndex(4)).toBeNull(); // +
    expect(list.indexOfTokenEndingAtSourceIndex(5)).toBe(plusIndex); //
    expect(list.indexOfTokenEndingAtSourceIndex(6)).toBeNull(); // t
    expect(list.indexOfTokenEndingAtSourceIndex(7)).toBeNull(); // w
    expect(list.indexOfTokenEndingAtSourceIndex(8)).toBeNull(); // o
    expect(list.indexOfTokenEndingAtSourceIndex(9)).toBe(twoIndex); // <EOF>
  });

  it('allows searching through a token index range by a predicate', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(
      list.indexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER
      )
    ).toBe(oneIndex);
    expect(
      list.indexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER,
        plusIndex
      )
    ).toBe(twoIndex);
    expect(
      list.indexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER,
        plusIndex,
        twoIndex
      )
    ).toBeNull();
  });

  it('allows searching backwards through a token index range by a predicate', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex && plusIndex.next();
    expect(
      list.lastIndexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER
      )
    ).toBe(twoIndex);
    expect(
      list.lastIndexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER,
        plusIndex
      )
    ).toBe(oneIndex);
    expect(
      list.lastIndexOfTokenMatchingPredicate(
        token => token.type === SourceType.IDENTIFIER,
        plusIndex,
        oneIndex
      )
    ).toBeNull();
  });

  it('allows getting the range of an interpolated string by source index', () => {
    let list = lex('a = "b#{c}d".length');
    let expectedStartIndex = list.startIndex.advance(2);
    let expectedStart =
      expectedStartIndex && list.tokenAtIndex(expectedStartIndex);
    let expectedEndIndex = list.startIndex.advance(9);
    let expectedEnd = expectedEndIndex && list.tokenAtIndex(expectedEndIndex);

    function assertNullAtSourceIndex(sourceIndex: number): void {
      let index = list.indexOfTokenContainingSourceIndex(sourceIndex);
      if (!index) {
        // No token contains this index, so of course it'll be null.
        return;
      }
      if (
        list.rangeOfInterpolatedStringTokensContainingTokenIndex(index) !== null
      ) {
        throw new Error(`expected no range for source index ${sourceIndex}`);
      }
    }

    function assertMatchesAtSourceIndex(sourceIndex: number): void {
      let index = list.indexOfTokenContainingSourceIndex(sourceIndex);
      let range =
        index &&
        list.rangeOfInterpolatedStringTokensContainingTokenIndex(index);

      if (!range) {
        throw new Error(
          `range should not be null for source index ${sourceIndex}`
        );
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

  it('can find the containing interpolated string starting at an interpolation boundary', () => {
    let list = lex('"#{a}b"');
    let expectedStart = list.startIndex;
    let expectedEnd = list.endIndex;

    // Go past DSTRING_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let interpolationStartToken =
      interpolationStart && list.tokenAtIndex(interpolationStart);

    if (!interpolationStart || !interpolationStartToken) {
      throw new Error(`unable to find interpolation start token`);
    }

    expect(interpolationStartToken).toHaveSourceType(
      SourceType.INTERPOLATION_START
    );

    let range = list.rangeOfInterpolatedStringTokensContainingTokenIndex(
      interpolationStart
    );
    expect(range && range[0]).toBe(expectedStart);
    expect(range && range[1]).toBe(expectedEnd);
  });

  it('can determine the interpolated string range with an interior string', () => {
    let list = lex('"#{"a"}"');

    expect(list.map(t => t.type)).toStrictEqual([
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
    let range =
      interpolationStart &&
      list.rangeOfInterpolatedStringTokensContainingTokenIndex(
        interpolationStart
      );

    if (!range) {
      throw new Error(`unable to determine range of interpolation start`);
    }

    expect(range[0]).toBe(list.startIndex);
    expect(range[1]).toBe(list.endIndex);
  });

  it('can determine the interpolated string range for a heregex', () => {
    let list = lex('///a#{b}c///');

    expect(list.map(t => t.type)).toStrictEqual([
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
    let range =
      interpolationStart &&
      list.rangeOfInterpolatedStringTokensContainingTokenIndex(
        interpolationStart
      );

    if (!range) {
      throw new Error(`unable to determine range of interpolation start`);
    }

    expect(range[0]).toBe(list.startIndex);
    expect(range[1]).toBe(list.endIndex);
  });

  it('allows comparing indexes', () => {
    let list = lex('a b');
    let { startIndex, endIndex } = list;

    expect(startIndex.compare(startIndex)).toStrictEqual(0);
    expect(startIndex.compare(endIndex)).toBeGreaterThan(0);
    expect(endIndex.compare(startIndex)).toBeLessThan(0);
    expect(startIndex.isBefore(endIndex)).toBe(true);
    expect(endIndex.isBefore(startIndex)).toBe(false);
    expect(endIndex.isAfter(startIndex)).toBe(true);
    expect(startIndex.isAfter(endIndex)).toBe(false);
  });

  it('handles heregex padding with comments when in CS2 mode', () => {
    let list = lex('r = ///\na # #{b}c\n d///', { useCS2: true });

    expect(list.map(t => t.type)).toStrictEqual([
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
  it('yields EOF when given an empty program', () => {
    checkLocations(stream(''), [new SourceLocation(SourceType.EOF, 0)]);
  });

  it('identifies single-quoted strings', () => {
    checkLocations(stream(`'abc'`), [
      new SourceLocation(SourceType.SSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.SSTRING_END, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies double-quoted strings', () => {
    checkLocations(stream(`"abc"`), [
      new SourceLocation(SourceType.DSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 1),
      new SourceLocation(SourceType.DSTRING_END, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies triple-single-quoted strings', () => {
    checkLocations(stream(`'''abc'''`), [
      new SourceLocation(SourceType.TSSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.TSSTRING_END, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies triple-double-quoted strings', () => {
    checkLocations(stream(`"""abc"""`), [
      new SourceLocation(SourceType.TDSTRING_START, 0),
      new SourceLocation(SourceType.STRING_CONTENT, 3),
      new SourceLocation(SourceType.TDSTRING_END, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies identifiers', () => {
    checkLocations(stream(`a`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.EOF, 1)
    ]);
  });

  it('identifies whitespace', () => {
    checkLocations(stream(`a b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  it('transitions to INTERPOLATION_START at a string interpolation', () => {
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

  it('handles nested string interpolation', () => {
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

  it('identifies integers as numbers', () => {
    checkLocations(stream(`10`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.EOF, 2)
    ]);
  });

  it('identifies floats as numbers', () => {
    checkLocations(stream(`1.23`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies floats with leading dots as numbers', () => {
    checkLocations(stream(`.23`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  it('identifies + as an operator', () => {
    checkLocations(stream(`a + b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies opening and closing parentheses', () => {
    checkLocations(stream(`(b)*2`), [
      new SourceLocation(SourceType.LPAREN, 0),
      new SourceLocation(SourceType.IDENTIFIER, 1),
      new SourceLocation(SourceType.RPAREN, 2),
      new SourceLocation(SourceType.OPERATOR, 3),
      new SourceLocation(SourceType.NUMBER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies opening and closing braces', () => {
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

  it('identifies opening and closing brackets', () => {
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

  it('identifies embedded JavaScript', () => {
    checkLocations(stream('`1` + 2'), [
      new SourceLocation(SourceType.JS, 0),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.OPERATOR, 4),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.NUMBER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  it('identifies LF as a newline', () => {
    checkLocations(stream(`a\nb`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.NEWLINE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  it('identifies @', () => {
    checkLocations(stream(`@a`), [
      new SourceLocation(SourceType.AT, 0),
      new SourceLocation(SourceType.IDENTIFIER, 1),
      new SourceLocation(SourceType.EOF, 2)
    ]);
  });

  it('identifies semicolons', () => {
    checkLocations(stream(`a; b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SEMICOLON, 1),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies adjacent operators as distinct', () => {
    checkLocations(stream(`a=++b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.OPERATOR, 1),
      new SourceLocation(SourceType.INCREMENT, 2),
      new SourceLocation(SourceType.IDENTIFIER, 4),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies comparison operators', () => {
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

  it('identifies dots', () => {
    checkLocations(stream(`a.b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.DOT, 1),
      new SourceLocation(SourceType.IDENTIFIER, 2),
      new SourceLocation(SourceType.EOF, 3)
    ]);
  });

  it('identifies block comments', () => {
    checkLocations(stream(`### a ###`), [
      new SourceLocation(SourceType.HERECOMMENT, 0),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('does not treat markdown-style headings as block comments', () => {
    checkLocations(stream(`#### FOO`), [
      new SourceLocation(SourceType.COMMENT, 0),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  it('treats `->` as a function', () => {
    checkLocations(stream(`-> a`), [
      new SourceLocation(SourceType.FUNCTION, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('treats `=>` as a function', () => {
    checkLocations(stream(`=> a`), [
      new SourceLocation(SourceType.FUNCTION, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies division as distinct from regular expressions', () => {
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

  it('identifies regular expressions as RHS in assignment', () => {
    checkLocations(stream(`a = /foo/`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 3),
      new SourceLocation(SourceType.REGEXP, 4),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies regular expressions at the start of the source', () => {
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

  it('identifies regular expressions with flags', () => {
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

  it('identifies all regex flags', () => {
    checkLocations(stream(`/a/gimuy`), [
      new SourceLocation(SourceType.REGEXP, 0),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  it('identifies regex-like division operations after an increment', () => {
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

  it('identifies regex-like division operations after a decrement', () => {
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

  it('identifies simple heregexes', () => {
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

  it('identifies heregexes with interpolations', () => {
    checkLocations(
      stream(`///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`),
      [
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
      ]
    );
  });

  it('computes the right padding for heregexes with interpolations', () => {
    expect(
      `///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`
    ).toLexAs([
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

  it('identifies keywords for conditionals', () => {
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

  it('identifies keywords for conditionals when followed by semicolons (decaffeinate/decaffeinate#718)', () => {
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

  it('identifies keywords for `unless` conditionals', () => {
    checkLocations(stream(`b unless a`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.IF, 2),
      new SourceLocation(SourceType.SPACE, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.EOF, 10)
    ]);
  });

  it('identifies keywords for switch', () => {
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

  it('identifies keywords for `for` loops', () => {
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

  it('identifies keywords for `while` loops', () => {
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

  it('identifies `class` as a keyword', () => {
    checkLocations(stream(`class A`), [
      new SourceLocation(SourceType.CLASS, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  it('identifies `return` as a keyword', () => {
    checkLocations(stream(`return 0`), [
      new SourceLocation(SourceType.RETURN, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.NUMBER, 7),
      new SourceLocation(SourceType.EOF, 8)
    ]);
  });

  it('identifies `break` and `continue` as keywords', () => {
    checkLocations(stream(`break;continue;`), [
      new SourceLocation(SourceType.BREAK, 0),
      new SourceLocation(SourceType.SEMICOLON, 5),
      new SourceLocation(SourceType.CONTINUE, 6),
      new SourceLocation(SourceType.SEMICOLON, 14),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  it('identifies object keys with keyword names as identifiers', () => {
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

  it('identifies identifiers with keyword names after dot access', () => {
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

  it('identifies identifiers with keyword names after dot access after a newline', () => {
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

  it('identifies identifiers with keyword names after dot access after a newline and indent', () => {
    checkLocations(
      stream(`s.
  else(0)`),
      [
        new SourceLocation(SourceType.IDENTIFIER, 0),
        new SourceLocation(SourceType.DOT, 1),
        new SourceLocation(SourceType.NEWLINE, 2),
        new SourceLocation(SourceType.SPACE, 3),
        new SourceLocation(SourceType.IDENTIFIER, 5),
        new SourceLocation(SourceType.CALL_START, 9),
        new SourceLocation(SourceType.NUMBER, 10),
        new SourceLocation(SourceType.CALL_END, 11),
        new SourceLocation(SourceType.EOF, 12)
      ]
    );
  });

  it('identifies identifiers with keyword names after proto access', () => {
    checkLocations(stream(`s::delete`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.PROTO, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies `null`', () => {
    checkLocations(stream(`null`), [
      new SourceLocation(SourceType.NULL, 0),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies `undefined`', () => {
    checkLocations(stream(`undefined`), [
      new SourceLocation(SourceType.UNDEFINED, 0),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies `this`', () => {
    checkLocations(stream(`this`), [
      new SourceLocation(SourceType.THIS, 0),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies `super`', () => {
    checkLocations(stream(`super`), [
      new SourceLocation(SourceType.SUPER, 0),
      new SourceLocation(SourceType.EOF, 5)
    ]);
  });

  it('identifies `delete`', () => {
    checkLocations(stream(`delete a.b`), [
      new SourceLocation(SourceType.DELETE, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.IDENTIFIER, 7),
      new SourceLocation(SourceType.DOT, 8),
      new SourceLocation(SourceType.IDENTIFIER, 9),
      new SourceLocation(SourceType.EOF, 10)
    ]);
  });

  it('identifies booleans', () => {
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

  it('identifies existence operators', () => {
    checkLocations(stream(`a?.b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.EXISTENCE, 1),
      new SourceLocation(SourceType.DOT, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies proto operators', () => {
    checkLocations(stream(`a::b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.PROTO, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies inclusive ranges', () => {
    checkLocations(stream(`a..b`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.RANGE, 1),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies line continuations', () => {
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

  it('identifies floor division', () => {
    checkLocations(stream(`7 // 3`), [
      new SourceLocation(SourceType.NUMBER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.NUMBER, 5),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  it('identifies compound assignment', () => {
    checkLocations(stream(`a ?= 3`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 4),
      new SourceLocation(SourceType.NUMBER, 5),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  it('identifies compound assignment with word operators', () => {
    checkLocations(stream(`a or= 3`), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.OPERATOR, 2),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.NUMBER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  it('identifies keyword operators', () => {
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

  it('identifies `in` and `of` as relations', () => {
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

  it('identifies keywords for `try/catch/finally`', () => {
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

  it('identifies `do` as a keyword', () => {
    checkLocations(stream('do foo'), [
      new SourceLocation(SourceType.DO, 0),
      new SourceLocation(SourceType.SPACE, 2),
      new SourceLocation(SourceType.IDENTIFIER, 3),
      new SourceLocation(SourceType.EOF, 6)
    ]);
  });

  it('identifies `yield` as a keyword', () => {
    checkLocations(stream('yield foo'), [
      new SourceLocation(SourceType.YIELD, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 9)
    ]);
  });

  it('identifies `yield from` as keyword', () => {
    checkLocations(stream('yield  from foo'), [
      new SourceLocation(SourceType.YIELDFROM, 0),
      new SourceLocation(SourceType.SPACE, 11),
      new SourceLocation(SourceType.IDENTIFIER, 12),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  it('identifies `from` as an identifier without yield', () => {
    checkLocations(stream('from'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.EOF, 4)
    ]);
  });

  it('identifies `extends` as a keyword', () => {
    checkLocations(stream('a extends b'), [
      new SourceLocation(SourceType.IDENTIFIER, 0),
      new SourceLocation(SourceType.SPACE, 1),
      new SourceLocation(SourceType.EXTENDS, 2),
      new SourceLocation(SourceType.SPACE, 9),
      new SourceLocation(SourceType.IDENTIFIER, 10),
      new SourceLocation(SourceType.EOF, 11)
    ]);
  });

  it('identifies `throw` as a keyword', () => {
    checkLocations(stream('throw a'), [
      new SourceLocation(SourceType.THROW, 0),
      new SourceLocation(SourceType.SPACE, 5),
      new SourceLocation(SourceType.IDENTIFIER, 6),
      new SourceLocation(SourceType.EOF, 7)
    ]);
  });

  it('handles normal import statements', () => {
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

  it('handles normal export statements', () => {
    checkLocations(stream('export default a'), [
      new SourceLocation(SourceType.EXPORT, 0),
      new SourceLocation(SourceType.SPACE, 6),
      new SourceLocation(SourceType.DEFAULT, 7),
      new SourceLocation(SourceType.SPACE, 14),
      new SourceLocation(SourceType.IDENTIFIER, 15),
      new SourceLocation(SourceType.EOF, 16)
    ]);
  });

  it('handles herejs blocks', () => {
    checkLocations(stream('```\na + `b`\n```'), [
      new SourceLocation(SourceType.HEREJS, 0),
      new SourceLocation(SourceType.EOF, 15)
    ]);
  });

  it('handles inline js with escaped backticks', () => {
    checkLocations(stream('`a + \\`b\\``'), [
      new SourceLocation(SourceType.JS, 0),
      new SourceLocation(SourceType.EOF, 11)
    ]);
  });

  it('handles CSX with a simple interpolation', () => {
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

  it('handles nested CSX', () => {
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

  it('handles CSX properties with a greater-than sign', () => {
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

  it('handles standalone self-closing CSX', () => {
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

  it('handles nested self-closing CSX', () => {
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

  it('handles CSX fragments', () => {
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

  it('handles non-CSX after a close-bracket', () => {
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

  it('does not ignore heregex comments when in CS1 mode', () => {
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

  it('ignores heregex comments when in CS2 mode', () => {
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

  it('does not consider a hash in a heregex to start a comment unless it its preceded by whitespace', () => {
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

  it('does not infinite loop on incomplete string interpolations', () => {
    expect(() => lex('a = "#{')).toThrow(
      'unexpected EOF while in context INTERPOLATION'
    );
  });

  it('does not infinite loop on incomplete triple-quoted string interpolations', () => {
    expect(() => lex('a = """#{')).toThrow(
      'unexpected EOF while in context INTERPOLATION'
    );
  });
});
