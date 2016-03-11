import SourceTokenList from './SourceTokenList.js';

/**
 * Represents a token at a particular index within a list of tokens.
 */
export default class SourceTokenListIndex {
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

  /**
   * Determines whether this index comes before another.
   */
  isBefore(other: SourceTokenListIndex): boolean {
    return this.compare(other) > 0;
  }

  /**
   * Determines whether this index comes after another.
   */
  isAfter(other: SourceTokenListIndex): boolean {
    return this.compare(other) < 0;
  }

  /**
   * Compare this index to another, returning 0 for equality, a negative number
   * if this is less than `other`, and a positive number otherwise.
   */
  compare(other: SourceTokenListIndex): number {
    if (other._sourceTokenList !== this._sourceTokenList) {
      throw new Error('cannot compare indexes from different lists');
    }
    return other._index - this._index;
  }
}
