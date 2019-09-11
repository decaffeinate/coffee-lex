/**
 * In both normal multiline strings and triple quoted strings, a newline
 * character is escaped if it's preceded by an odd number of backslashes.
 * Spaces are allowed between the backslashes and the newline.
 */
export default function isNewlineEscaped(
  content: string,
  newlinePos: number
): boolean {
  let numSeenBackslashes = 0;
  let prevPos = newlinePos - 1;
  while (prevPos >= 0) {
    const char = content[prevPos];
    if (numSeenBackslashes === 0 && (char === ' ' || char === '\t')) {
      prevPos--;
    } else if (char === '\\') {
      numSeenBackslashes++;
      prevPos--;
    } else {
      break;
    }
  }
  return numSeenBackslashes % 2 === 1;
}
