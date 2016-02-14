#!/usr/bin/env node -r babel-register

import lex from '../src/index.js';
import { readFileSync } from 'fs';

let args = process.argv.slice(2);

if (args.length > 0) {
  run(readFileSync(args[0], { encoding: 'utf8' }));
} else {
  let input = '';
  let stdin = process.stdin;
  stdin.setEncoding('utf8');
  stdin.on('readable', () => {
    let chunk = stdin.read();
    if (typeof chunk === 'string') {
      input += chunk;
    }
  });
  stdin.on('end', () => {
    run(input);
  });
}

function run(input) {
  let tokens = lex(input);
  let info = tokens.map(token => [
    token.type.name,
    token.start,
    input.slice(token.start, token.end)
  ]);
  console.log(JSON.stringify(info, null, 2));
}
