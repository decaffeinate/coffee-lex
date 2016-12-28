import SourceType from './SourceType';

/**
 * Represents a change in source code type at a particular index.
 */
export default class SourceLocation {
  readonly type: SourceType;
  readonly index: number;

  constructor(type: SourceType, index: number) {
    this.type = type;
    this.index = index;
  }
}
