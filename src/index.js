export class SourceToken {
  type: SourceType;
  start: number;
  end: number;

  constructor(type: SourceType, start: number, end: number) {
    this.type = type;
    this.start = start;
    this.end = end;
  }
}

/**
 * Represents a list of tokens and provides various utility functions for
 * finding tokens within it.
 */
export class SourceTokenList {
  _tokens: Array<SourceToken>;
  _indexCache: Array<SourceTokenListIndex>;
  length: number;
  startIndex: SourceTokenListIndex;
  endIndex: SourceTokenListIndex;

  constructor(tokens: Array<SourceToken>) {
    this._tokens = tokens;
    this._indexCache = new Array(tokens.length);
    this.length = tokens.length;
    this.startIndex = this._getIndex(0);
    this.endIndex = this._getIndex(tokens.length);
  }

  /**
   * Iterate over each token.
   */
  forEach(iterator: (token: SourceToken, index: SourceTokenListIndex, list: SourceTokenList) => void) {
    this._tokens.forEach((token, i) => iterator(token, this._getIndex(i), this));
  }

  /**
   * Map each token to an element of an array.
   */
  map<T>(mapper: (token: SourceToken, index: SourceTokenListIndex, list: SourceTokenList) => T): Array<T> {
    let result = [];
    this.forEach((token, index, list) => { result.push(mapper(token, index, list)); });
    return result;
  }

  /**
   * Get a slice of this token list using the given indexes.
   */
  slice(start: SourceTokenListIndex, end: SourceTokenListIndex): SourceTokenList {
    if (start._sourceTokenList !== this || end._sourceTokenList !== this) {
      throw new Error('cannot slice a list using indexes from another list');
    }
    return new SourceTokenList(this._tokens.slice(start._index, end._index));
  }

  /**
   * Get the token at the given index, if it exists.
   *
   * NOTE: The only value for which this should return `null` is this list's
   * `endIndex`.
   */
  tokenAtIndex(index: SourceTokenListIndex): ?SourceToken {
    if (index._sourceTokenList !== this) {
      throw new Error('cannot get token in one list using an index from another');
    }
    return this._tokens[index._index] || null;
  }

  /**
   * Finds the index of the token whose source range includes the given index.
   */
  indexOfTokenContainingSourceIndex(index: number): ?SourceTokenListIndex {
    if (typeof index !== 'number') {
      throw new Error(`expected source index to be a number, got: ${index}`);
    }
    return this.indexOfTokenMatchingPredicate(({ start, end }) => start <= index && index < end);
  }

  /**
   * Finds the index of the token whose source range starts at the given index.
   */
  indexOfTokenStartingAtSourceIndex(index: number): ?SourceTokenListIndex {
    if (typeof index !== 'number') {
      throw new Error(`expected source index to be a number, got: ${index}`);
    }
    return this.indexOfTokenMatchingPredicate(({ start }) => start === index);
  }

  /**
   * Finds the index of the token whose source range ends at the given index.
   */
  indexOfTokenEndingAtSourceIndex(index: number): ?SourceTokenListIndex {
    if (typeof index !== 'number') {
      throw new Error(`expected source index to be a number, got: ${index}`);
    }
    return this.indexOfTokenMatchingPredicate(({ end }) => end === index);
  }

  /**
   * Finds the index of the first token matching a predicate.
   */
  indexOfTokenMatchingPredicate(predicate: (token: SourceToken) => boolean): ?SourceTokenListIndex {
    for (let i = 0; i < this._tokens.length; i++) {
      if (predicate(this._tokens[i])) {
        return this._getIndex(i);
      }
    }
    return null;
  }

  /**
   * @internal
   */
  _getIndex(index: number): SourceTokenListIndex {
    let cached = this._indexCache[index];

    if (!cached) {
      cached = new SourceTokenListIndex(this, index);
      this._indexCache[index] = cached;
    }

    return cached;
  }

  /**
   * Get the list of tokens.
   */
  toArray(): Array<SourceToken> {
    return this._tokens.slice();
  }
}

/**
 * Represents a token at a particular index within a list of tokens.
 */
class SourceTokenListIndex {
  _sourceTokenList: SourceTokenList;
  _index: number;

  constructor(sourceTokenList: SourceTokenList, index: number) {
    this._sourceTokenList = sourceTokenList;
    this._index = index;
  }

  /**
   * Get a new index offset from this one, if the resulting offset is within
   * the list range.
   */
  advance(offset: number): ?SourceTokenListIndex {
    let newIndex = this._index + offset;
    if (newIndex < 0 || this._sourceTokenList.length < newIndex) {
      return null;
    }
    return this._sourceTokenList._getIndex(newIndex);
  }

  /**
   * Get the index of the token after this one, if it's not the last one.
   */
  next(): ?SourceTokenListIndex {
    return this.advance(1);
  }

  /**
   * Get the index of the token before this one, if it's not the first one.
   */
  previous(): ?SourceTokenListIndex {
    return this.advance(-1);
  }
}

/**
 * Generate a list of tokens from CoffeeScript source code.
 */
export default function lex(source: string): SourceTokenList {
  let location;
  let previousLocation;
  let tokens = [];
  let getNextLocation = stream(source);
  do {
    location = getNextLocation();
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

const REGEXP_FLAGS = ['i', 'g', 'm', 'y'];

/**
 * Represents a change in source code type at a particular index.
 */
export class SourceLocation {
  type: SourceType;
  index: number;

  constructor(type: SourceType, index: number) {
    this.type = type;
    this.index = index;
  }
}

/**
 * Represents a particular type of CoffeeScript code.
 */
export class SourceType {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

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
export const RPAREN = new SourceType('RPAREN');
export const SEMICOLON = new SourceType('SEMICOLON');
export const SPACE = new SourceType('SPACE');
export const SSTRING = new SourceType('SSTRING');
export const SUPER = new SourceType('SUPER');
export const SWITCH = new SourceType('SWITCH');
export const TDSTRING = new SourceType('TDSTRING');
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
const COMMENT_PATTERN = /^###([^#][\s\S]*?)(?:###[^\n\S]*|###$)|^(?:\s*#(?!##[^#]).*)+/;
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
  '+', '-', '/', '*', '%', '%%',
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
          } else if (consume('?')) {
            setType(EXISTENCE);
          } else if (consume('`')) {
            setType(JS);
          } else if (consume(IDENTIFIER_PATTERN)) {
            let prev = locations[locations.length - 1];
            if (prev && (prev.type === DOT || prev.type === PROTO)) {
              setType(IDENTIFIER);
            } else {
              let raw = source.slice(start, index);
              switch (raw) {
                case 'if':
                  setType(IF);
                  break;

                case 'else':
                  setType(ELSE);
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
            setType(OPERATOR);
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
