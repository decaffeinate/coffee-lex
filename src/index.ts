import SourceLocation from './SourceLocation';
import SourceToken from './SourceToken';
import SourceTokenList from './SourceTokenList';
import SourceType from './SourceType';
import BufferedStream from './utils/BufferedStream';
import calculateHeregexpPadding from './utils/calculateHeregexpPadding';
import calculateNormalStringPadding from './utils/calculateNormalStringPadding';
import calculateTripleQuotedStringPadding from './utils/calculateTripleQuotedStringPadding';

/**
 * Generate a list of tokens from CoffeeScript source code.
 */
export default function lex(source: string): SourceTokenList {
  let location;
  let previousLocation;
  let tokens: Array<SourceToken> = [];
  let pending = new BufferedStream(stream(source));
  do {
    pending.unshift(...calculateNormalStringPadding(source, pending));
    pending.unshift(...calculateTripleQuotedStringPadding(source, pending));
    pending.unshift(...calculateHeregexpPadding(source, pending));
    pending.unshift(...combinedLocationsForNegatedOperators(pending, source));
    location = pending.shift();
    if (previousLocation && previousLocation.type !== SourceType.SPACE) {
      tokens.push(new SourceToken(previousLocation.type, previousLocation.index, location.index));
    }
    previousLocation = location;
  } while (location.type !== SourceType.EOF);
  return new SourceTokenList(tokens);
}

function combinedLocationsForNegatedOperators(stream: BufferedStream, source: string): Array<SourceLocation> {
  if (!stream.hasNext(SourceType.OPERATOR)) {
    return [];
  }

  let locationsToRestore: Array<SourceLocation> = [];

  function shift(): SourceLocation {
    let location = stream.shift();
    locationsToRestore.push(location);
    return location;
  }

  let not = shift();
  let space = shift();
  let text = source.slice(not.index, space.index);
  let operator: SourceLocation;

  if (text === 'not') {
    if (space.type === SourceType.SPACE) {
      // It is a space, so the operator is at the next location.
      operator = shift();
    } else {
      // `not` must be followed by a space, so this isn't a match.
      return locationsToRestore;
    }
  } else if (text === '!') {
    if (space.type === SourceType.SPACE) {
      // It is a space, so the operator is at the next location.
      operator = shift();
    } else {
      // The optional space is missing, so the next thing must be the operator.
      operator = space;
    }
  } else {
    // Not a negation token, so put them back.
    return locationsToRestore;
  }

  let next = stream.peek();
  let op = source.slice(operator.index, next.index);

  switch (op) {
    case 'in':
    case 'of':
      return [new SourceLocation(SourceType.RELATION, not.index)];

    case 'instanceof':
      return [new SourceLocation(SourceType.OPERATOR, not.index)];
  }

  // Doesn't match, so put them back.
  return locationsToRestore;
}

const REGEXP_FLAGS = ['i', 'g', 'm', 'u', 'y'];

export { SourceType };

/**
 * Borrowed, with tweaks, from CoffeeScript's lexer.coffee.
 */
const STRING = [SourceType.SSTRING_END, SourceType.DSTRING_END, SourceType.TSSTRING_END, SourceType.TDSTRING_END];
const CALLABLE = [
  SourceType.IDENTIFIER,
  SourceType.CALL_END,
  SourceType.RPAREN,
  SourceType.RBRACKET,
  SourceType.EXISTENCE,
  SourceType.AT,
  SourceType.THIS,
  SourceType.SUPER
];
const INDEXABLE = CALLABLE.concat([
  SourceType.NUMBER,
  ...STRING,
  SourceType.REGEXP,
  SourceType.HEREGEXP_END,
  SourceType.BOOL,
  SourceType.NULL,
  SourceType.UNDEFINED,
  SourceType.RBRACE,
  SourceType.PROTO
]);
const NOT_REGEXP = INDEXABLE.concat([SourceType.INCREMENT, SourceType.DECREMENT]);

