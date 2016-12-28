import SourceLocation from '../SourceLocation';
import SourceType from '../SourceType';

export default class BufferedStream {
  private _getNextLocation: () => SourceLocation;
  private pending: Array<SourceLocation> = [];

  constructor(stream: () => SourceLocation) {
    this._getNextLocation = stream;
  }

  shift(): SourceLocation {
    return this.pending.shift() || this._getNextLocation();
  }

  hasNext(...types: Array<SourceType>): boolean {
    let locationsToPutBack: Array<SourceLocation> = [];
    let result = types.every(type => {
      let next = this.shift();
      locationsToPutBack.push(next);
      return next.type === type;
    });
    this.unshift(...locationsToPutBack);
    return result;
  }

  peek(): SourceLocation {
    let result = this.shift();
    this.unshift(result);
    return result;
  }

  unshift(...tokens: Array<SourceLocation>) {
    this.pending.unshift(...tokens);
  }
}
