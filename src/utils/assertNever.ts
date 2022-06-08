/**
 * Assert that a value is never used.
 */
export function assertNever(
  value: never,
  message = `unexpected value: ${value}`
): never {
  throw new Error(message)
}
