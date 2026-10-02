import { describe, expect, it } from 'vitest'
import { arrayMoveMultiple, isIndexOutOfRange, moveRowsById } from '../../../Components/utils'

const rows = ['A', 'B', 'C', 'D', 'E', 'F']

describe('arrayMoveMultiple', () => {
  it('moves one row like the classic arrayMove', () => {
    // drag B (1) to the gap before E (4): A C D B E F
    expect(arrayMoveMultiple(rows, [1], 4)).toEqual(['A', 'C', 'D', 'B', 'E', 'F'])
    // drag E (4) to the gap before B (1): A E B C D F
    expect(arrayMoveMultiple(rows, [4], 1)).toEqual(['A', 'E', 'B', 'C', 'D', 'F'])
  })
  it('moves a group together, keeping its relative order', () => {
    expect(arrayMoveMultiple(rows, [4, 1], 5)).toEqual(['A', 'C', 'D', 'B', 'E', 'F'])
    expect(arrayMoveMultiple(rows, [1, 3], 0)).toEqual(['B', 'D', 'A', 'C', 'E', 'F'])
    expect(arrayMoveMultiple(rows, [0, 2], 6)).toEqual(['B', 'D', 'E', 'F', 'A', 'C'])
  })
  it('the gap counts in the original array', () => {
    // gap before F is 5; two moved rows sit before it, so the splice happens at 3 in the rest
    expect(arrayMoveMultiple(rows, [1, 4], 5)).toEqual(['A', 'C', 'D', 'B', 'E', 'F'])
  })
  it('a gap that equals the source is a no-op', () => {
    expect(arrayMoveMultiple(rows, [2], 2)).toEqual(rows)
    expect(arrayMoveMultiple(rows, [2], 3)).toEqual(rows)
  })
  it('ignores duplicates and out-of-range indices, clamps a stale gap', () => {
    expect(arrayMoveMultiple(rows, [1, 1, 99, -1], 4)).toEqual(['A', 'C', 'D', 'B', 'E', 'F'])
    expect(arrayMoveMultiple(rows, [1], 99)).toEqual(['A', 'C', 'D', 'E', 'F', 'B'])
    expect(arrayMoveMultiple(rows, [], 3)).toBe(rows)
  })
  it('does not mutate the input', () => {
    const copy = [...rows]
    arrayMoveMultiple(rows, [1, 2], 5)
    expect(rows).toEqual(copy)
  })
})

describe('moveRowsById', () => {
  const data = [
    { id: 1, n: 'A' },
    { id: 2, n: 'B' },
    { id: 3, n: 'C' },
    { id: 4, n: 'D' },
  ]
  it('finds rows by id (numeric ids match string ids from the library)', () => {
    expect(moveRowsById(data, ['2', '4'], 0).map((r) => r.n)).toEqual(['B', 'D', 'A', 'C'])
    expect(moveRowsById(data, [2, 4], 0).map((r) => r.n)).toEqual(['B', 'D', 'A', 'C'])
  })
  it('accepts a custom id getter', () => {
    const custom = data.map((r) => ({ key: 'k' + r.id, n: r.n }))
    expect(moveRowsById(custom, ['k1'], 3, (r) => r.key).map((r) => r.n)).toEqual([
      'B',
      'C',
      'A',
      'D',
    ])
  })
  it('ids that are not in the array are ignored', () => {
    expect(moveRowsById(data, ['2', 'nope'], 4).map((r) => r.n)).toEqual(['A', 'C', 'D', 'B'])
  })
})

describe('isIndexOutOfRange (DragRange.end is inclusive)', () => {
  it('locks below start and above end', () => {
    expect(isIndexOutOfRange(0, 1, 5)).toBe(true)
    expect(isIndexOutOfRange(1, 1, 5)).toBe(false)
    expect(isIndexOutOfRange(5, 1, 5)).toBe(false)
    expect(isIndexOutOfRange(6, 1, 5)).toBe(true)
    expect(isIndexOutOfRange('3', undefined, undefined)).toBe(false)
  })
})
