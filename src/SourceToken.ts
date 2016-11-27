import SourceType from './SourceType';

export default class SourceToken {
  type: SourceType;
  start: number;
  end: number;

  constructor(type: SourceType, start: number, end: number) {
    this.type = type;
    this.start = start;
    this.end = end;
  }
}
