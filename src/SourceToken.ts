import { SourceType } from './SourceType'

export class SourceToken {
  constructor(
    readonly type: SourceType,
    readonly start: number,
    readonly end: number
  ) {
    if (start > end) {
      throw new Error(
        `Token start may not be after end. Got ${type}, ${start}, ${end}`
      )
    }
  }
}

export default SourceToken