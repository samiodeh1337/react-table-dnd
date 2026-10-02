import { describe, expect, it } from 'vitest'
import {
  countBelow,
  countMidpointsBefore,
  gapToTargetIndex,
  resolveDrop,
  toInsertIndex,
} from '../dropMath'

// Collapsed list builder: rows with heights, minus the dragged ones, later rows pulled up.
const HEIGHTS = [36, 40, 36, 60, 36, 50, 36, 36]
function collapsed(dragged: number[]) {
  const tops: number[] = []
  let y = 0
  for (const h of HEIGHTS) {
    tops.push(y)
    y += h
  }
  const items: { index: string; itemTop: number; height: number }[] = []
  for (let i = 0; i < HEIGHTS.length; i++) {
    if (dragged.includes(i)) continue
    let above = 0
    for (const d of dragged) if (d < i) above += HEIGHTS[d]
    items.push({ index: String(i), itemTop: tops[i] - above, height: HEIGHTS[i] })
  }
  return items
}
const start = (it: { itemTop: number }) => it.itemTop
const size = (it: { height: number }) => it.height

describe('countBelow', () => {
  it('counts entries strictly below the value', () => {
    expect(countBelow([1, 3, 5], 0)).toBe(0)
    expect(countBelow([1, 3, 5], 1)).toBe(0)
    expect(countBelow([1, 3, 5], 2)).toBe(1)
    expect(countBelow([1, 3, 5], 4)).toBe(2)
    expect(countBelow([1, 3, 5], 6)).toBe(3)
    expect(countBelow([], 6)).toBe(0)
  })
})

describe('single row: swap needs half the neighbour, both directions', () => {
  // drag row 1 (40px). Collapsed: 0@0 (36), 2@36 (36), 3@72 (60), 4@132 …
  const items = collapsed([1])
  it('at rest the row stays in its slot', () => {
    // card top at rest = layout top of row 1 = 36; midpoints: 18, 54 → gap 1 → insert before row 2 → target 1
    expect(resolveDrop(items, start, size, 36, 1)).toBe(1)
  })
  it('14px down (< half of row 2 = 18) does not swap', () => {
    expect(resolveDrop(items, start, size, 50, 1)).toBe(1)
  })
  it('past half of row 2 swaps with it', () => {
    expect(resolveDrop(items, start, size, 55, 1)).toBe(2)
  })
  it('past half of row 0 (upward) swaps with it', () => {
    expect(resolveDrop(items, start, size, 17, 1)).toBe(0)
  })
  it('the neighbour size sets the threshold: row 3 is 60px, so 30px of travel', () => {
    // after swapping with row 2 (card top 72 = collapsed top of row 3): row 3 midpoint 102
    expect(resolveDrop(items, start, size, 101, 1)).toBe(2)
    expect(resolveDrop(items, start, size, 103, 1)).toBe(3)
  })
  it('past the last row lands at the end', () => {
    expect(resolveDrop(items, start, size, 10_000, 1)).toBe(7)
  })
})

describe('group: the card is the grabbed row, members vanish', () => {
  // drag {1,3,5} holding 3 (60px). Collapsed: 0@0, 2@36, 4@72, 6@108, 7@144
  const items = collapsed([1, 3, 5])
  it('at rest: card top 108 → gap 3 → insert before row 6 → target 5', () => {
    expect(countMidpointsBefore(items, start, size, 108)).toBe(3)
    expect(resolveDrop(items, start, size, 108, 3)).toBe(5)
  })
  it('14px down keeps the gap; past half of row 6 (18px) moves it', () => {
    expect(resolveDrop(items, start, size, 122, 3)).toBe(5)
    expect(resolveDrop(items, start, size, 127, 3)).toBe(6)
  })
  it('26px up: past half of row 4 → insert before row 4 → target 3', () => {
    expect(resolveDrop(items, start, size, 82, 3)).toBe(3)
  })
})

describe('gapToTargetIndex ↔ toInsertIndex', () => {
  const items = collapsed([2]) // rows 0,1,3,4,5,6,7
  it('gap before row k gives insertIndex k; targetIndex is the 2.x convention', () => {
    expect(gapToTargetIndex(0, items, 2)).toBe(0) // before row 0
    expect(gapToTargetIndex(2, items, 2)).toBe(2) // before row 3 → insert 3 → target 2 (no move)
    expect(gapToTargetIndex(3, items, 2)).toBe(3) // before row 4 → insert 4 → target 3
    expect(gapToTargetIndex(7, items, 2)).toBe(7) // past the end → insert 8 → target 7
  })
  it('round-trips through toInsertIndex', () => {
    for (let gap = 0; gap <= items.length; gap++) {
      const insert = gap < items.length ? +items[gap].index : 8
      const target = gapToTargetIndex(gap, items, 2)
      const back = toInsertIndex(2, target)
      // insert == source + 1 and insert == source are the same gap once the source is removed
      expect(back === insert || (insert === 3 && back === 2)).toBe(true)
    }
  })
  it('empty list returns the source', () => {
    expect(gapToTargetIndex(0, [], 4)).toBe(4)
  })
})
