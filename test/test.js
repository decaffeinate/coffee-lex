import SourceLocation from '../src/SourceLocation.js';
import SourceToken from '../src/SourceToken.js';
import SourceTokenList from '../src/SourceTokenList.js';
import { inspect } from 'util';
import { ok, deepEqual, strictEqual } from 'assert';
import lex, {
  stream,
  consumeStream,
  AT,
  BOOL,
  BREAK,
  CALL_END,
  CALL_START,
  CATCH,
  CLASS,
  COLON,
  COMMA,
  COMMENT,
  CONTINUATION,
  CONTINUE,
  DELETE,
  DO,
  DOT,
  DSTRING_END,
  DSTRING_START,
  ELSE,
  EOF,
  EXISTENCE,
  FINALLY,
  FOR,
  FUNCTION,
  HERECOMMENT,
  HEREGEXP_END,
  HEREGEXP_START,
  IDENTIFIER,
  IF,
  INTERPOLATION_END,
  INTERPOLATION_START,
  JS,
  LBRACE,
  LBRACKET,
  LOOP,
  LPAREN,
  NEWLINE,
  NULL,
  NUMBER,
  OPERATOR,
  OWN,
  PROTO,
  RANGE,
  RBRACE,
  RBRACKET,
  REGEXP,
  RELATION,
  RETURN,
  RPAREN,
  SEMICOLON,
  SPACE,
  SUPER,
  SWITCH,
  TDSTRING_END,
  TDSTRING_START,
  STRING_CONTENT,
  STRING_LINE_SEPARATOR,
  STRING_PADDING,
  SSTRING_END,
  SSTRING_START,
  THEN,
  THIS,
  TRY,
  TSSTRING_END,
  TSSTRING_START,
  UNDEFINED,
  WHEN,
  WHILE,
  YIELD,
  YIELDFROM,
} from '../src/index.js';

