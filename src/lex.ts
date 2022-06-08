import { SourceLocation } from './SourceLocation'
import { SourceToken } from './SourceToken'
import { SourceTokenList } from './SourceTokenList'
import { SourceType } from './SourceType'
import { assertNever } from './utils/assertNever'
import { BufferedStream } from './utils/BufferedStream'
import { calculateHeregexpPadding } from './utils/calculateHeregexpPadding'
import { calculateNormalStringPadding } from './utils/calculateNormalStringPadding'
import { calculateTripleQuotedStringPadding } from './utils/calculateTripleQuotedStringPadding'

enum ContextType {
  STRING = 'STRING',
  INTERPOLATION = 'INTERPOLATION',
  CSX_OPEN_TAG = 'CSX_OPEN_TAG',
  CSX_CLOSE_TAG = 'CSX_CLOSE_TAG',
  CSX_BODY = 'CSX_BODY',
  BRACE = 'BRACE',
  PAREN = 'PAREN',
}
type Context =
  | {
      readonly type: ContextType.STRING
      readonly allowComments: boolean
      readonly allowInterpolations: boolean
      readonly endingDelimiter: string
      readonly endSourceType: SourceType
    }
  | {
      readonly type: ContextType.INTERPOLATION
      readonly interpolationType: SourceType
    }
  | { readonly type: ContextType.CSX_OPEN_TAG }
  | { readonly type: ContextType.CSX_CLOSE_TAG }
  | { readonly type: ContextType.CSX_BODY }
  | { readonly type: ContextType.BRACE }
  | { readonly type: ContextType.PAREN; readonly sourceType: SourceType }

export interface Options {
  readonly useCS2: boolean
}

export const DEFAULT_OPTIONS: Options = {
  useCS2: false,
}

/**
 * Generate a list of tokens from CoffeeScript source code.
 */
export function lex(
  source: string,
  options: Options = DEFAULT_OPTIONS
): SourceTokenList {
  let location
  let previousLocation
  const tokens: Array<SourceToken> = []
  const pending = new BufferedStream(stream(source, 0, options))
  do {
    pending.unshift(...calculateNormalStringPadding(source, pending))
    pending.unshift(...calculateTripleQuotedStringPadding(source, pending))
    pending.unshift(...calculateHeregexpPadding(source, pending))
    pending.unshift(...combinedLocationsForNegatedOperators(pending, source))
    location = pending.shift()
    if (previousLocation && previousLocation.type !== SourceType.SPACE) {
      tokens.push(
        new SourceToken(
          previousLocation.type,
          previousLocation.index,
          location.index
        )
      )
    }
    previousLocation = location
  } while (location.type !== SourceType.EOF)
  return new SourceTokenList(tokens)
}

function combinedLocationsForNegatedOperators(
  stream: BufferedStream,
  source: string
): Array<SourceLocation> {
  if (!stream.hasNext(SourceType.OPERATOR)) {
    return []
  }

  const locationsToRestore: Array<SourceLocation> = []

  function shift(): SourceLocation {
    const location = stream.shift()
    locationsToRestore.push(location)
    return location
  }

  const not = shift()
  const space = shift()
  const text = source.slice(not.index, space.index)
  let operator: SourceLocation

  if (text === 'not') {
    if (space.type === SourceType.SPACE) {
      // It is a space, so the operator is at the next location.
      operator = shift()
    } else {
      // `not` must be followed by a space, so this isn't a match.
      return locationsToRestore
    }
  } else if (text === '!') {
    if (space.type === SourceType.SPACE) {
      // It is a space, so the operator is at the next location.
      operator = shift()
    } else {
      // The optional space is missing, so the next thing must be the operator.
      operator = space
    }
  } else {
    // Not a negation token, so put them back.
    return locationsToRestore
  }

  const next = stream.peek()
  const op = source.slice(operator.index, next.index)

  switch (op) {
    case 'in':
    case 'of':
      return [new SourceLocation(SourceType.RELATION, not.index)]

    case 'instanceof':
      return [new SourceLocation(SourceType.OPERATOR, not.index)]
  }

  // Doesn't match, so put them back.
  return locationsToRestore
}

