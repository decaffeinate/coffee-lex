declare module 'decaffeinate-coffeescript' {
  export type Token = [string, string];
  export function tokens(source: string): Array<Token>;
}