describe('lex', () => {
  it('returns an empty list for an empty program', () =>
    deepEqual(lex('').toArray(), [])
  );

  it('builds a list of tokens omitting SPACE and EOF', () =>
    deepEqual(
      lex(`a + b`).toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(OPERATOR, 2, 3),
        new SourceToken(IDENTIFIER, 4, 5)
      ]
    )
  );

  it('returns a `SourceTokenList`', () =>
    ok(lex('') instanceof SourceTokenList)
  );

  it('turns string interpolations into cohesive string tokens', () =>
    deepEqual(
      lex(`"b#{c}d#{e}f"`).toArray(),
      [
        new SourceToken(DSTRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 2),
        new SourceToken(INTERPOLATION_START, 2, 4),
        new SourceToken(IDENTIFIER, 4, 5),
        new SourceToken(INTERPOLATION_END, 5, 6),
        new SourceToken(STRING_CONTENT, 6, 7),
        new SourceToken(INTERPOLATION_START, 7, 9),
        new SourceToken(IDENTIFIER, 9, 10),
        new SourceToken(INTERPOLATION_END, 10, 11),
        new SourceToken(STRING_CONTENT, 11, 12),
        new SourceToken(DSTRING_END, 12, 13)
      ]
    )
  );

  it('inserts padding in the correct places for a multiline string', () =>
    deepEqual(
      lex(`"  b#{c}  \n  d#{e}  \n  f  "`).toArray(),
      [
        new SourceToken(DSTRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 4),
        new SourceToken(INTERPOLATION_START, 4, 6),
        new SourceToken(IDENTIFIER, 6, 7),
        new SourceToken(INTERPOLATION_END, 7, 8),
        new SourceToken(STRING_PADDING, 8, 10),
        new SourceToken(STRING_LINE_SEPARATOR, 10, 11),
        new SourceToken(STRING_PADDING, 11, 13),
        new SourceToken(STRING_CONTENT, 13, 14),
        new SourceToken(INTERPOLATION_START, 14, 16),
        new SourceToken(IDENTIFIER, 16, 17),
        new SourceToken(INTERPOLATION_END, 17, 18),
        new SourceToken(STRING_PADDING, 18, 20),
        new SourceToken(STRING_LINE_SEPARATOR, 20, 21),
        new SourceToken(STRING_PADDING, 21, 23),
        new SourceToken(STRING_CONTENT, 23, 26),
        new SourceToken(DSTRING_END, 26, 27)
      ]
    )
  );

  it('adds empty template content tokens between adjacent interpolations', () =>
    deepEqual(
      lex(`"#{a}#{b}"`).toArray(),
      [
        new SourceToken(DSTRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(IDENTIFIER, 3, 4),
        new SourceToken(INTERPOLATION_END, 4, 5),
        new SourceToken(STRING_CONTENT, 5, 5),
        new SourceToken(INTERPOLATION_START, 5, 7),
        new SourceToken(IDENTIFIER, 7, 8),
        new SourceToken(INTERPOLATION_END, 8, 9),
        new SourceToken(STRING_CONTENT, 9, 9),
        new SourceToken(DSTRING_END, 9, 10)
      ]
    )
  );

  it('turns triple-quoted string interpolations into string tokens', () =>
    deepEqual(
      lex(`"""\n  b#{c}\n  d#{e}f\n"""`).toArray(),
      [
        new SourceToken(TDSTRING_START, 0, 3),
        new SourceToken(STRING_CONTENT, 6, 7),
        new SourceToken(INTERPOLATION_START, 7, 9),
        new SourceToken(IDENTIFIER, 9, 10),
        new SourceToken(INTERPOLATION_END, 10, 11),
        new SourceToken(STRING_CONTENT, 11, 12),
        new SourceToken(STRING_CONTENT, 14, 15),
        new SourceToken(INTERPOLATION_START, 15, 17),
        new SourceToken(IDENTIFIER, 17, 18),
        new SourceToken(INTERPOLATION_END, 18, 19),
        new SourceToken(STRING_CONTENT, 19, 20),
        new SourceToken(TDSTRING_END, 21, 24)
      ]
    )
  );

  it('turns triple-quoted strings with leading interpolation into string tokens', () =>
    deepEqual(
      lex(`"""\n#{a}\n"""`).toArray(),
      [
        new SourceToken(TDSTRING_START, 0, 3),
        new SourceToken(STRING_CONTENT, 4, 4),
        new SourceToken(INTERPOLATION_START, 4, 6),
        new SourceToken(IDENTIFIER, 6, 7),
        new SourceToken(INTERPOLATION_END, 7, 8),
        new SourceToken(STRING_CONTENT, 8, 8),
        new SourceToken(TDSTRING_END, 9, 12)
      ]
    )
  );

  it('handles nested interpolations', () =>
    deepEqual(
      lex(`"#{"#{a}"}"`).toArray(),
      [
        new SourceToken(DSTRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(DSTRING_START, 3, 4),
        new SourceToken(STRING_CONTENT, 4, 4),
        new SourceToken(INTERPOLATION_START, 4, 6),
        new SourceToken(IDENTIFIER, 6, 7),
        new SourceToken(INTERPOLATION_END, 7, 8),
        new SourceToken(STRING_CONTENT, 8, 8),
        new SourceToken(DSTRING_END, 8, 9),
        new SourceToken(INTERPOLATION_END, 9, 10),
        new SourceToken(STRING_CONTENT, 10, 10),
        new SourceToken(DSTRING_END, 10, 11)
      ]
    )
  );

  it('handles spaces in string interpolations appropriately', () =>
    deepEqual(
      lex(`"#{ a }"`).toArray(),
      [
        new SourceToken(DSTRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(IDENTIFIER, 4, 5),
        new SourceToken(INTERPOLATION_END, 6, 7),
        new SourceToken(STRING_CONTENT, 7, 7),
        new SourceToken(DSTRING_END, 7, 8)
      ]
    )
  );

  it('identifies `not instanceof` as a single operator', () =>
    deepEqual(
      lex('a not instanceof b').toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(OPERATOR, 2, 16),
        new SourceToken(IDENTIFIER, 17, 18)
      ]
    )
  );

  it('identifies `not in` as a single operator', () =>
    deepEqual(
      lex('a not in b').toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(RELATION, 2, 8),
        new SourceToken(IDENTIFIER, 9, 10)
      ]
    )
  );

  it('identifies `not of` as a single operator', () =>
    deepEqual(
      lex('a not of b').toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(RELATION, 2, 8),
        new SourceToken(IDENTIFIER, 9, 10)
      ]
    )
  );

  it('identifies parentheses immediately after callable tokens as CALL_START', () =>
    deepEqual(
      lex('a(super(@(b[0](), true&(false), b?())))').toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(CALL_START, 1, 2),
        new SourceToken(SUPER, 2, 7),
        new SourceToken(CALL_START, 7, 8),
        new SourceToken(AT, 8, 9),
        new SourceToken(CALL_START, 9, 10),
        new SourceToken(IDENTIFIER, 10, 11),
        new SourceToken(LBRACKET, 11, 12),
        new SourceToken(NUMBER, 12, 13),
        new SourceToken(RBRACKET, 13, 14),
        new SourceToken(CALL_START, 14, 15),
        new SourceToken(CALL_END, 15, 16),
        new SourceToken(COMMA, 16, 17),
        new SourceToken(BOOL, 18, 22),
        new SourceToken(OPERATOR, 22, 23),
        new SourceToken(LPAREN, 23, 24),
        new SourceToken(BOOL, 24, 29),
        new SourceToken(RPAREN, 29, 30),
        new SourceToken(COMMA, 30, 31),
        new SourceToken(IDENTIFIER, 32, 33),
        new SourceToken(EXISTENCE, 33, 34),
        new SourceToken(CALL_START, 34, 35),
        new SourceToken(CALL_END, 35, 36),
        new SourceToken(CALL_END, 36, 37),
        new SourceToken(CALL_END, 37, 38),
        new SourceToken(CALL_END, 38, 39)
      ]
    )
  );

  it('identifies parentheses immediately after a CALL_END as CALL_START', () =>
    deepEqual(
      lex('a()()').toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 1),
        new SourceToken(CALL_START, 1, 2),
        new SourceToken(CALL_END, 2, 3),
        new SourceToken(CALL_START, 3, 4),
        new SourceToken(CALL_END, 4, 5)
      ]
    )
  );

  it('identifies closing interpolations inside objects', () =>
    deepEqual(
      lex(`{ id: "#{a}" }`).toArray(),
      [
        new SourceToken(LBRACE, 0, 1),
        new SourceToken(IDENTIFIER, 2, 4),
        new SourceToken(COLON, 4, 5),
        new SourceToken(DSTRING_START, 6, 7),
        new SourceToken(STRING_CONTENT, 7, 7),
        new SourceToken(INTERPOLATION_START, 7, 9),
        new SourceToken(IDENTIFIER, 9, 10),
        new SourceToken(INTERPOLATION_END, 10, 11),
        new SourceToken(STRING_CONTENT, 11, 11),
        new SourceToken(DSTRING_END, 11, 12),
        new SourceToken(RBRACE, 13, 14)
      ]
    )
  );

  it('represents triple-quoted strings as a series of tokens to ignore the non-semantic parts', () =>
    deepEqual(
      lex(`foo = '''\n      abc\n\n      def\n      '''`).toArray(),
      [
        new SourceToken(IDENTIFIER, 0, 3),
        new SourceToken(OPERATOR, 4, 5),
        new SourceToken(TSSTRING_START, 6, 9),
        new SourceToken(STRING_CONTENT, 16, 21),
        new SourceToken(STRING_CONTENT, 27, 30),
        new SourceToken(TSSTRING_END, 37, 40)
      ]
    )
  );

  it('@on() is a function call not and not a bool followed by parens', () =>
    deepEqual(
      lex(`@on()`).toArray(),
      [
        new SourceToken(AT, 0, 1),
        new SourceToken(IDENTIFIER, 1, 3),
        new SourceToken(CALL_START, 3, 4),
        new SourceToken(CALL_END, 4, 5),
        ]
    )
  );

});

