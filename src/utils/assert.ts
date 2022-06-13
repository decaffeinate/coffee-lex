/**
 * Asserts `condition` is truthy.
 */
export function assert(
  condition: unknown,
  message = `expected '${condition}' to be truthy`
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Assert that a value is never used.
 */
export function assertNever(
  value: never,
  message = `unexpected value: ${value}`
): never {
  throw new Error(message)
}
