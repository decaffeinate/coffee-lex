# coffee-lex [![Build Status](https://travis-ci.org/decaffeinate/coffee-lex.svg?branch=master)](https://travis-ci.org/decaffeinate/coffee-lex)

Stupid lexer for CoffeeScript.

## Install

```
$ npm install [--save] coffee-lex
```

## Usage

The main `lex` function simply returns a list of tokens:

```js
import lex from 'coffee-lex';

let source = 'a?(b: c)';
let tokens = lex(source);

// Print each token object.
tokens.forEach(token => console.log(token));
// SourceToken { type: SourceType { name: 'IDENTIFIER' }, start: 0, end: 1 }
// SourceToken { type: SourceType { name: 'EXISTENCE' }, start: 1, end: 2 }
// SourceToken { type: SourceType { name: 'CALL_START' }, start: 2, end: 3 }
// SourceToken { type: SourceType { name: 'IDENTIFIER' }, start: 3, end: 4 }
// SourceToken { type: SourceType { name: 'COLON' }, start: 4, end: 5 }
// SourceToken { type: SourceType { name: 'IDENTIFIER' }, start: 6, end: 7 }
// SourceToken { type: SourceType { name: 'CALL_END' }, start: 7, end: 8 }

// Print tokens along with their source.
tokens.forEach(token =>
  console.log(
    token.type.name,
    JSON.stringify(source.slice(token.start, token.end))
  )
);
// IDENTIFIER "a"
// EXISTENCE "?"
// CALL_START "("
// IDENTIFIER "b"
// COLON ":"
// IDENTIFIER "c"
// CALL_END ")"
```

You can also get more fine control of what you'd like to lex by using the
`stream` function:

```js
import { stream, EOF } from 'coffee-lex';

let source = 'a?(b: c)';
let step = stream(source);
let location;

do {
  location = step();
  console.log(location);
} while (location.type !== EOF);
// SourceLocation { type: SourceType { name: 'IDENTIFIER' }, index: 0 }
// SourceLocation { type: SourceType { name: 'EXISTENCE' }, index: 1 }
// SourceLocation { type: SourceType { name: 'CALL_START' }, index: 2 }
// SourceLocation { type: SourceType { name: 'IDENTIFIER' }, index: 3 }
// SourceLocation { type: SourceType { name: 'COLON' }, index: 4 }
// SourceLocation { type: SourceType { name: 'SPACE' }, index: 5 }
// SourceLocation { type: SourceType { name: 'IDENTIFIER' }, index: 6 }
// SourceLocation { type: SourceType { name: 'CALL_END' }, index: 7 }
// SourceLocation { type: SourceType { name: 'EOF' }, index: 8 }
```

This function not only lets you control how far into the source you'd like to
go, it also gives you information about source code that wouldn't become part of
a token, such as spaces.

Note that the input source code should have only UNIX line endings (LF). If you
want to process a file with Windows line endings (CRLF), you should convert to
UNIX line endings first, then use coffee-lex, then convert back if necessary.

## Why?

The official CoffeeScript lexer does a lot of pre-processing, even with
`rewrite: false`. That makes it good for building an AST, but bad for
identifying parts of the source code that aren't part of the final AST, such as
the location of operators. One good example of this is string interpolation. The
official lexer turns it into a series of string tokens separated by (virtual)
`+` tokens, but they have no reality in the original source code. Here's what
the official lexer generates for `"a#{b}c"`:

```js
[ [ 'STRING_START',
    '(',
    { first_line: 0, first_column: 0, last_line: 0, last_column: 0 },
    origin: [ 'STRING', null, [Object] ] ],
  [ 'STRING',
    '"a"',
    { first_line: 0, first_column: 0, last_line: 0, last_column: 1 } ],
  [ '+',
    '+',
    { first_line: 0, first_column: 3, last_line: 0, last_column: 3 } ],
  [ '(',
    '(',
    { first_line: 0, first_column: 3, last_line: 0, last_column: 3 } ],
  [ 'IDENTIFIER',
    'b',
    { first_line: 0, first_column: 4, last_line: 0, last_column: 4 },
    variable: true ],
  [ ')',
    ')',
    { first_line: 0, first_column: 5, last_line: 0, last_column: 5 },
    origin: [ '', 'end of interpolation', [Object] ] ],
  [ '+',
    '+',
    { first_line: 0, first_column: 6, last_line: 0, last_column: 6 } ],
  [ 'STRING',
    '"c"',
    { first_line: 0, first_column: 6, last_line: 0, last_column: 7 } ],
  [ 'STRING_END',
    ')',
    { first_line: 0, first_column: 7, last_line: 0, last_column: 7 } ],
  [ 'TERMINATOR',
    '\n',
    { first_line: 0, first_column: 8, last_line: 0, last_column: 8 } ] ]
```

Here's what coffee-lex generates for the same source:

```js
[ SourceToken { type: SourceType { name: 'DSTRING_START' }, start: 0, end: 1 },
  SourceToken { type: SourceType { name: 'STRING_CONTENT' }, start: 1, end: 2 },
  SourceToken {
    type: SourceType { name: 'INTERPOLATION_START' },
    start: 2,
    end: 4 },
  SourceToken { type: SourceType { name: 'IDENTIFIER' }, start: 4, end: 5 },
  SourceToken {
    type: SourceType { name: 'INTERPOLATION_END' },
    start: 5,
    end: 6 },
  SourceToken { type: SourceType { name: 'STRING_CONTENT' }, start: 6, end: 7 },
  SourceToken { type: SourceType { name: 'DSTRING_END' }, start: 7, end: 8 } ]
```

## License

MIT
