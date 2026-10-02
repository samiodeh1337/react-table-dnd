// Pure maths for sliding the other rows during a drag. No DOM.
//
// Two moves, added together, for every visible (non-member) row:
//   1. move UP by the combined height of the dragged rows above it (they are hidden, so the
//      holes must close);
//   2. if it sits at or after the drop gap, move DOWN by the card's height (one row: the
//      other members simply vanish and reappear on drop).
//
//   shift(i) = (i >= gap ? +cardHeight : 0) − memberHeightAbove(i)
//
// With one member this is the classic single-row shift.
import type { DragGroup } from '../types'
import { countBelow } from './dropMath'
import { memberHeightAbove, memberPrefixHeights } from './dragGroup'

/** Vertical shift (px) for row `idx` while the group is dragged with the gap at `gap`. */
export function shiftFor(
  group: DragGroup,
  gap: number,
  idx: number,
  prefix = memberPrefixHeights(group),
): number {
  if (group.indexSet.has(idx)) return 0
  return (idx >= gap ? group.cardHeight : 0) - memberHeightAbove(group, idx, prefix)
}

export interface PlaceholderSlot {
  /** The row whose layout box anchors the slot (measure this element). */
  anchorIndex: number
  /** Slot top = that row's layout top + this offset. */
  offsetFromAnchorTop: (anchorHeight: number) => number
  height: number
}

/**
 * Where the placeholder goes: directly above the first visible row at or after the gap; or,
 * when the gap is past every visible row, directly below the last visible row (at its
 * shifted position).
 */
export function placeholderSlot(
  group: DragGroup,
  gap: number,
  freeIndices: readonly number[],
  prefix = memberPrefixHeights(group),
): PlaceholderSlot | null {
  const k = countBelow(freeIndices, gap)
  if (k < freeIndices.length) {
    const i0 = freeIndices[k]
    const above = memberHeightAbove(group, i0, prefix)
    return { anchorIndex: i0, offsetFromAnchorTop: () => -above, height: group.cardHeight }
  }
  if (freeIndices.length > 0) {
    const iL = freeIndices[freeIndices.length - 1]
    const shift = shiftFor(group, gap, iL, prefix)
    return { anchorIndex: iL, offsetFromAnchorTop: (h) => shift + h, height: group.cardHeight }
  }
  return null
}

/** Range of row indices whose shift can change when the gap moves from `prevGap` to `gap`. */
export function affectedRange(
  prevGap: number | null,
  gap: number,
): { min: number; max: number } | null {
  if (prevGap === null) return null // full pass
  return { min: Math.min(prevGap, gap) - 1, max: Math.max(prevGap, gap) + 1 }
}
