import type { SourceType } from '../src/index.js';
import { SourceLocation, SourceToken, SourceTokenList } from '../src/index.js';
import { ok, deepEqual, strictEqual } from 'assert';
import lex, {
  stream,
  consumeStream,
  AT,
  DSTRING,
  EOF,
  INTERPOLATION_END,
  INTERPOLATION_START,
  JS,
  LBRACE,
  LBRACKET,
  LPAREN,
  NEWLINE,
  NORMAL,
  NUMBER,
  OPERATOR,
  RBRACE,
  RBRACKET,
  RPAREN,
  SEMICOLON,
  SPACE,
  SSTRING,
  TDSTRING,
  TSSTRING,
  WORD,
} from '../src/index.js';

describe('lex', () => {
  it('returns an empty list for an empty program', () =>
    deepEqual(lex('').toArray(), [])
  );

  it('builds a list of tokens omitting SPACE and EOF', () =>
    deepEqual(
      lex(`a + b`).toArray(),
      [
        new SourceToken(WORD, 0, 1),
        new SourceToken(OPERATOR, 2, 3),
        new SourceToken(WORD, 4, 5)
      ]
    )
  );

  it('returns a `SourceTokenList`', () =>
    ok(lex('') instanceof SourceTokenList)
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
});

describe('stream', () => {
  it('yields EOF when given an empty program', () =>
    checkStates(
      stream(''),
      [
        new SourceLocation(EOF, 0)
      ]
    )
  );

  it('identifies single-quoted strings', () =>
    checkStates(
      stream(`'abc'`),
      [
        new SourceLocation(SSTRING, 0),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies double-quoted strings', () =>
    checkStates(
      stream(`"abc"`),
      [
        new SourceLocation(DSTRING, 0),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies triple-single-quoted strings', () =>
    checkStates(
      stream(`'''abc'''`),
      [
        new SourceLocation(TSSTRING, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies triple-double-quoted strings', () =>
    checkStates(
      stream(`"""abc"""`),
      [
        new SourceLocation(TDSTRING, 0),
        new SourceLocation(EOF, 9)
      ]
    )
  );

  it('identifies words', () =>
    checkStates(
      stream(`a`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(EOF, 1)
      ]
    )
  );

  it('identifies whitespace', () =>
    checkStates(
      stream(`a b`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('transitions to INTERPOLATION_START at a string interpolation', () =>
    checkStates(
      stream(`"a#{b}c"`),
      [
        new SourceLocation(DSTRING, 0),
        new SourceLocation(INTERPOLATION_START, 2),
        new SourceLocation(WORD, 4),
        new SourceLocation(INTERPOLATION_END, 5),
        new SourceLocation(DSTRING, 6),
        new SourceLocation(EOF, 8)
      ]
    )
  );

  it('identifies integers as numbers', () =>
    checkStates(
      stream(`10`),
      [
        new SourceLocation(NUMBER, 0),
        new SourceLocation(EOF, 2)
      ]
    )
  );

  it('identifies + as an operator', () =>
    checkStates(
      stream(`a + b`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(OPERATOR, 2),
        new SourceLocation(SPACE, 3),
        new SourceLocation(WORD, 4),
        new SourceLocation(EOF, 5)
      ]
    )
  );

  it('identifies opening and closing parentheses', () =>
    checkStates(
      stream(`a(b())`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(LPAREN, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(LPAREN, 3),
        new SourceLocation(RPAREN, 4),
        new SourceLocation(RPAREN, 5),
        new SourceLocation(EOF, 6)
      ]
    )
  );

  it('identifies opening and closing braces', () =>
    checkStates(
      stream(`{ a: '{}' }`),
      [
        new SourceLocation(LBRACE, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(OPERATOR, 3),
        new SourceLocation(SPACE, 4),
        new SourceLocation(SSTRING, 5),
        new SourceLocation(SPACE, 9),
        new SourceLocation(RBRACE, 10),
        new SourceLocation(EOF, 11)
      ]
    )
  );

  it('identifies opening and closing brackets', () =>
    checkStates(
      stream(`[ a[1], b['f]['] ]`),
      [
        new SourceLocation(LBRACKET, 0),
        new SourceLocation(SPACE, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(LBRACKET, 3),
        new SourceLocation(NUMBER, 4),
        new SourceLocation(RBRACKET, 5),
        new SourceLocation(OPERATOR, 6),
        new SourceLocation(SPACE, 7),
        new SourceLocation(WORD, 8),
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
    checkStates(
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
    checkStates(
      stream(`a\nb`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(NEWLINE, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('identifies CRLF as a newline', () =>
    checkStates(
      stream(`a\r\nb`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(NEWLINE, 1),
        new SourceLocation(WORD, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  it('identifies CR as a newline', () =>
    checkStates(
      stream(`a\rb`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(NEWLINE, 1),
        new SourceLocation(WORD, 2),
        new SourceLocation(EOF, 3)
      ]
    )
  );

  it('identifies @', () =>
    checkStates(
      stream(`@a`),
      [
        new SourceLocation(AT, 0),
        new SourceLocation(WORD, 1),
        new SourceLocation(EOF, 2)
      ]
    )
  );

  it('identifies semicolons', () =>
    checkStates(
      stream(`a; b`),
      [
        new SourceLocation(WORD, 0),
        new SourceLocation(SEMICOLON, 1),
        new SourceLocation(SPACE, 2),
        new SourceLocation(WORD, 3),
        new SourceLocation(EOF, 4)
      ]
    )
  );

  function checkStates(stream: () => SourceLocation, expectedLocations: Array<[SourceType, number]>) {
    let actualLocations = consumeStream(stream);
    deepEqual(actualLocations, expectedLocations);
  }
});
