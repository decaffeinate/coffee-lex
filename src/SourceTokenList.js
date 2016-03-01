import SourceToken from './SourceToken.js';
import SourceTokenListIndex from './SourceTokenListIndex.js';
import SourceType from './SourceType.js';
import { STRING_END, STRING_START } from './index.js';

type SourceTokenListIndexRange = [SourceTokenListIndex, SourceTokenListIndex];

/**
 * Represents a list of tokens and provides various utility functions for
 * finding tokens within it.
 */
export default class SourceTokenList {
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
   * Filter tokens by a predicate.
   */
  filter(predicate: (token: SourceToken, index: SourceTokenListIndex, list: SourceTokenList) => boolean): SourceTokenList {
    let result = [];
    this.forEach((token, index, list) => {
      if (predicate(token, index, list)) {
        result.push(token);
      }
    });
    return new SourceTokenList(result);
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
    this._validateIndex(index);
    return this._tokens[index._index] || null;
  }

  /**
   * Get the range of tokens representing an interpolated string that contains
   * the token at `index`. This will return the innermost interpolated string in
   * the case of nesting.
   */
  rangeOfInterpolatedStringTokensContainingTokenIndex(index: SourceTokenListIndex): ?SourceTokenListIndexRange {
    return this.rangeOfMatchingTokensContainingTokenIndex(
      STRING_START,
      STRING_END,
      index
    );
  }

  /**
   * Get the range of tokens starting with a token of type `startType` and
   * ending one past a token of type `endType`, ensuring that the tokens match.
   * That is, it ensures they are balanced and properly account for nesting.
   * This range will contain `index`. If no such range can be found, `null` is
   * returned.
   */
  rangeOfMatchingTokensContainingTokenIndex(startType: SourceType, endType: SourceType, index: SourceTokenListIndex): ?SourceTokenListIndexRange {
    this._validateIndex(index);

    let token = this.tokenAtIndex(index);
    if (!token) {
      return null;
    }

    switch (token.type) {
      case startType:
      {
        let level = 0;
        let start = index;

        let endIndex = this.indexOfTokenMatchingPredicate(token => {
          if (token.type === startType) {
            level += 1;
          } else if (token.type === endType) {
            level -= 1;
            if (level === 0) {
              return true;
            }
          }
          return false;
        }, start);

        if (!endIndex) {
          return null;
        } else {
          let rangeEnd = endIndex.next();
          if (!rangeEnd) {
            return null;
          }
          return [start, rangeEnd];
        }
      }

      case endType:
      {
        let level = 0;
        let endIndex = index;

        let startIndex = this.lastIndexOfTokenMatchingPredicate(token => {
          if (token.type === startType) {
            level -= 1;
            if (level === 0) {
              return true;
            }
          } else if (token.type === endType) {
            level += 1;
          }
          return false;
        }, endIndex);

        if (!startIndex) {
          return null;
        } else {
          let rangeEnd = endIndex.next();
          if (!rangeEnd) {
            return null;
          } else {
            return [startIndex, rangeEnd];
          }
        }
      }

      default:
      {
        let level = 0;
        let startIndex = this.lastIndexOfTokenMatchingPredicate(token => {
          if (token.type === startType) {
            if (level === 0) {
              return true;
            }
            level -= 1;
          } else if (token.type === endType) {
            level += 1;
          }
          return false;
        }, index);

        if (!startIndex) {
          return null;
        } else {
          return this.rangeOfMatchingTokensContainingTokenIndex(startType, endType, startIndex);
        }
      }
    }
  }

  /**
   * Finds the index of the token whose source range includes the given index.
   */
  indexOfTokenContainingSourceIndex(index: number): ?SourceTokenListIndex {
    this._validateSourceIndex(index);
    return this.indexOfTokenMatchingPredicate(({ start, end }) => start <= index && index < end);
  }

  /**
   * Finds the index of the token whose source range starts at the given index.
   */
  indexOfTokenStartingAtSourceIndex(index: number): ?SourceTokenListIndex {
    this._validateSourceIndex(index);
    return this.indexOfTokenMatchingPredicate(({ start }) => start === index);
  }

  /**
   * Finds the index of the token whose source range ends at the given index.
   */
  indexOfTokenEndingAtSourceIndex(index: number): ?SourceTokenListIndex {
    this._validateSourceIndex(index);
    return this.indexOfTokenMatchingPredicate(({ end }) => end === index);
  }

  /**
   * Finds the index of the first token matching a predicate.
   */
  indexOfTokenMatchingPredicate(predicate: (token: SourceToken) => boolean, start: ?SourceTokenListIndex=null): ?SourceTokenListIndex {
    if (!start) {
      start = this.startIndex;
    }
    this._validateIndex(start);

    let { endIndex } = this;
    for (let i = start; i && i !== endIndex; i = i.next()) {
      let token = this.tokenAtIndex(i);
      if (!token) {
        break;
      } else if (predicate(token)) {
        return i;
      }
    }

    return null;
  }

  /**
   * Finds the index of the first token matching a predicate.
   */
  lastIndexOfTokenMatchingPredicate(predicate: (token: SourceToken) => boolean, start: ?SourceTokenListIndex=null): ?SourceTokenListIndex {
    if (!start) {
      start = this.endIndex.previous();
      if (!start) {
        return null;
      }
    }
    this._validateIndex(start);

    let { startIndex } = this;
    let i = start;
    do {
      let token = this.tokenAtIndex(i);
      if (!token) {
        break;
      } else if (predicate(token)) {
        return i;
      } else if (i) {
        i = i.previous();
      }
    } while (i && i !== startIndex);

    return null;
  }

  /**
   * Allow iterating over the tokens in this list using e.g. `for (… of …)`.
   *
   * $FlowIssue (see facebook/flow#252)
   */
  [Symbol.iterator]() {
    let index = this.startIndex;
    let { endIndex } = this;
    return () => {
      if (index === endIndex) {
        return { done: true, value: undefined };
      } else {
        let result = { done: false, value: this.tokenAtIndex(index) };
        index = index.next();
        return result;
      }
    };
  }

  /**
   * @internal
   */
  _validateIndex(index: ?SourceTokenListIndex) {
    if (!index) {
      throw new Error(
        `unexpected 'null' index, perhaps you forgot to check the result of ` +
        `'indexOfTokenContainingSourceIndex'?`
      );
    }
    if (typeof index === 'number') {
      throw new Error(
        `to get a token at index ${index}, ` +
        `use list.tokenAtIndex(list.startIndex.advance(${index}))`
      );
    }
    if (index._sourceTokenList !== this) {
      throw new Error('cannot get token in one list using an index from another');
    }
  }

  /**
   * @internal
   */
  _validateSourceIndex(index: number) {
    if (typeof index !== 'number') {
      throw new Error(`expected source index to be a number, got: ${index}`);
    }
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