describe('SourceTokenList', () => {
  it('has a `startIndex` that represents the first token', () => {
    let list = lex('0');
    let token = list.tokenAtIndex(list.startIndex);
    deepEqual(token, new SourceToken(NUMBER, 0, 1));
  });

  it('has an `endIndex` that represents the virtual token after the last one', () => {
    let { startIndex, endIndex } = lex(''); // no tokens
    strictEqual(endIndex, startIndex);
  });

  it('always returns the same index when advancing to the same offset', () => {
    let { startIndex, endIndex } = lex('a'); // one token
    strictEqual(startIndex.next(), endIndex);
    strictEqual(endIndex.previous(), startIndex);
  });

  it('allows getting a containing token index by source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex.next();
    strictEqual(list.indexOfTokenContainingSourceIndex(0), oneIndex);  // o
    strictEqual(list.indexOfTokenContainingSourceIndex(1), oneIndex);  // n
    strictEqual(list.indexOfTokenContainingSourceIndex(2), oneIndex);  // e
    strictEqual(list.indexOfTokenContainingSourceIndex(3), null);      //
    strictEqual(list.indexOfTokenContainingSourceIndex(4), plusIndex); // +
    strictEqual(list.indexOfTokenContainingSourceIndex(5), null);      //
    strictEqual(list.indexOfTokenContainingSourceIndex(6), twoIndex);  // t
    strictEqual(list.indexOfTokenContainingSourceIndex(7), twoIndex);  // w
    strictEqual(list.indexOfTokenContainingSourceIndex(8), twoIndex);  // o
    strictEqual(list.indexOfTokenContainingSourceIndex(9), null);      // <EOF>
  });

  it('allows getting a token index by its starting source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex.next();
    strictEqual(list.indexOfTokenStartingAtSourceIndex(0), oneIndex);  // o
    strictEqual(list.indexOfTokenStartingAtSourceIndex(1), null);      // n
    strictEqual(list.indexOfTokenStartingAtSourceIndex(2), null);      // e
    strictEqual(list.indexOfTokenStartingAtSourceIndex(3), null);      //
    strictEqual(list.indexOfTokenStartingAtSourceIndex(4), plusIndex); // +
    strictEqual(list.indexOfTokenStartingAtSourceIndex(5), null);      //
    strictEqual(list.indexOfTokenStartingAtSourceIndex(6), twoIndex);  // t
    strictEqual(list.indexOfTokenStartingAtSourceIndex(7), null);      // w
    strictEqual(list.indexOfTokenStartingAtSourceIndex(8), null);      // o
    strictEqual(list.indexOfTokenStartingAtSourceIndex(9), null);      // <EOF>
  });

  it('allows getting a token index by its ending source index', () => {
    let list = lex('one + two');
    let oneIndex = list.startIndex;
    let plusIndex = oneIndex.next();
    let twoIndex = plusIndex.next();
    strictEqual(list.indexOfTokenEndingAtSourceIndex(0), null);      // o
    strictEqual(list.indexOfTokenEndingAtSourceIndex(1), null);      // n
    strictEqual(list.indexOfTokenEndingAtSourceIndex(2), null);      // e
    strictEqual(list.indexOfTokenEndingAtSourceIndex(3), oneIndex);  //
    strictEqual(list.indexOfTokenEndingAtSourceIndex(4), null);      // +
    strictEqual(list.indexOfTokenEndingAtSourceIndex(5), plusIndex); //
    strictEqual(list.indexOfTokenEndingAtSourceIndex(6), null);      // t
    strictEqual(list.indexOfTokenEndingAtSourceIndex(7), null);      // w
    strictEqual(list.indexOfTokenEndingAtSourceIndex(8), null);      // o
    strictEqual(list.indexOfTokenEndingAtSourceIndex(9), twoIndex);  // <EOF>
  });

  it('allows getting the range of an interpolated string by source index', () => {
    let list = lex('a = "b#{c}d".length');
    let expectedStart = list.tokenAtIndex(list.startIndex.advance(2));
    let expectedEnd = list.tokenAtIndex(list.startIndex.advance(9));

    function assertNullAtSourceIndex(sourceIndex: number) {
      let index = list.indexOfTokenContainingSourceIndex(sourceIndex);
      if (!index) {
        // No token contains this index, so of course it'll be null.
        return;
      }
      strictEqual(
        list.rangeOfInterpolatedStringTokensContainingTokenIndex(
          index
        ),
        null,
        `expected no range for source index ${sourceIndex}`
      );
    }

    function assertMatchesAtSourceIndex(sourceIndex: number) {
      let range = list.rangeOfInterpolatedStringTokensContainingTokenIndex(
        list.indexOfTokenContainingSourceIndex(sourceIndex)
      );
      ok(range, `range should not be null for source index ${sourceIndex}`);
      let [ start, end ] = range;
      strictEqual(
        list.tokenAtIndex(start),
        expectedStart,
        `wrong start token for source index ${sourceIndex}`
      );
      strictEqual(
        list.tokenAtIndex(end),
        expectedEnd,
        `wrong end token for source index ${sourceIndex}`
      );
    }

    assertNullAtSourceIndex(0);     // a
    assertNullAtSourceIndex(1);     // <SPACE>
    assertNullAtSourceIndex(2);     // =
    assertNullAtSourceIndex(3);     // <SPACE>
    assertMatchesAtSourceIndex(4);  // "
    assertMatchesAtSourceIndex(5);  // b
    assertMatchesAtSourceIndex(6);  // #
    assertMatchesAtSourceIndex(7);  // {
    assertMatchesAtSourceIndex(8);  // c
    assertMatchesAtSourceIndex(9);  // }
    assertMatchesAtSourceIndex(10); // d
    assertMatchesAtSourceIndex(11); // "
    assertNullAtSourceIndex(12);    // .
    assertNullAtSourceIndex(13);    // l
    assertNullAtSourceIndex(14);    // e
    assertNullAtSourceIndex(15);    // n
    assertNullAtSourceIndex(16);    // g
    assertNullAtSourceIndex(17);    // t
    assertNullAtSourceIndex(18);    // h
    assertNullAtSourceIndex(19);    // <EOF>
  });

  it('can find the containing interpolated string starting at an interpolation boundary', () => {
    let list = lex('"#{a}b"');
    let expectedStart = list.startIndex;
    let expectedEnd = list.endIndex;

    // Go past DSTRING_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let interpolationStartToken = list.tokenAtIndex(interpolationStart);
    strictEqual(
      interpolationStartToken.type,
      INTERPOLATION_START,
      `expected ${inspect(interpolationStartToken)} to have type ` +
      INTERPOLATION_START.name
    );

    let range = list.rangeOfInterpolatedStringTokensContainingTokenIndex(
      interpolationStart
    );
    strictEqual(range && range[0], expectedStart);
    strictEqual(range && range[1], expectedEnd);
  });

  it('can determine the interpolated string range with an interior string', () => {
    let list = lex('"#{"a"}"');

    deepEqual(
      list.map(t => t.type),
      [
        DSTRING_START,
        STRING_CONTENT,
        INTERPOLATION_START,
        DSTRING_START,
        STRING_CONTENT,
        DSTRING_END,
        INTERPOLATION_END,
        STRING_CONTENT,
        DSTRING_END,
      ]
    );

    // Go past DSTRING_START & STRING_CONTENT.
    let interpolationStart = list.startIndex.advance(2);
    let range = list.rangeOfInterpolatedStringTokensContainingTokenIndex(
      interpolationStart
    );
    strictEqual(range[0], list.startIndex);
    strictEqual(range[1], list.endIndex);
  });

  it('allows comparing indexes', () => {
    let list = lex('a b');
    let { startIndex, endIndex } = list;

    ok(
      startIndex.compare(startIndex) === 0,
      `indexes should compare to themselves at 0`
    );

    ok(
      startIndex.compare(endIndex) > 0,
      `indexes should compare to those after them at > 0`
    );

    ok(
      endIndex.compare(startIndex) < 0,
      `indexes should compare to those after them at < 0`
    );

    ok(
      startIndex.isBefore(endIndex),
      `#isBefore should be true for indexes in order`
    );

    ok(
      !endIndex.isBefore(startIndex),
      `#isBefore should be false for indexes out of order`
    );

    ok(
      endIndex.isAfter(startIndex),
      `#isAfter should be true for indexes in order`
    );

    ok(
      !startIndex.isAfter(endIndex),
      `#isAfter should be false for indexes out of order`
    );
  });
});

