import { SourceToken } from './SourceToken'
import { SourceTokenListIndex } from './SourceTokenListIndex'
import { SourceType } from './SourceType'
import { assert } from './utils/assert'

export type SourceTokenListIndexRange = [
  SourceTokenListIndex,
  SourceTokenListIndex
]

/**
 * Represents a list of tokens and provides various utility functions for
 * finding tokens within it.
 */
export class SourceTokenList {
  private _tokens: Array<SourceToken>
  private _indexCache: Array<SourceTokenListIndex>
  private _indexBySourceIndex: Array<SourceTokenListIndex>
  private _indexByStartSourceIndex: Array<SourceTokenListIndex>
  private _indexByEndSourceIndex: Array<SourceTokenListIndex>
  readonly length: number
  readonly startIndex: SourceTokenListIndex
  readonly endIndex: SourceTokenListIndex

  constructor(tokens: Array<SourceToken>) {
    this._validateTokens(tokens)
    this._tokens = tokens
    this._indexCache = new Array(tokens.length)
    this.length = tokens.length
    this.startIndex = this._getIndex(0)
    this.endIndex = this._getIndex(tokens.length)

    // Precompute sparse arrays to do source-to-token mappings later. Iterate
    // backwards through the tokens so that earlier tokens win ties.
    this._indexBySourceIndex = []
    this._indexByStartSourceIndex = []
    this._indexByEndSourceIndex = []
    for (let tokenIndex = tokens.length - 1; tokenIndex >= 0; tokenIndex--) {
      const token = tokens[tokenIndex]
      for (
        let sourceIndex = token.start;
        sourceIndex < token.end;
        sourceIndex++
      ) {
        this._indexBySourceIndex[sourceIndex] = this._getIndex(tokenIndex)
      }
      this._indexByStartSourceIndex[token.start] = this._getIndex(tokenIndex)
      this._indexByEndSourceIndex[token.end] = this._getIndex(tokenIndex)
    }
  }

  /**
   * Iterate over each token.
   */
  forEach(
    iterator: (
      token: SourceToken,
      index: SourceTokenListIndex,
      list: SourceTokenList
    ) => void
  ): void {
    this._tokens.forEach((token, i) => iterator(token, this._getIndex(i), this))
  }

  /**
   * Map each token to an element of an array.
   */
  map<T>(
    mapper: (
      token: SourceToken,
      index: SourceTokenListIndex,
      list: SourceTokenList
    ) => T
  ): Array<T> {
    const result: Array<T> = []
    this.forEach((token, index, list) => {
      result.push(mapper(token, index, list))
    })
    return result
  }

  /**
   * Filter tokens by a predicate.
   */
  filter(
    predicate: (
      token: SourceToken,
      index: SourceTokenListIndex,
      list: SourceTokenList
    ) => boolean
  ): SourceTokenList {
    const result: Array<SourceToken> = []
    this.forEach((token, index, list) => {
      if (predicate(token, index, list)) {
        result.push(token)
      }
    })
    return new SourceTokenList(result)
  }

  /**
   * Get a slice of this token list using the given indexes.
   */
  slice(
    start: SourceTokenListIndex,
    end: SourceTokenListIndex
  ): SourceTokenList {
    assert(
      start['_sourceTokenList'] === this && end['_sourceTokenList'] === this,
      'cannot slice a list using indexes from another list'
    )
    return new SourceTokenList(
      this._tokens.slice(start['_index'], end['_index'])
    )
  }

  /**
   * Get the token at the given index, if it exists.
   *
   * NOTE: The only value for which this should return `null` is this list's
   * `endIndex`.
   */
  tokenAtIndex(index: SourceTokenListIndex): SourceToken | null {
    this._validateIndex(index)
    return this._tokens[index['_index']] || null
  }

