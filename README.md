# coffee-lex [![Build Status](https://travis-ci.org/decaffeinate/coffee-lex.svg?branch=master)](https://travis-ci.org/decaffeinate/coffee-lex) [![package version](https://badge.fury.io/js/coffee-lex.svg)](https://badge.fury.io/js/coffee-lex) [![Greenkeeper badge](https://badges.greenkeeper.io/decaffeinate/coffee-lex.svg)](https://greenkeeper.io/)

Stupid lexer for CoffeeScript.

## Install

```bash
# via yarn
$ yarn add coffee-lex
# via npm
$ npm install coffee-lex
```

## Usage

The main `lex` function simply returns a list of tokens:

```js
import lex, { SourceType } from 'coffee-lex';

let source = 'a?(b: c)';
let tokens = lex(source);

// Print tokens along with their source.
tokens.forEach(token =>
  console.log(
    SourceType[token.type],
    JSON.stringify(source.slice(token.start, token.end)),
    `${token.start}→${token.end}`
  )
);
// IDENTIFIER "a" 0→1
// EXISTENCE "?" 1→2
// CALL_START "(" 2→3
// IDENTIFIER "b" 3→4
// COLON ":" 4→5
// IDENTIFIER "c" 6→7
// CALL_END ")" 7→8
```

You can also get more fine control of what you'd like to lex by using the
`stream` function:

```js
import { stream, SourceType } from 'coffee-lex';

let source = 'a?(b: c)';
let step = stream(source);
let location;

do {
  location = step();
  console.log(location.index, SourceType[location.type]);
} while (location.type !== SourceType.EOF);
// 0 IDENTIFIER
// 1 EXISTENCE
// 2 CALL_START
// 3 IDENTIFIER
// 4 COLON
// 5 SPACE
// 6 IDENTIFIER
// 7 CALL_END
// 8 EOF
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
[ SourceToken { type: DSTRING_START, start: 0, end: 1 },
  SourceToken { type: STRING_CONTENT, start: 1, end: 2 },
  SourceToken { type: INTERPOLATION_START, start: 2, end: 4 },
  SourceToken { type: IDENTIFIER, start: 4, end: 5 },
  SourceToken { type: INTERPOLATION_END, start: 5, end: 6 },
  SourceToken { type: STRING_CONTENT, start: 6, end: 7 },
  SourceToken { type: DSTRING_END, start: 7, end: 8 } ]
```

## License

MIT
