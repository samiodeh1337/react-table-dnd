import { describe, expect, it } from 'vitest'
import { resolveDragGroup, type MountedRowInfo } from '../dragGroup'
import { affectedRange, placeholderSlot, shiftFor } from '../shiftMath'

const HEIGHTS = [36, 40, 36, 60, 36, 50, 36, 36]
const rows = (): MountedRowInfo[] =>
  HEIGHTS.map((height, index) => ({ index, id: 'row-' + index, height, locked: false }))
const grab = (index: number): MountedRowInfo => ({
  index,
  id: 'row-' + index,
  height: HEIGHTS[index],
  locked: false,
})
const tops = (() => {
  const t: number[] = []
  let y = 0
  for (const h of HEIGHTS) {
    t.push(y)
    y += h
  }
  return t
})()
const free = (members: number[]) => HEIGHTS.map((_, i) => i).filter((i) => !members.includes(i))

describe('shiftFor — the two moves', () => {
  // selected 1,3,5; holding 3 (60px card)
  const g = resolveDragGroup(new Set(['row-1', 'row-3', 'row-5']), rows(), grab(3))

  it('gap 0: every visible row is past the gap (+60) and falls by the hidden height above it', () => {
    expect(shiftFor(g, 0, 0)).toBe(60) // 0 hidden above, +60
    expect(shiftFor(g, 0, 2)).toBe(20) // −40 + 60
    expect(shiftFor(g, 0, 4)).toBe(-40) // −100 + 60
    expect(shiftFor(g, 0, 6)).toBe(-90) // −150 + 60
    expect(shiftFor(g, 0, 7)).toBe(-90)
  })
  it('gap 6: rows before the gap only fall; rows at/after also make room for the card', () => {
    expect(shiftFor(g, 6, 0)).toBe(0)
    expect(shiftFor(g, 6, 2)).toBe(-40)
    expect(shiftFor(g, 6, 4)).toBe(-100)
    expect(shiftFor(g, 6, 6)).toBe(-90)
    expect(shiftFor(g, 6, 7)).toBe(-90)
  })
  it('members never move', () => {
    expect(shiftFor(g, 0, 1)).toBe(0)
    expect(shiftFor(g, 6, 3)).toBe(0)
    expect(shiftFor(g, 6, 5)).toBe(0)
  })
  it('the visible rows tile without holes: each appears where the previous one ends', () => {
    const gap = 6
    const visible = free([1, 3, 5]).map((i) => ({
      i,
      top: tops[i] + shiftFor(g, gap, i),
      h: HEIGHTS[i],
    }))
    // rows 0, 2, 4 tile from 0; the 60px slot follows row 4 (72..108 → slot 108..168); rows 6, 7 after it
    expect(visible.map((v) => v.top)).toEqual([0, 36, 72, 168, 204])
    for (let k = 1; k < visible.length; k++) {
      const prev = visible[k - 1]
      const cur = visible[k]
      const gapBetween = cur.top - (prev.top + prev.h)
      expect(gapBetween === 0 || (prev.i === 4 && gapBetween === 60)).toBe(true)
    }
  })
  it('a group of one reproduces the classic single-row shift', () => {
    const s = resolveDragGroup(null, rows(), grab(2)) // 36px row
    // dragging down: gap 5 → rows 3,4 move up by 36; rows 5+ unchanged
    expect(shiftFor(s, 5, 3)).toBe(-36)
    expect(shiftFor(s, 5, 4)).toBe(-36)
    expect(shiftFor(s, 5, 5)).toBe(0)
    // dragging up: gap 0 → rows 0,1 move down by 36
    expect(shiftFor(s, 0, 0)).toBe(36)
    expect(shiftFor(s, 0, 1)).toBe(36)
    expect(shiftFor(s, 0, 3)).toBe(0)
  })
})

describe('placeholderSlot', () => {
  const g = resolveDragGroup(new Set(['row-1', 'row-3', 'row-5']), rows(), grab(3))
  const f = free([1, 3, 5]) // [0,2,4,6,7]

  it('sits above the first visible row at or after the gap, minus the hidden height above it', () => {
    const slot = placeholderSlot(g, 6, f)!
    expect(slot.anchorIndex).toBe(6)
    expect(slot.offsetFromAnchorTop(HEIGHTS[6])).toBe(-150) // top(6) − prefix[3]
    expect(slot.height).toBe(60)
    // absolute: 258 − 150 = 108, which is where row 4 (shift −100 → 72..108) ends
    expect(tops[6] + slot.offsetFromAnchorTop(HEIGHTS[6])).toBe(108)
  })
  it('a gap inside a run of members snaps to the next visible row', () => {
    const slot = placeholderSlot(g, 3, f)!
    expect(slot.anchorIndex).toBe(4)
    expect(tops[4] + slot.offsetFromAnchorTop(HEIGHTS[4])).toBe(72) // 172 − 100
  })
  it('past every visible row it sits under the last one, at its shifted bottom edge', () => {
    const slot = placeholderSlot(g, 8, f)!
    expect(slot.anchorIndex).toBe(7)
    // row 7: top 294, shift −150 (nothing past gap 8) → bottom = 294 − 150 + 36 = 180
    expect(tops[7] + slot.offsetFromAnchorTop(HEIGHTS[7])).toBe(180)
  })
  it('no visible rows → null', () => {
    expect(placeholderSlot(g, 0, [])).toBeNull()
  })
})

describe('affectedRange', () => {
  it('first frame is a full pass', () => {
    expect(affectedRange(null, 6)).toBeNull()
  })
  it('later frames touch only the rows between the two gaps (±1)', () => {
    expect(affectedRange(6, 7)).toEqual({ min: 5, max: 8 })
    expect(affectedRange(7, 3)).toEqual({ min: 2, max: 8 })
  })
})