  /**
   * Get the range of tokens representing an interpolated string that contains
   * the token at `index`. This will return the innermost interpolated string in
   * the case of nesting.
   */
  rangeOfInterpolatedStringTokensContainingTokenIndex(
    index: SourceTokenListIndex
  ): SourceTokenListIndexRange | null {
    let bestRange: SourceTokenListIndexRange | null = null
    for (const [startType, endType] of [
      [SourceType.DSTRING_START, SourceType.DSTRING_END],
      [SourceType.TDSTRING_START, SourceType.TDSTRING_END],
      [SourceType.HEREGEXP_START, SourceType.HEREGEXP_END],
    ]) {
      const range = this.rangeOfMatchingTokensContainingTokenIndex(
        startType,
        endType,
        index
      )
      if (
        bestRange === null ||
        bestRange === undefined ||
        (range !== null &&
          range !== undefined &&
          range[0].distance(range[1]) < bestRange[0].distance(bestRange[1]))
      ) {
        bestRange = range
      }
    }
    return bestRange
  }

  /**
   * Get the range of tokens starting with a token of type `startType` and
   * ending one past a token of type `endType`, ensuring that the tokens match.
   * That is, it ensures they are balanced and properly account for nesting.
   * This range will contain `index`. If no such range can be found, `null` is
   * returned.
   */
  rangeOfMatchingTokensContainingTokenIndex(
    startType: SourceType,
    endType: SourceType,
    index: SourceTokenListIndex
  ): SourceTokenListIndexRange | null {
    this._validateIndex(index)

    const token = this.tokenAtIndex(index)
    if (!token) {
      return null
    }

    switch (token.type) {
      case startType: {
        let level = 0
        const start = index

        const endIndex = this.indexOfTokenMatchingPredicate((token) => {
          if (token.type === startType) {
            level += 1
          } else if (token.type === endType) {
            level -= 1
            if (level === 0) {
              return true
            }
          }
          return false
        }, start)

        if (!endIndex) {
          return null
        } else {
          const rangeEnd = endIndex.next()
          if (!rangeEnd) {
            return null
          }
          return [start, rangeEnd]
        }
      }

      case endType: {
        let level = 0
        const endIndex = index

        const startIndex = this.lastIndexOfTokenMatchingPredicate((token) => {
          if (token.type === startType) {
            level -= 1
            if (level === 0) {
              return true
            }
          } else if (token.type === endType) {
            level += 1
          }
          return false
        }, endIndex)

        if (!startIndex) {
          return null
        } else {
          const rangeEnd = endIndex.next()
          if (!rangeEnd) {
            return null
          } else {
            return [startIndex, rangeEnd]
          }
        }
      }

      default: {
        let level = 0
        const startIndex = this.lastIndexOfTokenMatchingPredicate((token) => {
          if (token.type === startType) {
            if (level === 0) {
              return true
            }
            level -= 1
          } else if (token.type === endType) {
            level += 1
          }
          return false
        }, index)

        if (!startIndex) {
          return null
        } else {
          return this.rangeOfMatchingTokensContainingTokenIndex(
            startType,
            endType,
            startIndex
          )
        }
      }
    }
  }

  /**
   * Finds the index of the token whose source range includes the given index.
   * If the given index does not correspond to the range of a token, returns
   * null.
   */
  indexOfTokenContainingSourceIndex(
    index: number
  ): SourceTokenListIndex | null {
    this._validateSourceIndex(index)
    return this._indexBySourceIndex[index] || null
  }

  /**
   * If the given source index lands on a token, return the index of that token.
   * Otherwise, return the index of the previous token in the source code, or
   * the first token if there is no previous token.
   */
  indexOfTokenNearSourceIndex(index: number): SourceTokenListIndex {
    this._validateSourceIndex(index)
    for (let searchIndex = index; searchIndex >= 0; searchIndex--) {
      const tokenIndex = this._indexBySourceIndex[searchIndex]
      if (tokenIndex) {
        return tokenIndex
      }
    }
    return this.startIndex
  }

  /**
   * Finds the index of the token whose source range starts at the given index.
   */
  indexOfTokenStartingAtSourceIndex(
    index: number
  ): SourceTokenListIndex | null {
    this._validateSourceIndex(index)
    return this._indexByStartSourceIndex[index] || null
  }

