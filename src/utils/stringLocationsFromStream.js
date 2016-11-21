/* @flow */

import SourceLocation from '../SourceLocation.js';
import type BufferedStream from './BufferedStream.js';
import { DSTRING, EOF, INTERPOLATION_START, INTERPOLATION_END, STRING_START, STRING_CONTENT, STRING_END } from '../index.js';

export default function stringLocationsFromStream(stream: BufferedStream): Array<SourceLocation> {
  let startOfStringInterpolation = stream.hasNext(DSTRING, INTERPOLATION_START);

  if (!startOfStringInterpolation) {
    return [];
  }

  let result = [];
  let first = stream.shift();
  let quote = '"';

  result.push(
    // "abc#{def}ghi"
    // ^
    new SourceLocation(
      STRING_START,
      first.index
    ),
    // "abc#{def}ghi"
    //  ^
    new SourceLocation(
      STRING_CONTENT,
      first.index + quote.length
    )
  );

  let loc;
  let insideInterpolation = true;
  while (true) {
    if (insideInterpolation) {
      result.push(...stringLocationsFromStream(stream));
    }
    loc = stream.shift();
    if (loc.type === EOF) {
      throw new Error('Reached end of file before finding end of string interpolation.');
    } if (loc.type === INTERPOLATION_START) {
      insideInterpolation = true;
      result.push(
        new SourceLocation(
          loc.type,
          loc.index
        )
      );
    } else if (loc.type === INTERPOLATION_END) {
      insideInterpolation = false;
      result.push(new SourceLocation(
        loc.type,
        loc.index
      ));
    } else if (!insideInterpolation && loc.type === first.type) {
      let next = stream.peek();
      if (next.type === INTERPOLATION_START) {
        // "abc#{def}ghi#{jkl}mno"
        //           ^^^
        result.push(new SourceLocation(
          STRING_CONTENT,
          loc.index
        ));
      } else {
        // "abc#{def}ghi#{jkl}mno"
        //                    ^^^
        result.push(new SourceLocation(
          STRING_CONTENT,
          loc.index
        ));
        // "abc#{def}ghi#{jkl}mno"
        //                       ^
        result.push(new SourceLocation(
          STRING_END,
          next.index - quote.length
        ));
        break;
      }
    } else {
      // Anything inside interpolations.
      result.push(new SourceLocation(
        loc.type,
        loc.index
      ));
    }
  }

  return result;
}
