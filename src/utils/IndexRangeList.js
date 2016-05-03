type Range = { start: number, end: number };

export default class IndexRangeList {
  ranges: Array<Range>;
  length: number;

  constructor(ranges: Array<Range>=[]) {
    this.ranges = ranges;
    this.length = ranges.length;
  }
  
  getRangeContainingIndex(index: number): ?Range {
    for (let i = 0; i < this.ranges.length; i++) {
      let range = this.ranges[i];

      if (range.start <= index && index < range.end) {
        return range;
      }
    }
    
    return null;
  }

  addRange(start: number, end: number): IndexRangeList {
    return new IndexRangeList(rangeListAddingRange(this.ranges, { start, end }));
  }

  forEach(iterator: (range: Range, index?: number, list?: IndexRangeList) => void, context: any=null) {
    this.ranges.forEach((range, index) => {
      iterator.call(context, range, index, this);
    });
  }

  invert(start: number, end: number): IndexRangeList {
    let ranges = this.ranges;
    let inverted = new IndexRangeList();

    if (ranges.length === 0) {
      return inverted.addRange(start, end);
    } else if (ranges.length === 1) {
      return inverted
        .addRange(start, ranges[0].start)
        .addRange(ranges[0].end, end);
    }

    let nextStart = start;

    for (let i = 0; i < ranges.length; i++) {
      let range = ranges[i];

      inverted = inverted.addRange(
        nextStart,
        range.start
      );

      nextStart = range.end;
    }

    return inverted.addRange(nextStart, end);
  }

  toArray(): Array<Range> {
    return this.ranges.slice();
  }
}

function rangeListAddingRange(ranges: Array<Range>, range: Range): Array<Range> {
  if (range.start === range.end) {
    return ranges;
  }

  let result = [];

  ranges
    // Add the new range.
    .concat([range])
    // Sort by start of range.
    .sort((left: Range, right: Range) => left.start - right.start)
    // Add ranges to the results.
    .forEach(({ start, end }, i) => {
      if (i === 0) {
        result.push({ start, end });
      } else {
        let lastRange = result[result.length - 1];

        if (start <= lastRange.end) {
          lastRange.end = Math.max(end, lastRange.end);
        } else {
          result.push({ start, end });
        }
      }
    });

  return result;
}
