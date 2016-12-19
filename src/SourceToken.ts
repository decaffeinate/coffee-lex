import SourceType from './SourceType';

export default class SourceToken {
  type: SourceType;
  start: number;
  end: number;

  constructor(type: SourceType, start: number, end: number) {
    if (start > end) {
      throw new Error(`Token start may not be after end. Got ${type}, ${start}, ${end}`);
    }
    this.type = type;
    this.start = start;
    this.end = end;
  }
}
