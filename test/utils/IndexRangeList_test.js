import IndexRangeList from '../../src/utils/IndexRangeList.js';
import { deepEqual } from 'assert';

describe('IndexRangeList', () => {
  it('does not change a single range being added', () => {
    deepEqual(
      new IndexRangeList().addRange(2, 4).toArray(),
      [{ start: 2, end: 4 }]
    );
  });

  it('merges adjacent ranges from below', () => {
    deepEqual(
      new IndexRangeList().addRange(2, 4).addRange(0, 2).toArray(),
      [{ start: 0, end: 4 }]
    );
  });

  it('merges adjacent ranges from above', () => {
    deepEqual(
      new IndexRangeList().addRange(0, 2).addRange(2, 4).toArray(),
      [{ start: 0, end: 4 }]
    );
  });

  it('ignores added ranges that are subsets of existing ranges', () => {
    deepEqual(
      new IndexRangeList().addRange(0, 4).addRange(2, 3).toArray(),
      [{ start: 0, end: 4 }]
    );
  });

  it('ignores empty ranges', () => {
    deepEqual(
      new IndexRangeList().addRange(1, 1).toArray(),
      []
    );
  });

  it('subsumes existing ranges in new ranges that encompass them', () => {
    deepEqual(
      new IndexRangeList().addRange(1, 2).addRange(3, 4).addRange(0, 5).toArray(),
      [{ start: 0, end: 5 }]
    );
  });

  it('can invert inside an outer range', () => {
    deepEqual(
      new IndexRangeList().addRange(1, 2).invert(0, 3).toArray(),
      [{ start: 0, end: 1 }, { start: 2, end: 3 }]
    );
  });

  it('can invert inside an outer range', () => {
    deepEqual(
      new IndexRangeList().addRange(1, 2).invert(0, 3).toArray(),
      [{ start: 0, end: 1 }, { start: 2, end: 3 }]
    );
  });

  it('inverts without creating empty ranges', () => {
    deepEqual(
      new IndexRangeList().addRange(1, 2).invert(1, 3).toArray(),
      [{ start: 2, end: 3 }]
    );
  });
});
