import SourceLocation from '../src/SourceLocation.js';
import SourceToken from '../src/SourceToken.js';
import SourceTokenList from '../src/SourceTokenList.js';
import { ok, deepEqual, strictEqual } from 'assert';
import lex, {
  stream,
  consumeStream,
  AT,
  BOOL,
  COLON,
  COMMA,
  COMMENT,
  CONTINUATION,
  DELETE,
  DOT,
  DSTRING,
  ELSE,
  EOF,
  EXISTENCE,
  FUNCTION,
  HERECOMMENT,
  IDENTIFIER,
  IF,
  INTERPOLATION_END,
  INTERPOLATION_START,
  JS,
  LBRACE,
  LBRACKET,
  LPAREN,
  NEWLINE,
  NORMAL,
  NULL,
  NUMBER,
  OPERATOR,
  PROTO,
  RANGE,
  RBRACE,
  RBRACKET,
  REGEXP,
  RPAREN,
  SEMICOLON,
  SPACE,
  SSTRING,
  SUPER,
  SWITCH,
  TDSTRING,
  STRING_CONTENT,
  STRING_END,
  STRING_START,
  THEN,
  THIS,
  TSSTRING,
  UNDEFINED,
  WHEN,
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
        new SourceToken(STRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 2),
        new SourceToken(INTERPOLATION_START, 2, 4),
        new SourceToken(IDENTIFIER, 4, 5),
        new SourceToken(INTERPOLATION_END, 5, 6),
        new SourceToken(STRING_CONTENT, 6, 7),
        new SourceToken(INTERPOLATION_START, 7, 9),
        new SourceToken(IDENTIFIER, 9, 10),
        new SourceToken(INTERPOLATION_END, 10, 11),
        new SourceToken(STRING_CONTENT, 11, 12),
        new SourceToken(STRING_END, 12, 13)
      ]
    )
  );

  it('adds empty template content tokens between adjacent interpolations', () =>
    deepEqual(
      lex(`"#{a}#{b}"`).toArray(),
      [
        new SourceToken(STRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(IDENTIFIER, 3, 4),
        new SourceToken(INTERPOLATION_END, 4, 5),
        new SourceToken(STRING_CONTENT, 5, 5),
        new SourceToken(INTERPOLATION_START, 5, 7),
        new SourceToken(IDENTIFIER, 7, 8),
        new SourceToken(INTERPOLATION_END, 8, 9),
        new SourceToken(STRING_CONTENT, 9, 9),
        new SourceToken(STRING_END, 9, 10)
      ]
    )
  );

  it('turns triple-quoted string interpolations into string tokens', () =>
    deepEqual(
      lex(`"""b#{c}d#{e}f"""`).toArray(),
      [
        new SourceToken(STRING_START, 0, 3),
        new SourceToken(STRING_CONTENT, 3, 4),
        new SourceToken(INTERPOLATION_START, 4, 6),
        new SourceToken(IDENTIFIER, 6, 7),
        new SourceToken(INTERPOLATION_END, 7, 8),
        new SourceToken(STRING_CONTENT, 8, 9),
        new SourceToken(INTERPOLATION_START, 9, 11),
        new SourceToken(IDENTIFIER, 11, 12),
        new SourceToken(INTERPOLATION_END, 12, 13),
        new SourceToken(STRING_CONTENT, 13, 14),
        new SourceToken(STRING_END, 14, 17)
      ]
    )
  );

  it('handles nested interpolations', () =>
    deepEqual(
      lex(`"#{"#{a}"}"`).toArray(),
      [
        new SourceToken(STRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(STRING_START, 3, 4),
        new SourceToken(STRING_CONTENT, 4, 4),
        new SourceToken(INTERPOLATION_START, 4, 6),
        new SourceToken(IDENTIFIER, 6, 7),
        new SourceToken(INTERPOLATION_END, 7, 8),
        new SourceToken(STRING_CONTENT, 8, 8),
        new SourceToken(STRING_END, 8, 9),
        new SourceToken(INTERPOLATION_END, 9, 10),
        new SourceToken(STRING_CONTENT, 10, 10),
        new SourceToken(STRING_END, 10, 11)
      ]
    )
  );

  it('handles spaces in string interpolations appropriately', () =>
    deepEqual(
      lex(`"#{ a }"`).toArray(),
      [
        new SourceToken(STRING_START, 0, 1),
        new SourceToken(STRING_CONTENT, 1, 1),
        new SourceToken(INTERPOLATION_START, 1, 3),
        new SourceToken(IDENTIFIER, 4, 5),
        new SourceToken(INTERPOLATION_END, 6, 7),
        new SourceToken(STRING_CONTENT, 7, 7),
        new SourceToken(STRING_END, 7, 8)
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
        new SourceLocation(SSTRING, 0),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies double-quoted strings', () =>
    checkLocations(
      stream(`"abc"`),
      [
        new SourceLocation(DSTRING, 0),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies triple-single-quoted strings', () =>
    checkLocations(
      stream(`'''abc'''`),
      [
        new SourceLocation(TSSTRING, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies triple-double-quoted strings', () =>
    checkLocations(
      stream(`"""abc"""`),
      [
        new SourceLocation(TDSTRING, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies words', () =>
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
        new SourceLocation(DSTRING, 0),
        new SourceLocation(INTERPOLATION_START, 2),
        new SourceLocation(IDENTIFIER, 4),
        new SourceLocation(INTERPOLATION_END, 5),
        new SourceLocation(DSTRING, 6),
        new SourceLocation(EOF, 8)
      ]
    )
  );

  it('handles nested string interpolation', () =>
    checkLocations(
      stream(`"#{"#{}"}"`),
      [
        new SourceLocation(DSTRING, 0),
        new SourceLocation(INTERPOLATION_START, 1),
        new SourceLocation(DSTRING, 3),
        new SourceLocation(INTERPOLATION_START, 4),
        new SourceLocation(INTERPOLATION_END, 6),
        new SourceLocation(DSTRING, 7),
        new SourceLocation(INTERPOLATION_END, 8),
        new SourceLocation(DSTRING, 9),
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
      stream(`a(b())`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(LPAREN, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(LPAREN, 3),
        new SourceLocation(RPAREN, 4),
        new SourceLocation(RPAREN, 5),
        new SourceLocation(EOF, 6)
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
        new SourceLocation(SSTRING, 5),
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
        new SourceLocation(SSTRING, 10),
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

  it('identifies CRLF as a newline', () =>
    checkLocations(
      stream(`a\r\nb`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(NEWLINE, 1),
        new SourceLocation(IDENTIFIER, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies CR as a newline', () =>
    checkLocations(
      stream(`a\rb`),
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
        new SourceLocation(SSTRING, 11),
        new SourceLocation(EOF, 16)
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

  it('identifies identifiers with keyword names after dot access', () =>
    checkLocations(
      stream(`s.else(0)`),
      [
        new SourceLocation(IDENTIFIER, 0),
        new SourceLocation(DOT, 1),
        new SourceLocation(IDENTIFIER, 2),
        new SourceLocation(LPAREN, 6),
        new SourceLocation(NUMBER, 7),
        new SourceLocation(RPAREN, 8),
        new SourceLocation(EOF, 9)
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

  function checkLocations(stream: () => SourceLocation, expectedLocations: Array<SourceLocation>) {
    let actualLocations = consumeStream(stream);
    deepEqual(actualLocations, expectedLocations);
  }
});
