import SourceLocation from './SourceLocation.js';
import SourceToken from './SourceToken.js';
import SourceTokenList from './SourceTokenList.js';
import SourceType from './SourceType.js';

/**
 * Generate a list of tokens from CoffeeScript source code.
 */
export default function lex(source: string): SourceTokenList {
  let location;
  let previousLocation;
  let tokens = [];
  let pending = new BufferedStream(stream(source));
  do {
    pending.unshift(...stringLocationsFromStream(pending));
    location = pending.shift();
    if (previousLocation && previousLocation.type !== SPACE) {
      tokens.push(
        new SourceToken(
          previousLocation.type,
          previousLocation.index,
          location.index
        )
      );
    }
    previousLocation = location;
  } while (location.type !== EOF);
  return new SourceTokenList(tokens);
}

function stringLocationsFromStream(stream: BufferedStream): Array<SourceLocation> {
  let startOfStringInterpolation = (
    stream.hasNext(DSTRING, INTERPOLATION_START) ||
    stream.hasNext(TDSTRING, INTERPOLATION_START)
  );

  if (!startOfStringInterpolation) {
    return [];
  }

  let result = [];
  let first = stream.shift();
  let quote = first.type === DSTRING ? '"' : '"""';

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
    if (loc.type === INTERPOLATION_START) {
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
    } else if (loc.type === first.type) {
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

class BufferedStream {
  _getNextLocation: () => SourceLocation;
  pending: Array<SourceLocation> = [];

  constructor(stream: () => SourceLocation) {
    this._getNextLocation = stream;
  }

  shift(): SourceLocation {
    return this.pending.shift() || this._getNextLocation();
  }

  hasNext(...types: Array<SourceType>): boolean {
    let locationsToPutBack = [];
    let result = types.every(type => {
      let next = this.shift();
      locationsToPutBack.push(next);
      return next.type === type;
    });
    this.unshift(...locationsToPutBack);
    return result;
  }

  peek(): SourceLocation {
    let result = this.shift();
    this.unshift(result);
    return result;
  }

  unshift(...tokens: Array<SourceLocation>) {
    this.pending.unshift(...tokens);
  }
}

const REGEXP_FLAGS = ['i', 'g', 'm', 'y'];

export const AT = new SourceType('AT');
export const BOOL = new SourceType('BOOL');
export const COLON = new SourceType('COLON');
export const COMMA = new SourceType('COMMA');
export const COMMENT = new SourceType('COMMENT');
export const CONTINUATION = new SourceType('CONTINUATION');
export const DELETE = new SourceType('DELETE');
export const DOT = new SourceType('DOT');
export const DSTRING = new SourceType('DSTRING');
export const ELSE = new SourceType('ELSE');
export const EOF = new SourceType('EOF');
export const EXISTENCE = new SourceType('EXISTENCE');
export const FUNCTION = new SourceType('FUNCTION');
export const HERECOMMENT = new SourceType('HERECOMMENT');
export const HEREGEXP = new SourceType('HEREGEXP');
export const IF = new SourceType('IF');
export const INTERPOLATION_START = new SourceType('INTERPOLATION_START');
export const INTERPOLATION_END = new SourceType('INTERPOLATION_END');
export const JS = new SourceType('JS');
export const LBRACE = new SourceType('LBRACE');
export const LBRACKET = new SourceType('LBRACKET');
export const LPAREN = new SourceType('LPAREN');
export const NEWLINE = new SourceType('NEWLINE');
export const NORMAL = new SourceType('NORMAL');
export const NULL = new SourceType('NULL');
export const NUMBER = new SourceType('NUMBER');
export const OPERATOR = new SourceType('OPERATOR');
export const PROTO = new SourceType('PROTO');
export const RANGE = new SourceType('RANGE');
export const REGEXP = new SourceType('REGEXP');
export const RBRACE = new SourceType('RBRACE');
export const RBRACKET = new SourceType('RBRACKET');
export const RETURN = new SourceType('RETURN');
export const RPAREN = new SourceType('RPAREN');
export const SEMICOLON = new SourceType('SEMICOLON');
export const SPACE = new SourceType('SPACE');
export const SSTRING = new SourceType('SSTRING');
export const SUPER = new SourceType('SUPER');
export const SWITCH = new SourceType('SWITCH');
export const TDSTRING = new SourceType('TDSTRING');
export const STRING_CONTENT = new SourceType('STRING_CONTENT');
export const STRING_END = new SourceType('STRING_END');
export const STRING_START = new SourceType('STRING_START');
export const THEN = new SourceType('THEN');
export const THIS = new SourceType('THIS');
export const TSSTRING = new SourceType('TSSTRING');
export const UNDEFINED = new SourceType('UNDEFINED');
export const UNKNOWN = new SourceType('UNKNOWN');
export const WHEN = new SourceType('WHEN');
export const IDENTIFIER = new SourceType('IDENTIFIER');

/**
 * Borrowed, with tweaks, from CoffeeScript's lexer.coffee.
 */
const STRING = [SSTRING, DSTRING, TSSTRING, TDSTRING];
const CALLABLE = [
  IDENTIFIER, RPAREN, RBRACKET, EXISTENCE, AT, THIS, SUPER
];
const INDEXABLE = CALLABLE.concat([
  NUMBER, ...STRING, REGEXP,
  BOOL, NULL, UNDEFINED, RBRACE, PROTO
]);
const NOT_REGEXP = INDEXABLE; // .concat(['++', '--'])

const IDENTIFIER_PATTERN = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)/;
const NUMBER_PATTERN = /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;
const SPACE_PATTERN = /^[^\n\r\S]+/;
const REGEXP_PATTERN = /^\/(?!\/)((?:[^[\/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/;

const OPERATORS = [
  // equality
  '===', '==', '!==', '!=',
  // assignment
  '=',
  '+=', '-=', '/=', '*=', '%=', '%%=',
  '||=', '&&=', '^=',
  '?=',
  '|=', '&=', '~=', '<<=', '>>>=', '>>=',
  // increment/decrement
  '++', '--',
  // math
  '+', '-', '//', '/', '*', '%', '%%',
  // logical
  '||', '&&', '^', '!',
  // existence
  '?',
  // bitwise
  '|', '&', '~', '<<', '>>>', '>>',
  // comparison
  '<=', '<', '>=', '>',
  // prototype access
  '::',
];

/**
 * Provides a stream of source type change locations.
 */
export function stream(source: string, index: number=0): () => SourceLocation {
  let location = new SourceLocation(NORMAL, index);
  let interpolationStack = ([]: Array<SourceType>);
  let braceStack = [];
  let start = index;
  let locations = [];
  return function step(): SourceLocation {
    let lastLocation = location;
    let shouldStepAgain = false;

    do {
      start = index;
      if (index >= source.length) {
        setType(EOF);
      }

      switch (location.type) {
        case NORMAL:
        case SPACE:
        case IDENTIFIER:
        case DOT:
        case NUMBER:
        case OPERATOR:
        case COMMA:
        case LPAREN:
        case RPAREN:
        case LBRACE:
        case RBRACE:
        case LBRACKET:
        case RBRACKET:
        case NEWLINE:
        case COLON:
        case FUNCTION:
        case THIS:
        case AT:
        case SEMICOLON:
        case IF:
        case ELSE:
        case THEN:
        case BOOL:
        case NULL:
        case UNDEFINED:
        case REGEXP:
        case INTERPOLATION_START:
        case SUPER:
        case SWITCH:
        case WHEN:
        case EXISTENCE:
        case PROTO:
        case RANGE:
        case DELETE:
        case RETURN:
        case CONTINUATION:
          if (consume(SPACE_PATTERN)) {
            setType(SPACE);
          } else if (consumeNewline()) {
            setType(NEWLINE);
          } else if (consume('...') || consume('..')) {
            setType(RANGE);
          } else if (consume('.')) {
            setType(DOT);
          } else if (consume('"""')) {
            setType(TDSTRING);
          } else if (consume('"')) {
            setType(DSTRING);
          } else if (consume('\'\'\'')) {
            setType(TSSTRING);
          } else if (consume('\'')) {
            setType(SSTRING);
          } else if (consume(/^###[^#]/)) {
            setType(HERECOMMENT);
          } else if (consume('#')) {
            setType(COMMENT);
          } else if (consume('///')) {
            setType(HEREGEXP);
          } else if (consume('(')) {
            setType(LPAREN);
          } else if (consume(')')) {
            setType(RPAREN);
          } else if (consume('[')) {
            setType(LBRACKET);
          } else if (consume(']')) {
            setType(RBRACKET);
          } else if (consume('{')) {
            braceStack.push(start);
            setType(LBRACE);
          } else if (consume('}')) {
            if (braceStack.length === 0) {
              popInterpolation();
            } else {
              braceStack.pop();
              setType(RBRACE);
            }
          } else if (consumeAny(['->', '=>'])) {
            setType(FUNCTION);
          } else if (consumeRegexp()) {
            setType(REGEXP);
          } else if (consume('::')) {
            setType(PROTO);
          } else if (consume(':')) {
            setType(COLON);
          } else if (consume(',')) {
            setType(COMMA);
          } else if (consume('@')) {
            setType(AT);
          } else if (consume(';')) {
            setType(SEMICOLON);
          } else if (consume('`')) {
            setType(JS);
          } else if (consume(IDENTIFIER_PATTERN)) {
            let prev = locations[locations.length - 1];
            if (prev && (prev.type === DOT || prev.type === PROTO)) {
              setType(IDENTIFIER);
            } else {
              switch (consumed()) {
                case 'if':
                case 'unless':
                  setType(IF);
                  break;

                case 'else':
                  setType(ELSE);
                  break;

                case 'return':
                  setType(RETURN);
                  break;

                case 'then':
                  setType(THEN);
                  break;

                case 'switch':
                  setType(SWITCH);
                  break;

                case 'when':
                  setType(WHEN);
                  break;

                case 'null':
                  setType(NULL);
                  break;

                case 'undefined':
                  setType(UNDEFINED);
                  break;

                case 'this':
                  setType(THIS);
                  break;

                case 'super':
                  setType(SUPER);
                  break;

                case 'true':
                case 'false':
                case 'yes':
                case 'no':
                case 'on':
                case 'off':
                  setType(BOOL);
                  break;

                case 'and':
                case 'or':
                case 'not':
                case 'is':
                case 'isnt':
                case 'instanceof':
                  setType(OPERATOR);
                  break;

                case 'delete':
                  setType(DELETE);
                  break;

                default:
                  setType(IDENTIFIER);
              }
            }
          } else if (consume(NUMBER_PATTERN)) {
            setType(NUMBER);
          } else if (consumeAny(OPERATORS)) {
            if (consumed() === '?') {
              setType(EXISTENCE);
            } else {
              setType(OPERATOR);
            }
          } else if (consume('\\')) {
            setType(CONTINUATION);
          } else {
            setType(UNKNOWN);
          }
          break;

        case SSTRING:
          if (consume('\\')) {
            index++;
          } else if (consume('\'')) {
            setType(NORMAL);
          } else {
            index++;
          }
          break;

        case DSTRING:
          if (consume('\\')) {
            index++;
          } else if (consume('"')) {
            setType(NORMAL);
          } else if (consume('#{')) {
            pushInterpolation();
          } else {
            index++;
          }
          break;

        case COMMENT:
          if (consumeNewline()) {
            setType(NEWLINE);
          } else {
            index++;
          }
          break;

        case HERECOMMENT:
          if (consume('###')) {
            setType(NORMAL);
          } else {
            index++;
          }
          break;

        case TSSTRING:
          if (consume('\\')) {
            index++;
          } else if (consume('\'\'\'')) {
            setType(NORMAL);
          } else {
            index++;
          }
          break;

        case TDSTRING:
          if (consume('\\')) {
            index++;
          } else if (consume('"""')) {
            setType(NORMAL);
          } else if (consume('#{')) {
            pushInterpolation();
          } else {
            index++;
          }
          break;

        case INTERPOLATION_END:
          setType(interpolationStack.pop());
          break;

        case HEREGEXP:
          if (consume('\\')) {
            index++;
          } else if (consume('///')) {
            while (consumeAny(REGEXP_FLAGS));
            setType(NORMAL);
          } else {
            index++;
          }
          break;

        case JS:
          if (consume('\\')) {
            index++;
          } else if (consume('`')) {
            setType(NORMAL);
          } else {
            index++;
          }
          break;

        case EOF:
          if (braceStack.length !== 0) {
            throw new Error(
              `unexpected EOF while looking for '}' to match '{' ` +
              `at ${braceStack[braceStack.length - 1]}`
            );
          }
          break;

        case UNKNOWN:
          // ¯\_(ツ)_/¯
          index = source.length;
          break;

        default:
          throw new Error(`unknown source type at offset ${location.index}: ${location.type.name}`);
      }

      shouldStepAgain = (
        // Don't report on going back to "normal" source code.
        location.type === NORMAL ||
        // Don't report if nothing has changed, unless we're at the end.
        (
          location === lastLocation &&
          location.type !== EOF
        )
      );
    } while (shouldStepAgain);

    locations.push(location);
    return location;
  };

  function consumeAny(strings: Array<string>): boolean {
    return strings.some(string => consume(string));
  }

  function consume(value: string|RegExp): boolean {
    let matchData = match(value);
    if (matchData) {
      index += matchData[0].length;
      return true;
    } else {
      return false;
    }
  }

  function consumeNewline(): boolean {
    return consumeAny(['\n', '\r\n', '\r']);
  }

  function consumeRegexp(): boolean {
    let matchData = match(REGEXP_PATTERN);
    if (!matchData) {
      return false;
    }
    let [ regex, body, closed ] = matchData;
    let prev = locations[locations.length - 1];
    if (prev) {
      let spaced = false;
      if (prev.type === SPACE) {
        spaced = true;
        prev = locations[locations.length - 2];
      }
      if (spaced && CALLABLE.indexOf(prev.type) >= 0) {
        if (!closed || /^\/=?\s/.test(regex)) {
          return false;
        }
      } else if (NOT_REGEXP.indexOf(prev.type) >= 0) {
        return false;
      }
    }
    if (!closed) {
      throw new Error('missing / (unclosed regex)');
    }
    index += regex.length;
    return true;
  }

  function consumed() {
    return source.slice(start, index);
  }

  function setType(newType: SourceType) {
    location = new SourceLocation(newType, start);
  }

  function match(value: string|RegExp): ?Array<string> {
    if (typeof value === 'string') {
      let matches = source.slice(index, index + value.length) === value;
      return matches ? [value] : null;
    } else {
      return source.slice(index).match(value);
    }
  }

  function pushInterpolation() {
    interpolationStack.push(location.type);
    setType(INTERPOLATION_START);
  }

  function popInterpolation() {
    if (interpolationStack.length === 0) {
      throw new Error(`unexpected '}' found in string at ${index}: ${JSON.stringify(source)}`);
    }
    setType(INTERPOLATION_END);
  }
}

export function consumeStream(lexer: () => SourceLocation): Array<SourceLocation> {
  let result = [];
  let location;
  do {
    location = lexer();
    result.push(location);
  } while (location.type !== EOF);
  return result;
}