  /**
   * Finds the index of the token whose source range ends at the given index.
   */
  indexOfTokenEndingAtSourceIndex(index: number): SourceTokenListIndex | null {
    this._validateSourceIndex(index)
    return this._indexByEndSourceIndex[index] || null
  }

  /**
   * Finds the index of the first token matching a predicate.
   */
  indexOfTokenMatchingPredicate(
    predicate: (token: SourceToken) => boolean,
    start: SourceTokenListIndex | null = null,
    end: SourceTokenListIndex | null = null
  ): SourceTokenListIndex | null {
    if (!start) {
      start = this.startIndex
    }
    if (!end) {
      end = this.endIndex
    }
    this._validateIndex(start)
    this._validateIndex(end)

    for (
      let i: SourceTokenListIndex | null = start;
      i && i !== end;
      i = i.next()
    ) {
      const token = this.tokenAtIndex(i)
      if (!token) {
        break
      } else if (predicate(token)) {
        return i
      }
    }

    return null
  }

  /**
   * Finds the index of the first token matching a predicate, traversing
   * backwards.
   */
  lastIndexOfTokenMatchingPredicate(
    predicate: (token: SourceToken) => boolean,
    start: SourceTokenListIndex | null = null,
    end: SourceTokenListIndex | null = null
  ): SourceTokenListIndex | null {
    if (!start) {
      start = this.endIndex.previous()
      if (!start) {
        return null
      }
    }
    this._validateIndex(start)
    if (end) {
      this._validateIndex(end)
    }

    let i: SourceTokenListIndex | null = start
    do {
      const token = this.tokenAtIndex(i)
      if (!token) {
        break
      } else if (predicate(token)) {
        return i
      } else {
        i = i.previous()
      }
    } while (i && i !== end)

    return null
  }

  /**
   * Allow iterating over the tokens in this list using e.g. `for (… of …)`.
   */
  [Symbol.iterator](): Iterator<SourceToken> {
    let index = this.startIndex
    const { endIndex } = this
    return {
      next(): IteratorResult<SourceToken> {
        if (index === endIndex) {
          return { done: true, value: undefined }
        } else {
          const result = { done: false, value: this.tokenAtIndex(index) }
          const nextIndex = index.next()

          assert(nextIndex, `unexpected null index before the end index`)

          index = nextIndex
          return result
        }
      },
    }
  }

  /**
   * @internal
   */
  private _validateTokens(tokens: Array<SourceToken>): void {
    for (let i = 0; i < tokens.length - 1; i++) {
      assert(
        tokens[i].end <= tokens[i + 1].start,
        `Tokens not in order. Expected ${JSON.stringify(tokens[i])} before ` +
          `${JSON.stringify(tokens[i + 1])}`
      )
    }
  }

  /**
   * @internal
   */
  private _validateIndex(index: SourceTokenListIndex | null): void {
    assert(
      index,
      `unexpected 'null' index, perhaps you forgot to check the result of ` +
        `'indexOfTokenContainingSourceIndex'?`
    )
    assert(
      typeof index !== 'number',
      `to get a token at index ${index}, ` +
        `use list.tokenAtIndex(list.startIndex.advance(${index}))`
    )
    assert(
      index['_sourceTokenList'] === this,
      'cannot get token in one list using an index from another'
    )
  }

  /**
   * @internal
   */
  private _validateSourceIndex(index: number): void {
    assert(
      typeof index === 'number',
      `expected source index to be a number, got: ${index}`
    )
  }

  /**
   * @internal
   */
  private _getIndex(index: number): SourceTokenListIndex {
    let cached = this._indexCache[index]

    if (!cached) {
      cached = new SourceTokenListIndex(this, index)
      this._indexCache[index] = cached
    }

    return cached
  }

  /**
   * Get the list of tokens.
   */
  toArray(): Array<SourceToken> {
    return this._tokens.slice()
  }
}