describe('stream', () => {
  it('yields EOF when given an empty program', () =>
    checkLocations(
      stream(''),
      [
        new SourceLocation(EOF, 0)
      ]
    )
  );

  it('identifies single-quoted strings', () =>
    checkLocations(
      stream(`'abc'`),
      [
        new SourceLocation(SSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(SSTRING_END, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies double-quoted strings', () =>
    checkLocations(
      stream(`"abc"`),
      [
        new SourceLocation(DSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(DSTRING_END, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies triple-single-quoted strings', () =>
    checkLocations(
      stream(`'''abc'''`),
      [
        new SourceLocation(TSSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(TSSTRING_END, 6),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies triple-double-quoted strings', () =>
    checkLocations(
      stream(`"""abc"""`),
      [
        new SourceLocation(TDSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(TDSTRING_END, 6),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies identifiers', () =>
    checkLocations(
      stream(`a`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(EOF, 1)
      ]
    )
  );

  it('identifies whitespace', () =>
    checkLocations(
      stream(`a b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('transitions to INTERPOLATION_START at a string interpolation', () =>
    checkLocations(
      stream(`"a#{b}c"`),
      [
        new SourceLocation(DSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(INTERPOLATION_START, 2),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(INTERPOLATION_END, 5),
        new SourceLocation(STRING_CONTENT, 6),
        new SourceLocation(DSTRING_END, 7),
        new SourceLocation(EOF, 8)
      ]
    )
  );

  it('handles nested string interpolation', () =>
    checkLocations(
      stream(`"#{"#{}"}"`),
      [
        new SourceLocation(DSTRING_START, 0),
        new SourceLocation(STRING_CONTENT, 1),
        new SourceLocation(INTERPOLATION_START, 1),
        new SourceLocation(DSTRING_START, 3),
        new SourceLocation(STRING_CONTENT, 4),
        new SourceLocation(INTERPOLATION_START, 4),
        new SourceLocation(INTERPOLATION_END, 6),
        new SourceLocation(STRING_CONTENT, 7),
        new SourceLocation(DSTRING_END, 7),
        new SourceLocation(INTERPOLATION_END, 8),
        new SourceLocation(STRING_CONTENT, 9),
        new SourceLocation(DSTRING_END, 9),
        new SourceLocation(EOF, 10)
      ]
    )
  );

  it('identifies integers as numbers', () =>
    checkLocations(
      stream(`10`),
      [
        new SourceLocation(NUMBER, 0),
        new SourceLocation(EOF, 2)
      ]
    )
  );

  it('identifies + as an operator', () =>
    checkLocations(
      stream(`a + b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies opening and closing parentheses', () =>
    checkLocations(
      stream(`(b)*2`),
      [
        new SourceLocation(LPAREN, 0),
        new SourceLocation(IDENTIFIER, 1),
        new SourceLocation(RPAREN, 2),
        new SourceLocation(OPERATOR, 3),
        new SourceLocation(NUMBER, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies opening and closing braces', () =>
    checkLocations(
      stream(`{ a: '{}' }`),
      [
        new SourceLocation(LBRACE, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(COLON, 3),
        new SourceLocation(SPACE, 4),
        new SourceLocation(SSTRING_START, 5),
        new SourceLocation(STRING_CONTENT, 6),
        new SourceLocation(SSTRING_END, 8),
        new SourceLocation(SPACE, 9),
        new SourceLocation(RBRACE, 10),
        new SourceLocation(EOF, 11)
      ]
    )
  );

  it('identifies opening and closing brackets', () =>
    checkLocations(
      stream(`[ a[1], b['f]['] ]`),
      [
        new SourceLocation(LBRACKET, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(LBRACKET, 3),
        new SourceLocation(NUMBER, 4),
        new SourceLocation(RBRACKET, 5),
        new SourceLocation(COMMA, 6),
        new SourceLocation(SPACE, 7),
        new SourceLocation(IDENTIFIER, 8),
        new SourceLocation(LBRACKET, 9),
        new SourceLocation(SSTRING_START, 10),
        new SourceLocation(STRING_CONTENT, 11),
        new SourceLocation(SSTRING_END, 14),
        new SourceLocation(RBRACKET, 15),
        new SourceLocation(SPACE, 16),
        new SourceLocation(RBRACKET, 17),
        new SourceLocation(EOF, 18)
      ]
    )
  );

  it('identifies embedded JavaScript', () =>
    checkLocations(
      stream('`1` + 2'),
      [
        new SourceLocation(JS, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(OPERATOR, 4),
        new SourceLocation(SPACE, 5),
        new SourceLocation(NUMBER, 6),
        new SourceLocation(EOF, 7)
      ]
    )
  );

  it('identifies LF as a newline', () =>
    checkLocations(
      stream(`a\nb`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(NEWLINE, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('identifies @', () =>
    checkLocations(
      stream(`@a`),
      [
        new SourceLocation(AT, 0),
        new SourceLocation(IDENTIFIER, 1),
        new SourceLocation(EOF, 2)
      ]
    )
  );

  it('identifies semicolons', () =>
    checkLocations(
      stream(`a; b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SEMICOLON, 1),
        new SourceLocation(SPACE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies adjacent operators as distinct', () =>
    checkLocations(
      stream(`a=++b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(OPERATOR, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies comparison operators', () =>
    checkLocations(
      stream(`a < b <= c; a > b >= c`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(SPACE, 5),
        new SourceLocation(OPERATOR, 6),
        new SourceLocation(SPACE, 8),
        new SourceLocation(IDENTIFIER, 9),
        new SourceLocation(SEMICOLON, 10),
        new SourceLocation(SPACE, 11),
        new SourceLocation(IDENTIFIER, 12),
        new SourceLocation(SPACE, 13),
        new SourceLocation(OPERATOR, 14),
        new SourceLocation(SPACE, 15),
        new SourceLocation(IDENTIFIER, 16),
        new SourceLocation(SPACE, 17),
        new SourceLocation(OPERATOR, 18),
        new SourceLocation(SPACE, 20),
        new SourceLocation(IDENTIFIER, 21),
        new SourceLocation(EOF, 22)
      ]
    )
  );

  it('identifies dots', () =>
    checkLocations(
      stream(`a.b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(DOT, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('identifies block comments', () =>
    checkLocations(
      stream(`### a ###`),
      [
        new SourceLocation(HERECOMMENT, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('does not treat markdown-style headings as block comments', () =>
    checkLocations(
      stream(`#### FOO`),
      [
        new SourceLocation(COMMENT, 0),
        new SourceLocation(EOF, 8)
      ]
    )
  );

  it('treats `->` as a function', () =>
    checkLocations(
      stream(`-> a`),
      [
        new SourceLocation(FUNCTION, 0),
        new SourceLocation(SPACE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('treats `=>` as a function', () =>
    checkLocations(
      stream(`=> a`),
      [
        new SourceLocation(FUNCTION, 0),
        new SourceLocation(SPACE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies division as distinct from regular expressions', () =>
    checkLocations(
      stream(`1/0 + 2/4`),
      [
        new SourceLocation(NUMBER, 0),
        new SourceLocation(OPERATOR, 1),
        new SourceLocation(NUMBER, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(OPERATOR, 4),
        new SourceLocation(SPACE, 5),
        new SourceLocation(NUMBER, 6),
        new SourceLocation(OPERATOR, 7),
        new SourceLocation(NUMBER, 8),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies regular expressions as RHS in assignment', () =>
    checkLocations(
      stream(`a = /foo/`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(REGEXP, 4),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies regular expressions at the start of the source', () =>
    checkLocations(
      stream(`/foo/.test 'abc'`),
      [
        new SourceLocation(REGEXP, 0),
        new SourceLocation(DOT, 5),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(SPACE, 10),
        new SourceLocation(SSTRING_START, 11),
        new SourceLocation(STRING_CONTENT, 12),
        new SourceLocation(SSTRING_END, 15),
        new SourceLocation(EOF, 16)
      ]
    )
  );

  it('identifies simple heregexes', () =>
    checkLocations(
      stream(`///abc///g.test 'foo'`),
      [
        new SourceLocation(HEREGEXP_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(HEREGEXP_END, 6),
        new SourceLocation(DOT, 10),
        new SourceLocation(IDENTIFIER, 11),
        new SourceLocation(SPACE, 15),
        new SourceLocation(SSTRING_START, 16),
        new SourceLocation(STRING_CONTENT, 17),
        new SourceLocation(SSTRING_END, 20),
        new SourceLocation(EOF, 21)
      ]
    )
  );

  it('identifies heregexes with interpolations', () =>
    checkLocations(
      stream(`///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`),
      [
        new SourceLocation(HEREGEXP_START, 0),
        new SourceLocation(STRING_CONTENT, 3),
        new SourceLocation(INTERPOLATION_START, 10),
        new SourceLocation(IDENTIFIER, 12),
        new SourceLocation(INTERPOLATION_END, 13),
        new SourceLocation(STRING_CONTENT, 14),
        new SourceLocation(HEREGEXP_END, 39),
        new SourceLocation(DOT, 43),
        new SourceLocation(IDENTIFIER, 44),
        new SourceLocation(SPACE, 48),
        new SourceLocation(SSTRING_START, 49),
        new SourceLocation(STRING_CONTENT, 50),
        new SourceLocation(SSTRING_END, 53),
        new SourceLocation(EOF, 54)
      ]
    )
  );

  it('computes the right padding for heregexes with interpolations', () =>
    deepEqual(
      lex(`///abc\ndef#{g}  # this is a comment\nhij///g.test 'foo'`).toArray(),
      [
        new SourceToken(HEREGEXP_START, 0, 3),
        new SourceToken(STRING_CONTENT, 3, 6),
        new SourceToken(STRING_PADDING, 6, 7),
        new SourceToken(STRING_CONTENT, 7, 10),
        new SourceToken(INTERPOLATION_START, 10, 12),
        new SourceToken(IDENTIFIER, 12, 13),
        new SourceToken(INTERPOLATION_END, 13, 14),
        new SourceToken(STRING_PADDING, 14, 36),
        new SourceToken(STRING_CONTENT, 36, 39),
        new SourceToken(HEREGEXP_END, 39, 43),
        new SourceToken(DOT, 43, 44),
        new SourceToken(IDENTIFIER, 44, 48),
        new SourceToken(SSTRING_START, 49, 50),
        new SourceToken(STRING_CONTENT, 50, 53),
        new SourceToken(SSTRING_END, 53, 54),
      ]
    )
  );

  it('identifies keywords for conditionals', () =>
    checkLocations(
      stream(`if a then b else c`),
      [
        new SourceLocation(IF, 0),
        new SourceLocation(SPACE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(SPACE, 4),
        new SourceLocation(THEN, 5),
        new SourceLocation(SPACE, 9),
        new SourceLocation(IDENTIFIER, 10),
        new SourceLocation(SPACE, 11),
        new SourceLocation(ELSE, 12),
        new SourceLocation(SPACE, 16),
        new SourceLocation(IDENTIFIER, 17),
        new SourceLocation(EOF, 18)
      ]
    )
  );

  it('identifies keywords for `unless` conditionals', () =>
    checkLocations(
      stream(`b unless a`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(IF, 2),
        new SourceLocation(SPACE, 8),
        new SourceLocation(IDENTIFIER, 9),
        new SourceLocation(EOF, 10)
      ]
    )
  );

  it('identifies keywords for switch', () =>
    checkLocations(
      stream(`switch a\n  when b\n    c\n  else d`),
      [
        new SourceLocation(SWITCH, 0),
        new SourceLocation(SPACE, 6),
        new SourceLocation(IDENTIFIER, 7),
        new SourceLocation(NEWLINE, 8),
        new SourceLocation(SPACE, 9),
        new SourceLocation(WHEN, 11),
        new SourceLocation(SPACE, 15),
        new SourceLocation(IDENTIFIER, 16),
        new SourceLocation(NEWLINE, 17),
        new SourceLocation(SPACE, 18),
        new SourceLocation(IDENTIFIER, 22),
        new SourceLocation(NEWLINE, 23),
        new SourceLocation(SPACE, 24),
        new SourceLocation(ELSE, 26),
        new SourceLocation(SPACE, 30),
        new SourceLocation(IDENTIFIER, 31),
        new SourceLocation(EOF, 32)
      ]
    )
  );

  it('identifies keywords for `for` loops', () =>
    checkLocations(
      stream(`for own a in b then a`),
      [
        new SourceLocation(FOR, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(OWN, 4),
        new SourceLocation(SPACE, 7),
        new SourceLocation(IDENTIFIER, 8),
        new SourceLocation(SPACE, 9),
        new SourceLocation(RELATION, 10),
        new SourceLocation(SPACE, 12),
        new SourceLocation(IDENTIFIER, 13),
        new SourceLocation(SPACE, 14),
        new SourceLocation(THEN, 15),
        new SourceLocation(SPACE, 19),
        new SourceLocation(IDENTIFIER, 20),
        new SourceLocation(EOF, 21)
      ]
    )
  );

  it('identifies keywords for `while` loops', () =>
    checkLocations(
      stream(`loop then until a then while b then c`),
      [
        new SourceLocation(LOOP, 0),
        new SourceLocation(SPACE, 4),
        new SourceLocation(THEN, 5),
        new SourceLocation(SPACE, 9),
        new SourceLocation(WHILE, 10),
        new SourceLocation(SPACE, 15),
        new SourceLocation(IDENTIFIER, 16),
        new SourceLocation(SPACE, 17),
        new SourceLocation(THEN, 18),
        new SourceLocation(SPACE, 22),
        new SourceLocation(WHILE, 23),
        new SourceLocation(SPACE, 28),
        new SourceLocation(IDENTIFIER, 29),
        new SourceLocation(SPACE, 30),
        new SourceLocation(THEN, 31),
        new SourceLocation(SPACE, 35),
        new SourceLocation(IDENTIFIER, 36),
        new SourceLocation(EOF, 37)
      ]
    )
  );

  it('identifies `class` as a keyword', () =>
    checkLocations(
      stream(`class A`),
      [
        new SourceLocation(CLASS, 0),
        new SourceLocation(SPACE, 5),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(EOF, 7)
      ]
    )
  );

  it('identifies `return` as a keyword', () =>
    checkLocations(
      stream(`return 0`),
      [
        new SourceLocation(RETURN, 0),
        new SourceLocation(SPACE, 6),
        new SourceLocation(NUMBER, 7),
        new SourceLocation(EOF, 8)
      ]
    )
  );

  it('identifies `break` and `continue` as keywords', () =>
    checkLocations(
      stream(`break;continue;`),
      [
        new SourceLocation(BREAK, 0),
        new SourceLocation(SEMICOLON, 5),
        new SourceLocation(CONTINUE, 6),
        new SourceLocation(SEMICOLON, 14),
        new SourceLocation(EOF, 15)
      ]
    )
  );

  it('identifies identifiers with keyword names after dot access', () =>
    checkLocations(
      stream(`s.else(0)`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(DOT, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(CALL_START, 6),
        new SourceLocation(NUMBER, 7),
        new SourceLocation(CALL_END, 8),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies identifiers with keyword names after dot access after a newline', () =>
    checkLocations(
      stream(`s.
else(0)`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(DOT, 1),
        new SourceLocation(NEWLINE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(CALL_START, 7),
        new SourceLocation(NUMBER, 8),
        new SourceLocation(CALL_END, 9),
        new SourceLocation(EOF, 10)
      ]
    )
  );

  it('identifies identifiers with keyword names after proto access', () =>
    checkLocations(
      stream(`s::delete`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(PROTO, 1),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies `null`', () =>
    checkLocations(
      stream(`null`),
      [
        new SourceLocation(NULL, 0),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies `undefined`', () =>
    checkLocations(
      stream(`undefined`),
      [
        new SourceLocation(UNDEFINED, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies `this`', () =>
    checkLocations(
      stream(`this`),
      [
        new SourceLocation(THIS, 0),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies `super`', () =>
    checkLocations(
      stream(`super`),
      [
        new SourceLocation(SUPER, 0),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies `delete`', () =>
    checkLocations(
      stream(`delete a.b`),
      [
        new SourceLocation(DELETE, 0),
        new SourceLocation(SPACE, 6),
        new SourceLocation(IDENTIFIER, 7),
        new SourceLocation(DOT, 8),
        new SourceLocation(IDENTIFIER, 9),
        new SourceLocation(EOF, 10)
      ]
    )
  );

  it('identifies booleans', () =>
    checkLocations(
      stream(`true;false;yes;no;on;off`),
      [
        new SourceLocation(BOOL, 0),
        new SourceLocation(SEMICOLON, 4),
        new SourceLocation(BOOL, 5),
        new SourceLocation(SEMICOLON, 10),
        new SourceLocation(BOOL, 11),
        new SourceLocation(SEMICOLON, 14),
        new SourceLocation(BOOL, 15),
        new SourceLocation(SEMICOLON, 17),
        new SourceLocation(BOOL, 18),
        new SourceLocation(SEMICOLON, 20),
        new SourceLocation(BOOL, 21),
        new SourceLocation(EOF, 24)
      ]
    )
  );

  it('identifies existence operators', () =>
    checkLocations(
      stream(`a?.b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(EXISTENCE, 1),
        new SourceLocation(DOT, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies proto operators', () =>
    checkLocations(
      stream(`a::b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(PROTO, 1),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies inclusive ranges', () =>
    checkLocations(
      stream(`a..b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(RANGE, 1),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies line continuations', () =>
    checkLocations(
      stream(`a = \\\n  b`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(CONTINUATION, 4),
        new SourceLocation(NEWLINE, 5),
        new SourceLocation(SPACE, 6),
        new SourceLocation(IDENTIFIER, 8),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies floor division', () =>
    checkLocations(
      stream(`7 // 3`),
      [
        new SourceLocation(NUMBER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 4),
        new SourceLocation(NUMBER, 5),
        new SourceLocation(EOF, 6)
      ]
    )
  );

  it('identifies compound assignment', () =>
    checkLocations(
      stream(`a ?= 3`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 4),
        new SourceLocation(NUMBER, 5),
        new SourceLocation(EOF, 6)
      ]
    )
  );

  it('identifies compound assignment with word operators', () =>
    checkLocations(
      stream(`a or= 3`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 5),
        new SourceLocation(NUMBER, 6),
        new SourceLocation(EOF, 7)
      ]
    )
  );

  it('identifies keyword operators', () =>
    checkLocations(
      stream(`a and b is c or d`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 5),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(SPACE, 7),
        new SourceLocation(OPERATOR, 8),
        new SourceLocation(SPACE, 10),
        new SourceLocation(IDENTIFIER, 11),
        new SourceLocation(SPACE, 12),
        new SourceLocation(OPERATOR, 13),
        new SourceLocation(SPACE, 15),
        new SourceLocation(IDENTIFIER, 16),
        new SourceLocation(EOF, 17)
      ]
    )
  );

  it('identifies `in` and `of` as relations', () =>
    checkLocations(
      stream(`a in b or c of d`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(RELATION, 2),
        new SourceLocation(SPACE, 4),
        new SourceLocation(IDENTIFIER, 5),
        new SourceLocation(SPACE, 6),
        new SourceLocation(OPERATOR, 7),
        new SourceLocation(SPACE, 9),
        new SourceLocation(IDENTIFIER, 10),
        new SourceLocation(SPACE, 11),
        new SourceLocation(RELATION, 12),
        new SourceLocation(SPACE, 14),
        new SourceLocation(IDENTIFIER, 15),
        new SourceLocation(EOF, 16)
      ]
    )
  );

  it('identifies keywords for `try/catch/finally`', () =>
    checkLocations(
      stream('try a catch e then b finally c'),
      [
        new SourceLocation(TRY, 0),
        new SourceLocation(SPACE, 3),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(SPACE, 5),
        new SourceLocation(CATCH, 6),
        new SourceLocation(SPACE, 11),
        new SourceLocation(IDENTIFIER, 12),
        new SourceLocation(SPACE, 13),
        new SourceLocation(THEN, 14),
        new SourceLocation(SPACE, 18),
        new SourceLocation(IDENTIFIER, 19),
        new SourceLocation(SPACE, 20),
        new SourceLocation(FINALLY, 21),
        new SourceLocation(SPACE, 28),
        new SourceLocation(IDENTIFIER, 29),
        new SourceLocation(EOF, 30)
      ]
    )
  );

  it('identifies `do` as a keyword', () =>
    checkLocations(
      stream('do foo'),
      [
        new SourceLocation(DO, 0),
        new SourceLocation(SPACE, 2),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 6)
      ]
    )
  );

  it('identifies `yield` as a keyword', () =>
    checkLocations(
      stream('yield foo'),
      [
        new SourceLocation(YIELD, 0),
        new SourceLocation(SPACE, 5),
        new SourceLocation(IDENTIFIER, 6),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies `yield from` as keyword', () =>
    checkLocations(
      stream('yield  from foo'),
      [
        new SourceLocation(YIELDFROM, 0),
        new SourceLocation(SPACE, 11),
        new SourceLocation(IDENTIFIER, 12),
        new SourceLocation(EOF, 15)
      ]
    )
  );

  it('identifies `from` as an identifier without yield', () =>
    checkLocations(
      stream('from'),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('does not infinite loop on incomplete string interpolations', () => {
    try {
      lex('a = "#{');
      throw new Error('Expected an exception to be thrown.');
    } catch (e) {
      ok(e.message.indexOf('unexpected EOF while parsing a string') > -1);
    }
  });

  it('does not infinite loop on incomplete triple-quoted string interpolations', () => {
    try {
      lex('a = """#{');
      throw new Error('Expected an exception to be thrown.');
    } catch (e) {
      ok(e.message.indexOf('unexpected EOF while parsing a string') > -1);
    }
  });

  function checkLocations(stream: () => SourceLocation, expectedLocations: Array<SourceLocation>) {
    let actualLocations = consumeStream(stream);
    deepEqual(actualLocations, expectedLocations);
  }
});
