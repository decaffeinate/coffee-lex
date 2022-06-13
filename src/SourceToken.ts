import { SourceType } from './SourceType'
import { assert } from './utils/assert'

export class SourceToken {
  constructor(
    readonly type: SourceType,
    readonly start: number,
    readonly end: number
  ) {
    assert(start <= end, `Token start may not be after end. Got ${type}, ${start}, ${end}`)
  }
}
