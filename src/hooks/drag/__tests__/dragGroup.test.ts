import { describe, expect, it } from 'vitest'
import {
  memberHeightAbove,
  memberPrefixHeights,
  resolveDragGroup,
  type MountedRowInfo,
} from '../dragGroup'

const HEIGHTS = [36, 40, 36, 60, 36, 50, 36, 36]
const rows = (locked: number[] = []): MountedRowInfo[] =>
  HEIGHTS.map((height, index) => ({
    index,
    id: 'row-' + index,
    height,
    locked: locked.includes(index),
  }))
const grab = (index: number): MountedRowInfo => ({
  index,
  id: 'row-' + index,
  height: HEIGHTS[index],
  locked: false,
})

describe('resolveDragGroup', () => {
  it('no selection → a group of one (the grabbed row)', () => {
    const g = resolveDragGroup(null, rows(), grab(3))
    expect(g).toMatchObject({
      ids: ['row-3'],
      indices: [3],
      grabbed: 3,
      grabbedId: 'row-3',
      cardHeight: 60,
      count: 1,
    })
    expect(g.heights.get(3)).toBe(60)
  })
  it('grabbed row not in the selection → a group of one', () => {
    const g = resolveDragGroup(new Set(['row-1', 'row-5']), rows(), grab(3))
    expect(g.count).toBe(1)
    expect(g.ids).toEqual(['row-3'])
  })
  it('grabbed row in a multi-row selection → every selected mounted row, table order', () => {
    const g = resolveDragGroup(new Set(['row-5', 'row-1', 'row-3']), rows(), grab(3))
    expect(g.ids).toEqual(['row-1', 'row-3', 'row-5'])
    expect(g.indices).toEqual([1, 3, 5])
    expect([...g.indexSet].sort()).toEqual([1, 3, 5])
    expect(g.heights.get(1)).toBe(40)
    expect(g.heights.get(5)).toBe(50)
    expect(g.grabbed).toBe(3)
    expect(g.cardHeight).toBe(60) // the grabbed row's height, not the total
    expect(g.count).toBe(3)
  })
  it('locked rows never move with a group', () => {
    const g = resolveDragGroup(new Set(['row-0', 'row-3', 'row-5']), rows([0]), grab(3))
    expect(g.ids).toEqual(['row-3', 'row-5'])
    expect(g.indices).toEqual([3, 5])
  })
  it('a group that lost every other member to the lock is a group of one', () => {
    const g = resolveDragGroup(new Set(['row-0', 'row-3']), rows([0]), grab(3))
    expect(g.count).toBe(1)
    expect(g.ids).toEqual(['row-3'])
  })
  it('in a table that renders every row, a selected id with no row (removed) is left out', () => {
    const g = resolveDragGroup(new Set(['row-3', 'row-999', 'row-1']), rows(), grab(3), false)
    expect(g.ids).toEqual(['row-1', 'row-3'])
    expect(g.count).toBe(2)
  })
  it('selected rows that are not mounted (virtual) are appended to ids but not indices', () => {
    const g = resolveDragGroup(new Set(['row-3', 'row-999', 'row-1']), rows(), grab(3))
    expect(g.ids).toEqual(['row-1', 'row-3', 'row-999'])
    expect(g.indices).toEqual([1, 3])
    expect(g.count).toBe(3)
  })
})

describe('memberPrefixHeights / memberHeightAbove', () => {
  const g = resolveDragGroup(new Set(['row-1', 'row-3', 'row-5']), rows(), grab(3))
  it('prefix is the running total of member heights', () => {
    expect(memberPrefixHeights(g)).toEqual([0, 40, 100, 150])
  })
  it('hidden height above a row counts only members with a smaller index', () => {
    expect(memberHeightAbove(g, 0)).toBe(0)
    expect(memberHeightAbove(g, 2)).toBe(40)
    expect(memberHeightAbove(g, 4)).toBe(100)
    expect(memberHeightAbove(g, 6)).toBe(150)
    expect(memberHeightAbove(g, 7)).toBe(150)
  })
})
