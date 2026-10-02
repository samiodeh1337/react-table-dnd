// "What is being dragged" as one value, for single rows and for groups alike.
import type { DragGroup } from '../types'
import { countBelow } from './dropMath'

/** A mounted row as the group resolver needs it (DOM order). */
export interface MountedRowInfo {
  index: number
  id: string
  height: number
  locked: boolean
}

/**
 * Build the DragGroup for a drag that starts on `grabbed`.
 *
 * If the grabbed row is part of a multi-row selection, every selected, mounted, unlocked row
 * is a member (ids in table order; in a virtual table the selected ids scrolled off screen are
 * appended so `onDragEnd` can still move them). Otherwise the group is the grabbed row alone.
 * In a table that renders every row, a selected id with no row is a row that was removed: it is
 * left out. Either way the result has
 * the same shape, so nothing downstream needs a "single vs group" branch.
 */
export function resolveDragGroup(
  selection: ReadonlySet<string> | null,
  rows: readonly MountedRowInfo[],
  grabbed: MountedRowInfo,
  isVirtual = true,
): DragGroup {
  const single = (): DragGroup => ({
    ids: [grabbed.id],
    indices: [grabbed.index],
    indexSet: new Set([grabbed.index]),
    heights: new Map([[grabbed.index, grabbed.height]]),
    grabbed: grabbed.index,
    grabbedId: grabbed.id,
    cardHeight: grabbed.height,
    count: 1,
  })
  if (!selection || !selection.has(grabbed.id) || selection.size < 2) return single()

  const ids: string[] = []
  const seen = new Set<string>()
  const indices: number[] = []
  const heights = new Map<number, number>()
  for (const row of rows) {
    if (!selection.has(row.id)) continue
    seen.add(row.id)
    if (row.locked) continue // locked rows never move with a group
    ids.push(row.id)
    indices.push(row.index)
    heights.set(row.index, row.height)
  }
  if (isVirtual) for (const id of selection) if (!seen.has(id)) ids.push(id) // scrolled off screen
  if (ids.length <= 1) return single() // every other member was locked

  indices.sort((a, b) => a - b)
  if (!heights.has(grabbed.index)) heights.set(grabbed.index, grabbed.height)
  return {
    ids,
    indices,
    indexSet: new Set(indices),
    heights,
    grabbed: grabbed.index,
    grabbedId: grabbed.id,
    cardHeight: grabbed.height,
    count: ids.length,
  }
}

/** prefix[k] = combined height of the first k members (members sorted by index). */
export function memberPrefixHeights(group: DragGroup): number[] {
  const prefix = [0]
  for (const idx of group.indices)
    prefix.push(prefix[prefix.length - 1] + (group.heights.get(idx) ?? 0))
  return prefix
}

/** Combined height of the members that sit above row `idx` in the original order. */
export function memberHeightAbove(
  group: DragGroup,
  idx: number,
  prefix = memberPrefixHeights(group),
): number {
  return prefix[countBelow(group.indices, idx)]
}

export const isMember = (group: DragGroup, idx: number): boolean => group.indexSet.has(idx)
