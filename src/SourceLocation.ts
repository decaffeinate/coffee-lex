import { SourceType } from './SourceType'

/**
 * Represents a change in source code type at a particular index.
 */
export class SourceLocation {
  constructor(readonly type: SourceType, readonly index: number) {}
}
