#!/usr/bin/env node -r babel-register

import { stream, consumeStream } from '../src/index.js';

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
  let locations = consumeStream(stream(input));
  let info = locations.map((location, i) => {
    let nextLocation = locations[i + 1];
    if (nextLocation) {
      return [location.type.name, location.index, input.slice(location.index, nextLocation.index)];
    } else {
      return [location.type.name, location.index];
    }
  });
  console.log(JSON.stringify(info, null, 2));
});
