/* @flow */

import BufferedStream from './utils/BufferedStream.js';
import SourceLocation from './SourceLocation.js';
import SourceToken from './SourceToken.js';
import SourceTokenList from './SourceTokenList.js';
import SourceType from './SourceType.js';
import calculateNormalStringPadding from './utils/calculateNormalStringPadding.js';
import calculateHeregexpPadding from './utils/calculateHeregexpPadding.js';
import tripleQuotedStringSourceLocations from './utils/tripleQuotedStringSourceLocations.js';

/**
 * Generate a list of tokens from CoffeeScript source code.
 */
export default function lex(source: string): SourceTokenList {
  let location;
  let previousLocation;
  let tokens = [];
  let pending = new BufferedStream(stream(source));
  do {
    pending.unshift(
      ...calculateNormalStringPadding(source, pending)
    );
    pending.unshift(
      ...tripleQuotedStringSourceLocations(source, pending)
    );
    pending.unshift(
      ...calculateHeregexpPadding(source, pending)
    );
    pending.unshift(
      ...combinedLocationsForMultiwordOperators(pending, source)
    );
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

function combinedLocationsForMultiwordOperators(stream: BufferedStream, source: string): Array<SourceLocation> {
  if (!stream.hasNext(OPERATOR, SPACE, OPERATOR) && !stream.hasNext(OPERATOR, SPACE, RELATION)) {
    return [];
  }

  let not = stream.shift();
  let space = stream.shift();
  let operator = stream.shift();
  let next = stream.peek();

  if (source.slice(not.index, space.index) === 'not') {
    let op = source.slice(operator.index, next.index);
    switch (op) {
      case 'in':
      case 'of':
        return [
          new SourceLocation(
            RELATION,
            not.index
          )
        ];

      case 'instanceof':
        return [
          new SourceLocation(
            OPERATOR,
            not.index
          )
        ];
    }
  }

  // Doesn't match, so put them back.
  return [not, space, operator];
}


const REGEXP_FLAGS = ['i', 'g', 'm', 'y'];

export const AT = new SourceType('AT');
export const BOOL = new SourceType('BOOL');
export const BREAK = new SourceType('BREAK');
export const CATCH = new SourceType('CATCH');
export const CALL_END = new SourceType('CALL_END');
export const CALL_START = new SourceType('CALL_START');
export const CLASS = new SourceType('CLASS');
export const COLON = new SourceType('COLON');
export const COMMA = new SourceType('COMMA');
export const COMMENT = new SourceType('COMMENT');
export const CONTINUATION = new SourceType('CONTINUATION');
export const CONTINUE = new SourceType('CONTINUE');
export const DELETE = new SourceType('DELETE');
export const DO = new SourceType('DO');
export const DOT = new SourceType('DOT');
export const DSTRING_START = new SourceType('DSTRING_START');
export const DSTRING_END = new SourceType('DSTRING_END');
export const ELSE = new SourceType('ELSE');
export const EOF = new SourceType('EOF');
export const EXISTENCE = new SourceType('EXISTENCE');
export const FINALLY = new SourceType('FINALLY');
export const FOR = new SourceType('FOR');
export const FUNCTION = new SourceType('FUNCTION');
export const HERECOMMENT = new SourceType('HERECOMMENT');
export const HEREGEXP_START = new SourceType('HEREGEXP_START');
export const HEREGEXP_END = new SourceType('HEREGEXP_END');
export const IF = new SourceType('IF');
export const INTERPOLATION_START = new SourceType('INTERPOLATION_START');
export const INTERPOLATION_END = new SourceType('INTERPOLATION_END');
export const JS = new SourceType('JS');
export const LBRACE = new SourceType('LBRACE');
export const LBRACKET = new SourceType('LBRACKET');
export const LOOP = new SourceType('LOOP');
export const LPAREN = new SourceType('LPAREN');
export const NEWLINE = new SourceType('NEWLINE');
export const NORMAL = new SourceType('NORMAL');
export const NULL = new SourceType('NULL');
export const NUMBER = new SourceType('NUMBER');
export const OPERATOR = new SourceType('OPERATOR');
export const OWN = new SourceType('OWN');
export const PROTO = new SourceType('PROTO');
export const RANGE = new SourceType('RANGE');
export const REGEXP = new SourceType('REGEXP');
export const RBRACE = new SourceType('RBRACE');
export const RBRACKET = new SourceType('RBRACKET');
export const RELATION = new SourceType('RELATION');
export const RETURN = new SourceType('RETURN');
export const RPAREN = new SourceType('RPAREN');
export const SEMICOLON = new SourceType('SEMICOLON');
export const SPACE = new SourceType('SPACE');
export const SUPER = new SourceType('SUPER');
export const SWITCH = new SourceType('SWITCH');
export const SSTRING_START = new SourceType('SSTRING_START');
export const SSTRING_END = new SourceType('SSTRING_END');
export const STRING_CONTENT = new SourceType('STRING_CONTENT');
export const STRING_LINE_SEPARATOR = new SourceType('STRING_LINE_SEPARATOR');
export const STRING_PADDING = new SourceType('STRING_PADDING');
export const TDSTRING_START = new SourceType('TDSTRING_START');
export const TDSTRING_END = new SourceType('TDSTRING_END');
export const THEN = new SourceType('THEN');
export const THIS = new SourceType('THIS');
export const TRY = new SourceType('TRY');
export const TSSTRING_START = new SourceType('TSSTRING_START');
export const TSSTRING_END = new SourceType('TSSTRING_END');
export const UNDEFINED = new SourceType('UNDEFINED');
export const UNKNOWN = new SourceType('UNKNOWN');
export const WHEN = new SourceType('WHEN');
export const WHILE = new SourceType('WHILE');
export const IDENTIFIER = new SourceType('IDENTIFIER');
export const YIELD = new SourceType('YIELD');
export const YIELDFROM = new SourceType('YIELDFROM');

/**
 * Borrowed, with tweaks, from CoffeeScript's lexer.coffee.
 */
const STRING = [SSTRING_END, DSTRING_END, TSSTRING_END, TDSTRING_END];
const CALLABLE = [
  IDENTIFIER, CALL_END, RPAREN, RBRACKET, EXISTENCE, AT, THIS, SUPER
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
const YIELDFROM_PATTERN = /^yield[^\n\r\S]+from/;

const OPERATORS = [
  // equality
  '===', '==', '!==', '!=',
  // assignment
  '=',
  '+=', '-=', '/=', '*=', '%=', '%%=',
  '||=', '&&=', '^=', 'or=', 'and=',
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
  let interpolationStack = ([]: Array<{ type: SourceType, braces: Array<number> }>);
  let braceStack = [];
  let parenStack = [];
  let stringStack = [];
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
        case CALL_START:
        case CALL_END:
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
        case FOR:
        case OWN:
        case WHILE:
        case BOOL:
        case NULL:
        case UNDEFINED:
        case REGEXP:
        case SSTRING_END:
        case DSTRING_END:
        case TSSTRING_END:
        case TDSTRING_END:
        case INTERPOLATION_START:
        case SUPER:
        case TRY:
        case CATCH:
        case FINALLY:
        case SWITCH:
        case WHEN:
        case BREAK:
        case CONTINUE:
        case EXISTENCE:
        case CLASS:
        case PROTO:
        case RANGE:
        case DELETE:
        case RETURN:
        case RELATION:
        case LOOP:
        case DO:
        case YIELD:
        case YIELDFROM:
        case CONTINUATION:
          if (consume(SPACE_PATTERN)) {
            setType(SPACE);
          } else if (consume('\n')) {
            setType(NEWLINE);
          } else if (consume('...') || consume('..')) {
            setType(RANGE);
          } else if (consume('.')) {
            setType(DOT);
          } else if (consume('"""')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '"""',
              endSourceType: TDSTRING_END,
            });
            setType(TDSTRING_START);
          } else if (consume('"')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '"',
              endSourceType: DSTRING_END,
            });
            setType(DSTRING_START);
          } else if (consume('\'\'\'')) {
            stringStack.push({
              allowInterpolations: false,
              endingDelimiter: '\'\'\'',
              endSourceType: TSSTRING_END,
            });
            setType(TSSTRING_START);
          } else if (consume('\'')) {
            stringStack.push({
              allowInterpolations: false,
              endingDelimiter: '\'',
              endSourceType: SSTRING_END,
            });
            setType(SSTRING_START);
          } else if (consume(/^###[^#]/)) {
            setType(HERECOMMENT);
          } else if (consume('#')) {
            setType(COMMENT);
          } else if (consume('///')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '///',
              endSourceType: HEREGEXP_END,
            });
            setType(HEREGEXP_START);
          } else if (consume('(')) {
            if (CALLABLE.indexOf(location.type) >= 0) {
              parenStack.push(CALL_START);
              setType(CALL_START);
            } else {
              parenStack.push(LPAREN);
              setType(LPAREN);
            }
          } else if (consume(')')) {
            if (parenStack.length === 0) {
              throw new Error(`unexpected ')' at ${start}`);
            } else {
              let lparen = parenStack.pop();
              switch (lparen) {
                case LPAREN:
                  setType(RPAREN);
                  break;

                case CALL_START:
                  setType(CALL_END);
                  break;

                default:
                  throw new Error(
                    `unexpected token type for '(' matching ')' at ${start}: ${lparen.toString()}`
                  );
              }
            }
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
          } else if (consumeAny(OPERATORS)) {
            if (consumed() === '?') {
              setType(EXISTENCE);
            } else {
              setType(OPERATOR);
            }
          } else if (consume(YIELDFROM_PATTERN)) {
            setType(YIELDFROM);
          } else if (consume(IDENTIFIER_PATTERN)) {
            let prevLocationIndex = locations.length - 1;
            while (prevLocationIndex > 0 && locations[prevLocationIndex].type === NEWLINE) {
              prevLocationIndex--;
            }
            let prev = locations[prevLocationIndex];
            if (prev && (prev.type === DOT || prev.type === PROTO || prev.type === AT)) {
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

                case 'for':
                  setType(FOR);
                  break;

                case 'own':
                  setType(OWN);
                  break;

                case 'while':
                case 'until':
                  setType(WHILE);
                  break;

                case 'loop':
                  setType(LOOP);
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

                case 'class':
                  setType(CLASS);
                  break;

                case 'break':
                  setType(BREAK);
                  break;

                case 'continue':
                  setType(CONTINUE);
                  break;

                case 'try':
                  setType(TRY);
                  break;

                case 'catch':
                  setType(CATCH);
                  break;

                case 'finally':
                  setType(FINALLY);
                  break;

                case 'delete':
                  setType(DELETE);
                  break;

                case 'in':
                case 'of':
                  setType(RELATION);
                  break;

                case 'do':
                  setType(DO);
                  break;

                case 'yield':
                  setType(YIELD);
                  break;

                default:
                  setType(IDENTIFIER);
              }
            }
          } else if (consume(NUMBER_PATTERN)) {
            setType(NUMBER);
          } else if (consume('\\')) {
            setType(CONTINUATION);
          } else {
            setType(UNKNOWN);
          }
          break;

        case SSTRING_START:
        case DSTRING_START:
        case TSSTRING_START:
        case TDSTRING_START:
        case HEREGEXP_START:
          setType(STRING_CONTENT);
          break;

        case STRING_CONTENT: {
          let stringOptions = stringStack[stringStack.length - 1];
          if (!stringOptions) {
            throw new Error(
              'Unexpected STRING_CONTENT without anything on the string stack.');
          }
          if (consume('\\')) {
            index++;
          } else if (consume(stringOptions.endingDelimiter)) {
            stringStack.pop();
            setType(stringOptions.endSourceType);
          } else if (stringOptions.allowInterpolations && consume('#{')) {
            pushInterpolation();
          } else {
            index++;
          }
          break;
        }

        case COMMENT:
          if (consume('\n')) {
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

        case INTERPOLATION_END:
          let { type, braces } = interpolationStack.pop();
          setType(type);
          braceStack = braces;
          break;

        case HEREGEXP_END:
          while (consumeAny(REGEXP_FLAGS));
          setType(NORMAL);
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
          if (stringStack.length !== 0) {
            throw new Error('unexpected EOF while parsing a string');
          }
          break;

        case UNKNOWN:
          // Jump to the end.
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
    interpolationStack.push({ type: location.type, braces: braceStack });
    setType(INTERPOLATION_START);
    braceStack = [];
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
