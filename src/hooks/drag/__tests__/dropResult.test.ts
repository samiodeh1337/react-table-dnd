import { describe, expect, it } from 'vitest'
import { resolveDragGroup, type MountedRowInfo } from '../dragGroup'
import { dragCancelInfo, dragStartInfo, dropResult } from '../dropResult'

const rows: MountedRowInfo[] = ['a', 'b', 'c', 'd', 'e'].map((id, index) => ({
  index,
  id,
  height: 40,
  locked: false,
}))
const single = resolveDragGroup(null, rows, rows[1])
const pair = resolveDragGroup(new Set(['b', 'd']), rows, rows[1])

describe('dragStartInfo', () => {
  it('lists every row that moves', () => {
    expect(dragStartInfo(single, 'row')).toEqual({
      dragType: 'row',
      id: 'b',
      sourceIndex: 1,
      selectedIds: ['b'],
      sourceIndices: [1],
    })
    expect(dragStartInfo(pair, 'row')).toMatchObject({
      selectedIds: ['b', 'd'],
      sourceIndices: [1, 3],
    })
  })

  it('gives a column only its index', () => {
    expect(dragStartInfo(single, 'column')).toEqual({
      dragType: 'column',
      id: 'b',
      sourceIndex: 1,
    })
  })
})

describe('dropResult', () => {
  it('matches what onDragEnd reports: insertIndex is the slot in the original array', () => {
    // b moves down onto d's place: targetIndex 3 means "after d", slot 4
    expect(dropResult(single, 3, 'row')).toEqual({
      dragType: 'row',
      id: 'b',
      sourceIndex: 1,
      targetIndex: 3,
      selectedIds: ['b'],
      sourceIndices: [1],
      insertIndex: 4,
    })
    // moving up: targetIndex 0 is slot 0
    expect(dropResult(single, 0, 'row')).toMatchObject({ insertIndex: 0 })
  })

  it('gives a column source and target only', () => {
    expect(dropResult(single, 4, 'column')).toEqual({
      dragType: 'column',
      id: 'b',
      sourceIndex: 1,
      targetIndex: 4,
    })
  })
})

describe('dragCancelInfo', () => {
  it('names the grabbed item by id and index', () => {
    expect(dragCancelInfo(pair, 'row')).toEqual({ dragType: 'row', id: 'b', sourceIndex: 1 })
  })
})
