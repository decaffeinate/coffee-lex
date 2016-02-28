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
}
