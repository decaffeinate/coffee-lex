import SourceToken from './SourceToken.js';
import SourceTokenListIndex from './SourceTokenListIndex.js';

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