const IDENTIFIER_PATTERN = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)/;
const NUMBER_PATTERN = /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;
const SPACE_PATTERN = /^[^\n\r\S]+/;
const REGEXP_PATTERN = /^\/(?!\/)((?:[^[\/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/;
const YIELDFROM_PATTERN = /^yield[^\n\r\S]+from/;

const OPERATORS = [
  // equality
  '===',
  '==',
  '!==',
  '!=',
  // assignment
  '=',
  '+=',
  '-=',
  '/=',
  '*=',
  '%=',
  '%%=',
  '||=',
  '&&=',
  '^=',
  'or=',
  'and=',
  '?=',
  '|=',
  '&=',
  '~=',
  '<<=',
  '>>>=',
  '>>=',
  // increment/decrement
  '++',
  '--',
  // math
  '+',
  '-',
  '//',
  '/',
  '*',
  '%',
  '%%',
  // logical
  '||',
  '&&',
  '^',
  '!',
  // existence
  '?',
  // bitwise
  '|',
  '&',
  '~',
  '<<',
  '>>>',
  '>>',
  // comparison
  '<=',
  '<',
  '>=',
  '>',
  // prototype access
  '::'
];

/**
 * Provides a stream of source type change locations.
 */
export function stream(source: string, index: number = 0): () => SourceLocation {
  let location = new SourceLocation(SourceType.NORMAL, index);
  let interpolationStack: Array<{ type: SourceType; braces: Array<number> }> = [];
  let braceStack: Array<number> = [];
  let parenStack: Array<SourceType> = [];
  let stringStack: Array<{
    allowInterpolations: boolean;
    endingDelimiter: string;
    endSourceType: SourceType;
  }> = [];
  let start = index;
  let locations: Array<SourceLocation> = [];
  return function step(): SourceLocation {
    let lastLocation = location;
    let shouldStepAgain = false;

    do {
      start = index;
      if (index >= source.length) {
        setType(SourceType.EOF);
      }

      switch (location.type) {
        case SourceType.NORMAL:
        case SourceType.SPACE:
        case SourceType.IDENTIFIER:
        case SourceType.DOT:
        case SourceType.NUMBER:
        case SourceType.OPERATOR:
        case SourceType.INCREMENT:
        case SourceType.DECREMENT:
        case SourceType.COMMA:
        case SourceType.LPAREN:
        case SourceType.RPAREN:
        case SourceType.CALL_START:
        case SourceType.CALL_END:
        case SourceType.NEW:
        case SourceType.LBRACE:
        case SourceType.RBRACE:
        case SourceType.LBRACKET:
        case SourceType.RBRACKET:
        case SourceType.NEWLINE:
        case SourceType.COLON:
        case SourceType.FUNCTION:
        case SourceType.THIS:
        case SourceType.AT:
        case SourceType.SEMICOLON:
        case SourceType.IF:
        case SourceType.ELSE:
        case SourceType.THEN:
        case SourceType.FOR:
        case SourceType.OWN:
        case SourceType.WHILE:
        case SourceType.BOOL:
        case SourceType.NULL:
        case SourceType.UNDEFINED:
        case SourceType.REGEXP:
        case SourceType.SSTRING_END:
        case SourceType.DSTRING_END:
        case SourceType.TSSTRING_END:
        case SourceType.TDSTRING_END:
        case SourceType.INTERPOLATION_START:
        case SourceType.SUPER:
        case SourceType.TRY:
        case SourceType.CATCH:
        case SourceType.FINALLY:
        case SourceType.SWITCH:
        case SourceType.WHEN:
        case SourceType.BREAK:
        case SourceType.CONTINUE:
        case SourceType.EXISTENCE:
        case SourceType.CLASS:
        case SourceType.PROTO:
        case SourceType.RANGE:
        case SourceType.DELETE:
        case SourceType.RETURN:
        case SourceType.RELATION:
        case SourceType.LOOP:
        case SourceType.DO:
        case SourceType.YIELD:
        case SourceType.YIELDFROM:
        case SourceType.THROW:
        case SourceType.EXTENDS:
        case SourceType.IMPORT:
        case SourceType.EXPORT:
        case SourceType.DEFAULT:
        case SourceType.CONTINUATION:
          if (consume(SPACE_PATTERN)) {
            setType(SourceType.SPACE);
          } else if (consume('\n')) {
            setType(SourceType.NEWLINE);
          } else if (consume('...') || consume('..')) {
            setType(SourceType.RANGE);
          } else if (consume(NUMBER_PATTERN)) {
            setType(SourceType.NUMBER);
          } else if (consume('.')) {
            setType(SourceType.DOT);
          } else if (consume('"""')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '"""',
              endSourceType: SourceType.TDSTRING_END
            });
            setType(SourceType.TDSTRING_START);
          } else if (consume('"')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '"',
              endSourceType: SourceType.DSTRING_END
            });
            setType(SourceType.DSTRING_START);
          } else if (consume("'''")) {
            stringStack.push({
              allowInterpolations: false,
              endingDelimiter: "'''",
              endSourceType: SourceType.TSSTRING_END
            });
            setType(SourceType.TSSTRING_START);
          } else if (consume("'")) {
            stringStack.push({
              allowInterpolations: false,
              endingDelimiter: "'",
              endSourceType: SourceType.SSTRING_END
            });
            setType(SourceType.SSTRING_START);
          } else if (consume(/^###[^#]/)) {
            setType(SourceType.HERECOMMENT);
          } else if (consume('#')) {
            setType(SourceType.COMMENT);
          } else if (consume('///')) {
            stringStack.push({
              allowInterpolations: true,
              endingDelimiter: '///',
              endSourceType: SourceType.HEREGEXP_END
            });
            setType(SourceType.HEREGEXP_START);
          } else if (consume('(')) {
            if (CALLABLE.indexOf(location.type) >= 0) {
              parenStack.push(SourceType.CALL_START);
              setType(SourceType.CALL_START);
            } else {
              parenStack.push(SourceType.LPAREN);
              setType(SourceType.LPAREN);
            }
          } else if (consume(')')) {
            if (parenStack.length === 0) {
              throw new Error(`unexpected ')' at ${start}`);
            } else {
              let lparen = parenStack.pop();
              switch (lparen) {
                case SourceType.LPAREN:
                  setType(SourceType.RPAREN);
                  break;

                case SourceType.CALL_START:
                  setType(SourceType.CALL_END);
                  break;

                default:
                  throw new Error(
                    `unexpected token type for '(' matching ')' at ${start}: ${lparen ? lparen.toString() : '??'}`
                  );
              }
            }
          } else if (consume('[')) {
            setType(SourceType.LBRACKET);
          } else if (consume(']')) {
            setType(SourceType.RBRACKET);
          } else if (consume('{')) {
            braceStack.push(start);
            setType(SourceType.LBRACE);
          } else if (consume('}')) {
            if (braceStack.length === 0) {
              popInterpolation();
            } else {
              braceStack.pop();
              setType(SourceType.RBRACE);
            }
          } else if (consumeAny(['->', '=>'])) {
            setType(SourceType.FUNCTION);
          } else if (consumeRegexp()) {
            setType(SourceType.REGEXP);
          } else if (consume('::')) {
            setType(SourceType.PROTO);
          } else if (consume(':')) {
            setType(SourceType.COLON);
          } else if (consume(',')) {
            setType(SourceType.COMMA);
          } else if (consume('@')) {
            setType(SourceType.AT);
          } else if (consume(';')) {
            setType(SourceType.SEMICOLON);
          } else if (consume('```')) {
            setType(SourceType.HEREJS);
          } else if (consume('`')) {
            setType(SourceType.JS);
          } else if (consumeAny(OPERATORS)) {
            if (consumed() === '?') {
              setType(SourceType.EXISTENCE);
            } else if (consumed() === '++') {
              setType(SourceType.INCREMENT);
            } else if (consumed() === '--') {
              setType(SourceType.DECREMENT);
            } else {
              setType(SourceType.OPERATOR);
            }
          } else if (consume(YIELDFROM_PATTERN)) {
            setType(SourceType.YIELDFROM);
          } else if (consume(IDENTIFIER_PATTERN)) {
            let prevLocationIndex = locations.length - 1;
            while (prevLocationIndex > 0 && locations[prevLocationIndex].type === SourceType.NEWLINE) {
              prevLocationIndex--;
            }
            let prev = locations[prevLocationIndex];
            let nextIsColon = match(/^\s*:/);
            if (
              nextIsColon ||
              (prev && (prev.type === SourceType.DOT || prev.type === SourceType.PROTO || prev.type === SourceType.AT))
            ) {
              setType(SourceType.IDENTIFIER);
            } else {
              switch (consumed()) {
                case 'if':
                case 'unless':
                  setType(SourceType.IF);
                  break;

                case 'else':
                  setType(SourceType.ELSE);
                  break;

                case 'return':
                  setType(SourceType.RETURN);
                  break;

                case 'for':
                  setType(SourceType.FOR);
                  break;

                case 'own':
                  setType(SourceType.OWN);
                  break;

                case 'while':
                case 'until':
                  setType(SourceType.WHILE);
                  break;

                case 'loop':
                  setType(SourceType.LOOP);
                  break;

                case 'then':
                  setType(SourceType.THEN);
                  break;

                case 'switch':
                  setType(SourceType.SWITCH);
                  break;

                case 'when':
                  setType(SourceType.WHEN);
                  break;

                case 'null':
                  setType(SourceType.NULL);
                  break;

                case 'undefined':
                  setType(SourceType.UNDEFINED);
                  break;

                case 'this':
                  setType(SourceType.THIS);
                  break;

                case 'new':
                  setType(SourceType.NEW);
                  break;

                case 'super':
                  setType(SourceType.SUPER);
                  break;

                case 'true':
                case 'false':
                case 'yes':
                case 'no':
                case 'on':
                case 'off':
                  setType(SourceType.BOOL);
                  break;

                case 'and':
                case 'or':
                case 'not':
                case 'is':
                case 'isnt':
                case 'instanceof':
                  setType(SourceType.OPERATOR);
                  break;

                case 'class':
                  setType(SourceType.CLASS);
                  break;

                case 'break':
                  setType(SourceType.BREAK);
                  break;

                case 'continue':
                  setType(SourceType.CONTINUE);
                  break;

                case 'try':
                  setType(SourceType.TRY);
                  break;

                case 'catch':
                  setType(SourceType.CATCH);
                  break;

                case 'finally':
                  setType(SourceType.FINALLY);
                  break;

                case 'delete':
                  setType(SourceType.DELETE);
                  break;

                case 'in':
                case 'of':
                  setType(SourceType.RELATION);
                  break;

                case 'do':
                  setType(SourceType.DO);
                  break;

                case 'yield':
                  setType(SourceType.YIELD);
                  break;

                case 'throw':
                  setType(SourceType.THROW);
                  break;

                case 'extends':
                  setType(SourceType.EXTENDS);
                  break;

                case 'import':
                  setType(SourceType.IMPORT);
                  break;

                case 'export':
                  setType(SourceType.EXPORT);
                  break;

                case 'default':
                  setType(SourceType.DEFAULT);
                  break;

                default:
                  setType(SourceType.IDENTIFIER);
              }
            }
          } else if (consume('\\')) {
            setType(SourceType.CONTINUATION);
          } else {
            setType(SourceType.UNKNOWN);
          }
          break;

        case SourceType.SSTRING_START:
        case SourceType.DSTRING_START:
        case SourceType.TSSTRING_START:
        case SourceType.TDSTRING_START:
        case SourceType.HEREGEXP_START:
          setType(SourceType.STRING_CONTENT);
          break;

        case SourceType.STRING_CONTENT: {
          let stringOptions = stringStack[stringStack.length - 1];
          if (!stringOptions) {
            throw new Error('Unexpected STRING_CONTENT without anything on the string stack.');
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

        case SourceType.COMMENT:
          if (consume('\n')) {
            setType(SourceType.NEWLINE);
          } else {
            index++;
          }
          break;

        case SourceType.HERECOMMENT:
          if (consume('###')) {
            setType(SourceType.NORMAL);
          } else {
            index++;
          }
          break;

        case SourceType.INTERPOLATION_END:
          let lastInterpolation = interpolationStack.pop();
          if (!lastInterpolation) {
            throw new Error(`found interpolation end without any interpolation start`);
          }
          let { type, braces } = lastInterpolation;
          setType(type);
          braceStack = braces;
          break;

        case SourceType.HEREGEXP_END:
          while (consumeAny(REGEXP_FLAGS)) {
            // condition has side-effect
          }
          setType(SourceType.NORMAL);
          break;

        case SourceType.JS:
          if (consume('\\')) {
            index++;
          } else if (consume('`')) {
            setType(SourceType.NORMAL);
          } else {
            index++;
          }
          break;

        case SourceType.HEREJS:
          if (consume('\\')) {
            index++;
          } else if (consume('```')) {
            setType(SourceType.NORMAL);
          } else {
            index++;
          }
          break;

        case SourceType.EOF:
          if (braceStack.length !== 0) {
            throw new Error(
              `unexpected EOF while looking for '}' to match '{' ` + `at ${braceStack[braceStack.length - 1]}`
            );
          }
          if (stringStack.length !== 0) {
            throw new Error('unexpected EOF while parsing a string');
          }
          break;

        case SourceType.UNKNOWN:
          // Jump to the end.
          index = source.length;
          break;

        default:
          throw new Error(`unknown source type at offset ${location.index}: ${SourceType[location.type]}`);
      }

      shouldStepAgain =
        // Don't report on going back to "normal" source code.
        location.type === SourceType.NORMAL ||
        // Don't report if nothing has changed, unless we're at the end.
        (location === lastLocation && location.type !== SourceType.EOF);
    } while (shouldStepAgain);

    locations.push(location);
    return location;
  };

  function consumeAny(strings: Array<string>): boolean {
    return strings.some(string => consume(string));
  }

  function consume(value: string | RegExp): boolean {
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
    let [regex, , closed] = matchData;
    let prev = locations[locations.length - 1];
    if (prev) {
      let spaced = false;
      if (prev.type === SourceType.SPACE) {
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
    while (consumeAny(REGEXP_FLAGS)) {
      // condition has side-effect
    }
    return true;
  }

  function consumed() {
    return source.slice(start, index);
  }

  function setType(newType: SourceType) {
    location = new SourceLocation(newType, start);
  }

  function match(value: string | RegExp): Array<string> | null {
    if (typeof value === 'string') {
      let matches = source.slice(index, index + value.length) === value;
      return matches ? [value] : null;
    } else {
      return source.slice(index).match(value);
    }
  }

  function pushInterpolation() {
    interpolationStack.push({ type: location.type, braces: braceStack });
    setType(SourceType.INTERPOLATION_START);
    braceStack = [];
  }

  function popInterpolation() {
    if (interpolationStack.length === 0) {
      throw new Error(`unexpected '}' found in string at ${index}: ${JSON.stringify(source)}`);
    }
    setType(SourceType.INTERPOLATION_END);
  }
}

export function consumeStream(lexer: () => SourceLocation): Array<SourceLocation> {
  let result: Array<SourceLocation> = [];
  let location: SourceLocation;
  do {
    location = lexer();
    result.push(location);
  } while (location.type !== SourceType.EOF);
  return result;
}