const REGEXP_FLAGS = ['i', 'g', 'm', 'u', 'y']

export { SourceType }

/**
 * Borrowed, with tweaks, from CoffeeScript's lexer.coffee.
 */
const STRING = [
  SourceType.SSTRING_END,
  SourceType.DSTRING_END,
  SourceType.TSSTRING_END,
  SourceType.TDSTRING_END,
]
const CALLABLE = [
  SourceType.IDENTIFIER,
  SourceType.CALL_END,
  SourceType.RPAREN,
  SourceType.RBRACKET,
  SourceType.EXISTENCE,
  SourceType.AT,
  SourceType.THIS,
  SourceType.SUPER,
]
const INDEXABLE = CALLABLE.concat([
  SourceType.NUMBER,
  ...STRING,
  SourceType.REGEXP,
  SourceType.HEREGEXP_END,
  SourceType.BOOL,
  SourceType.NULL,
  SourceType.UNDEFINED,
  SourceType.RBRACE,
  SourceType.PROTO,
])
const NOT_REGEXP = INDEXABLE.concat([
  SourceType.INCREMENT,
  SourceType.DECREMENT,
])

const IDENTIFIER_PATTERN = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)/
// Like identifier, but includes '-' and '.'.
const CSX_IDENTIFIER_PATTERN = /^(?!\d)((?:(?!\s)[.\-$\w\x7f-\uffff])+)/
const NUMBER_PATTERN =
  /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i
