/* @flow */

/**
 * Represents a particular type of CoffeeScript code.
 */
export default class SourceType {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
  
  toString(): string {
    return this.name;
  }
}
