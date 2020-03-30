import SourceLocation from '../SourceLocation'
import SourceType from '../SourceType'

export default class BufferedStream {
  private _getNextLocation: () => SourceLocation
  private pending: Array<SourceLocation> = []

  constructor(stream: () => SourceLocation) {
    this._getNextLocation = stream
  }

  shift(): SourceLocation {
    return this.pending.shift() || this._getNextLocation()
  }

  hasNext(...types: Array<SourceType>): boolean {
    const locationsToPutBack: Array<SourceLocation> = []
    const result = types.every((type) => {
      const next = this.shift()
      locationsToPutBack.push(next)
      return next.type === type
    })
    this.unshift(...locationsToPutBack)
    return result
  }

  peek(): SourceLocation {
    const result = this.shift()
    this.unshift(result)
    return result
  }

  unshift(...tokens: Array<SourceLocation>): void {
    this.pending.unshift(...tokens)
  }
}