const SPACE_PATTERN = /^[^\n\r\S]+/
const REGEXP_PATTERN =
  /^\/(?!\/)((?:[^[/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/
const YIELDFROM_PATTERN = /^yield[^\n\r\S]+from/

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
  '::',
]

/**
 * Provides a stream of source type change locations.
 */
export function stream(
  source: string,
  index = 0,
  options: Options = DEFAULT_OPTIONS
): () => SourceLocation {
  let location = new SourceLocation(SourceType.NORMAL, index)
  const contextStack: Array<Context> = []
  let start = index
  const locations: Array<SourceLocation> = []

  function currentContext(): Context | null {
    return contextStack[contextStack.length - 1] || null
  }
  function currentContextType(): ContextType | null {
    const context = currentContext()
    return context ? context.type : null
  }

  return function step(): SourceLocation {
    const lastLocation = location
    let shouldStepAgain = false

    do {
      start = index
      if (index >= source.length) {
        setType(SourceType.EOF)
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
        case SourceType.CSX_OPEN_TAG_START:
        case SourceType.CSX_CLOSE_TAG_START:
        case SourceType.CONTINUATION:
          if (consume(SPACE_PATTERN)) {
            setType(SourceType.SPACE)
          } else if (consume('\n')) {
            setType(SourceType.NEWLINE)
          } else if (consume('...') || consume('..')) {
            setType(SourceType.RANGE)
          } else if (consume(NUMBER_PATTERN)) {
            setType(SourceType.NUMBER)
          } else if (consume('.')) {
            setType(SourceType.DOT)
          } else if (consume('"""')) {
            contextStack.push({
              type: ContextType.STRING,
              allowComments: false,
              allowInterpolations: true,
              endingDelimiter: '"""',
              endSourceType: SourceType.TDSTRING_END,
            })
            setType(SourceType.TDSTRING_START)
          } else if (consume('"')) {
            contextStack.push({
              type: ContextType.STRING,
              allowComments: false,
              allowInterpolations: true,
              endingDelimiter: '"',
              endSourceType: SourceType.DSTRING_END,
            })
            setType(SourceType.DSTRING_START)
          } else if (consume("'''")) {
            contextStack.push({
              type: ContextType.STRING,
              allowComments: false,
              allowInterpolations: false,
              endingDelimiter: "'''",
              endSourceType: SourceType.TSSTRING_END,
            })
            setType(SourceType.TSSTRING_START)
          } else if (consume("'")) {
            contextStack.push({
              type: ContextType.STRING,
              allowComments: false,
              allowInterpolations: false,
              endingDelimiter: "'",
              endSourceType: SourceType.SSTRING_END,
            })
            setType(SourceType.SSTRING_START)
          } else if (consume(/^###[^#]/)) {
            setType(SourceType.HERECOMMENT)
          } else if (consume('#')) {
            setType(SourceType.COMMENT)
          } else if (consume('///')) {
            contextStack.push({
              type: ContextType.STRING,
              allowComments: true,
              allowInterpolations: true,
              endingDelimiter: '///',
              endSourceType: SourceType.HEREGEXP_END,
            })
            setType(SourceType.HEREGEXP_START)
          } else if (consume('(')) {
            if (CALLABLE.indexOf(location.type) >= 0) {
              contextStack.push({
                type: ContextType.PAREN,
                sourceType: SourceType.CALL_START,
              })
              setType(SourceType.CALL_START)
            } else {
              contextStack.push({
                type: ContextType.PAREN,
                sourceType: SourceType.LPAREN,
              })
              setType(SourceType.LPAREN)
            }
          } else if (consume(')')) {
            const context = contextStack.pop()
            if (!context || context.type !== ContextType.PAREN) {
              throw new Error(`unexpected ')' at ${start}`)
            }
            const { sourceType } = context
            switch (sourceType) {
              case SourceType.LPAREN:
                setType(SourceType.RPAREN)
                break

              case SourceType.CALL_START:
                setType(SourceType.CALL_END)
                break

              default:
                throw new Error(
                  `unexpected token type for '(' matching ')' at ${start}: ${
                    sourceType ? sourceType.toString() : '??'
                  }`
                )
            }
          } else if (consume('[')) {
            setType(SourceType.LBRACKET)
          } else if (consume(']')) {
            setType(SourceType.RBRACKET)
          } else if (consume('{')) {
            contextStack.push({ type: ContextType.BRACE })
            setType(SourceType.LBRACE)
          } else if (consume('}')) {
            if (currentContextType() === ContextType.INTERPOLATION) {
              popInterpolation()
            } else if (currentContextType() === ContextType.BRACE) {
              contextStack.pop()
              setType(SourceType.RBRACE)
            } else {
              throw new Error(
                `Unexpected context type: ${currentContextType()}`
              )
            }
          } else if (consumeCSXOpenTagStart()) {
            contextStack.push({ type: ContextType.CSX_OPEN_TAG })
            setType(SourceType.CSX_OPEN_TAG_START)
          } else if (
            currentContextType() === ContextType.CSX_OPEN_TAG &&
            consume('>')
          ) {
            contextStack.pop()
            setType(SourceType.CSX_OPEN_TAG_END)
          } else if (
            currentContextType() === ContextType.CSX_OPEN_TAG &&
            consume('/>')
          ) {
            contextStack.pop()
            setType(SourceType.CSX_SELF_CLOSING_TAG_END)
          } else if (
            currentContextType() === ContextType.CSX_CLOSE_TAG &&
            consume('>')
          ) {
            contextStack.pop()
            setType(SourceType.CSX_CLOSE_TAG_END)
          } else if (consumeAny(['->', '=>'])) {
            setType(SourceType.FUNCTION)
          } else if (consumeRegexp()) {
            setType(SourceType.REGEXP)
          } else if (consume('::')) {
            setType(SourceType.PROTO)
          } else if (consume(':')) {
            setType(SourceType.COLON)
          } else if (consume(',')) {
            setType(SourceType.COMMA)
          } else if (consume('@')) {
            setType(SourceType.AT)
          } else if (consume(';')) {
            setType(SourceType.SEMICOLON)
          } else if (consume('```')) {
            setType(SourceType.HEREJS)
          } else if (consume('`')) {
            setType(SourceType.JS)
          } else if (consumeAny(OPERATORS)) {
            if (consumed() === '?') {
              setType(SourceType.EXISTENCE)
            } else if (consumed() === '++') {
              setType(SourceType.INCREMENT)
            } else if (consumed() === '--') {
              setType(SourceType.DECREMENT)
            } else {
              setType(SourceType.OPERATOR)
            }
          } else if (consume(YIELDFROM_PATTERN)) {
            setType(SourceType.YIELDFROM)
          } else if (
            currentContextType() === ContextType.CSX_OPEN_TAG &&
            consume(CSX_IDENTIFIER_PATTERN)
          ) {
            setType(SourceType.IDENTIFIER)
          } else if (consume(IDENTIFIER_PATTERN)) {
            let prevLocationIndex = locations.length - 1
            while (
              prevLocationIndex > 0 &&
              (locations[prevLocationIndex].type === SourceType.NEWLINE ||
                locations[prevLocationIndex].type === SourceType.SPACE)
            ) {
              prevLocationIndex--
            }
            const prev = locations[prevLocationIndex]
            const nextIsColon = match(/^\s*:/)
            if (
              nextIsColon ||
              (prev &&
                // i.e. `a.b` or `a.\nb`
                (prev.type === SourceType.DOT ||
                  // i.e. `a::b` or `a::\nb`
                  prev.type === SourceType.PROTO ||
                  // i.e. `@a` (but not `@\na`, since that's `this\na`–see #175)
                  (prev.type === SourceType.AT &&
                    prevLocationIndex === locations.length - 1)))
            ) {
              setType(SourceType.IDENTIFIER)
            } else {
              switch (consumed()) {
                case 'if':
                case 'unless':
                  setType(SourceType.IF)
                  break

                case 'else':
                  setType(SourceType.ELSE)
                  break

                case 'return':
                  setType(SourceType.RETURN)
                  break

                case 'for':
                  setType(SourceType.FOR)
                  break

                case 'own':
                  setType(SourceType.OWN)
                  break

                case 'while':
                case 'until':
                  setType(SourceType.WHILE)
                  break

                case 'loop':
                  setType(SourceType.LOOP)
                  break

                case 'then':
                  setType(SourceType.THEN)
                  break

                case 'switch':
                  setType(SourceType.SWITCH)
                  break

                case 'when':
                  setType(SourceType.WHEN)
                  break

                case 'null':
                  setType(SourceType.NULL)
                  break

                case 'undefined':
                  setType(SourceType.UNDEFINED)
                  break

                case 'this':
                  setType(SourceType.THIS)
                  break

                case 'new':
                  setType(SourceType.NEW)
                  break

                case 'super':
                  setType(SourceType.SUPER)
                  break

                case 'true':
                case 'false':
                case 'yes':
                case 'no':
                case 'on':
                case 'off':
                  setType(SourceType.BOOL)
                  break

                case 'and':
                case 'or':
                case 'not':
                case 'is':
                case 'isnt':
                case 'instanceof':
                  setType(SourceType.OPERATOR)
                  break

                case 'class':
                  setType(SourceType.CLASS)
                  break

                case 'break':
                  setType(SourceType.BREAK)
                  break

                case 'continue':
                  setType(SourceType.CONTINUE)
                  break

                case 'try':
                  setType(SourceType.TRY)
                  break

                case 'catch':
                  setType(SourceType.CATCH)
                  break

                case 'finally':
                  setType(SourceType.FINALLY)
                  break

                case 'delete':
                  setType(SourceType.DELETE)
                  break

                case 'in':
                case 'of':
                  setType(SourceType.RELATION)
                  break

                case 'do':
                  setType(SourceType.DO)
                  break

                case 'yield':
                  setType(SourceType.YIELD)
                  break

                case 'throw':
                  setType(SourceType.THROW)
                  break

                case 'extends':
                  setType(SourceType.EXTENDS)
                  break

                case 'import':
                  setType(SourceType.IMPORT)
                  break

                case 'export':
                  setType(SourceType.EXPORT)
                  break

                case 'default':
                  setType(SourceType.DEFAULT)
                  break

                default:
                  setType(SourceType.IDENTIFIER)
              }
            }
          } else if (consume('\\')) {
            setType(SourceType.CONTINUATION)
          } else {
            setType(SourceType.UNKNOWN)
          }
          break

        case SourceType.SSTRING_START:
        case SourceType.DSTRING_START:
        case SourceType.TSSTRING_START:
        case SourceType.TDSTRING_START:
        case SourceType.HEREGEXP_START:
          setType(SourceType.STRING_CONTENT)
          break

        case SourceType.STRING_CONTENT: {
          const context = currentContext()
          if (!context || context.type !== ContextType.STRING) {
            throw new Error(
              'Unexpected STRING_CONTENT without anything on the string stack.'
            )
          }
          const {
            allowComments,
            allowInterpolations,
            endingDelimiter,
            endSourceType,
          } = context
          if (consume('\\')) {
            index++
          } else if (consume(endingDelimiter)) {
            contextStack.pop()
            setType(endSourceType)
          } else if (allowInterpolations && consume('#{')) {
            pushInterpolation()
          } else if (
            options.useCS2 &&
            allowComments &&
            source[index - 1].match(/\s/) &&
            match('#') &&
            !match('#{')
          ) {
            setType(SourceType.HEREGEXP_COMMENT)
          } else {
            index++
          }
          break
        }

        case SourceType.COMMENT:
          if (consume('\n')) {
            setType(SourceType.NEWLINE)
          } else {
            index++
          }
          break

        case SourceType.HERECOMMENT:
          if (consume('###')) {
            setType(SourceType.NORMAL)
          } else {
            index++
          }
          break

        case SourceType.HEREGEXP_COMMENT:
          if (consume('\n')) {
            setType(SourceType.STRING_CONTENT)
          } else {
            index++
          }
          break

        case SourceType.INTERPOLATION_END: {
          const context = contextStack.pop()
          if (!context || context.type !== ContextType.INTERPOLATION) {
            throw new Error(
              `found interpolation end without any interpolation start`
            )
          }
          setType(context.interpolationType)
          break
        }

        case SourceType.HEREGEXP_END:
          while (consumeAny(REGEXP_FLAGS)) {
            // condition has side-effect
          }
          setType(SourceType.NORMAL)
          break

        case SourceType.JS:
          if (consume('\\')) {
            index++
          } else if (consume('`')) {
            setType(SourceType.NORMAL)
          } else {
            index++
          }
          break

        case SourceType.HEREJS:
          if (consume('\\')) {
            index++
          } else if (consume('```')) {
            setType(SourceType.NORMAL)
          } else {
            index++
          }
          break

        case SourceType.CSX_OPEN_TAG_END:
          setType(SourceType.CSX_BODY)
          contextStack.push({ type: ContextType.CSX_BODY })
          break

        case SourceType.CSX_BODY: {
          if (consume('</')) {
            contextStack.pop()
            setType(SourceType.CSX_CLOSE_TAG_START)
            contextStack.push({ type: ContextType.CSX_CLOSE_TAG })
          } else if (consumeCSXOpenTagStart()) {
            setType(SourceType.CSX_OPEN_TAG_START)
            contextStack.push({ type: ContextType.CSX_OPEN_TAG })
          } else if (consume('{')) {
            pushInterpolation()
          } else {
            index++
          }
          break
        }

        case SourceType.CSX_SELF_CLOSING_TAG_END:
        case SourceType.CSX_CLOSE_TAG_END:
          if (currentContextType() === ContextType.CSX_BODY) {
            setType(SourceType.CSX_BODY)
          } else {
            setType(SourceType.NORMAL)
          }
          break

        case SourceType.EOF: {
          const context = currentContext()
          if (context !== null) {
            throw new Error(`unexpected EOF while in context ${context.type}`)
          }
          break
        }

        case SourceType.UNKNOWN:
          // Jump to the end.
          index = source.length
          break

        case SourceType.STRING_LINE_SEPARATOR:
        case SourceType.STRING_PADDING:
          throw new Error(
            `unexpected source type at offset ${location.index}: ${location.type}`
          )

        default:
          assertNever(
            location.type,
            `unexpected source type at offset ${location.index}: ${location.type}`
          )
      }

      shouldStepAgain =
        // Don't report on going back to "normal" source code.
        location.type === SourceType.NORMAL ||
        // Don't report if nothing has changed, unless we're at the end.
        (location === lastLocation && location.type !== SourceType.EOF)
    } while (shouldStepAgain)

    locations.push(location)
    return location
  }

  function consumeAny(strings: Array<string>): boolean {
    return strings.some((string) => consume(string))
  }

  function consume(value: string | RegExp): boolean {
    const matchData = match(value)
    if (matchData) {
      index += matchData[0].length
      return true
    } else {
      return false
    }
  }

  function consumeRegexp(): boolean {
    const matchData = match(REGEXP_PATTERN)
    if (!matchData) {
      return false
    }
    const [regex, , closed] = matchData
    let prev = locations[locations.length - 1]
    if (prev) {
      let spaced = false
      if (prev.type === SourceType.SPACE) {
        spaced = true
        prev = locations[locations.length - 2]
      }
      if (spaced && CALLABLE.indexOf(prev.type) >= 0) {
        if (!closed || /^\/=?\s/.test(regex)) {
          return false
        }
      } else if (NOT_REGEXP.indexOf(prev.type) >= 0) {
        return false
      }
    }
    if (!closed) {
      throw new Error('missing / (unclosed regex)')
    }
    index += regex.length
    while (consumeAny(REGEXP_FLAGS)) {
      // condition has side-effect
    }
    return true
  }

  /**
   * CSX starts are identified by a less-than sign followed by a CSX identifier
   * or `<>` token (no space allowed after the less-than).
   *
   * We also bail in cases like `a<b`: if we're not already in a CSX context,
   * the less-than needs to be preceded by a space or a token other than identifier,
   * close-paren, close-bracket, or number.
   */
  function consumeCSXOpenTagStart(): boolean {
    if (!match('<')) {
      return false
    }
    if (
      source[index + 1] !== '>' &&
      !source.slice(index + 1).match(CSX_IDENTIFIER_PATTERN)
    ) {
      return false
    }
    const contextType = currentContextType()
    if (
      contextType !== ContextType.CSX_BODY &&
      contextType !== ContextType.CSX_OPEN_TAG &&
      [
        SourceType.IDENTIFIER,
        SourceType.RPAREN,
        SourceType.RBRACKET,
        SourceType.NUMBER,
      ].includes(location.type)
    ) {
      return false
    }
    consume('<')
    return true
  }

  function consumed(): string {
    return source.slice(start, index)
  }

  function setType(newType: SourceType): void {
    location = new SourceLocation(newType, start)
  }

  function match(value: string | RegExp): Array<string> | null {
    if (typeof value === 'string') {
      const matches = source.slice(index, index + value.length) === value
      return matches ? [value] : null
    } else {
      return source.slice(index).match(value)
    }
  }

  function pushInterpolation(): void {
    contextStack.push({
      type: ContextType.INTERPOLATION,
      interpolationType: location.type,
    })
    setType(SourceType.INTERPOLATION_START)
  }

  function popInterpolation(): void {
    if (currentContextType() !== ContextType.INTERPOLATION) {
      throw new Error(
        `unexpected '}' found in string at ${index}: ${JSON.stringify(source)}`
      )
    }
    setType(SourceType.INTERPOLATION_END)
  }
}

export function consumeStream(
  lexer: () => SourceLocation
): Array<SourceLocation> {
  const result: Array<SourceLocation> = []
  let location: SourceLocation
  do {
    location = lexer()
    result.push(location)
  } while (location.type !== SourceType.EOF)
  return result
}
