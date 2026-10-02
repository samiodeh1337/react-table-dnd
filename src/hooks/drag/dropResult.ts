/**
 * The objects the lifecycle callbacks receive, built from the drag group. Pure: the same
 * builder serves `onDragOver` and `onDragEnd`, so both always agree on what a drop at a given
 * slot means.
 */
import type { DragCancelInfo, DragEndResult, DragGroup, DragStartInfo, DragType } from '../types'
import { toInsertIndex } from './dropMath'

/** What `onDragStart` receives for this group. */
export function dragStartInfo(group: DragGroup, dtype: DragType): DragStartInfo {
  return dtype === 'row'
    ? {
        dragType: 'row',
        id: group.grabbedId,
        sourceIndex: group.grabbed,
        selectedIds: group.ids,
        sourceIndices: group.indices,
      }
    : { dragType: 'column', id: group.grabbedId, sourceIndex: group.grabbed }
}

/** What `onDragCancel` receives for this group. */
export function dragCancelInfo(group: DragGroup, dtype: DragType): DragCancelInfo {
  return { dragType: dtype, id: group.grabbedId, sourceIndex: group.grabbed }
}

/** The result a drop at `targetIndex` gives: what `onDragEnd` receives, and what `onDragOver`
 *  sees while the pointer is over that slot. */
export function dropResult(group: DragGroup, targetIndex: number, dtype: DragType): DragEndResult {
  return dtype === 'row'
    ? {
        dragType: 'row',
        id: group.grabbedId,
        sourceIndex: group.grabbed,
        targetIndex,
        selectedIds: group.ids,
        sourceIndices: group.indices,
        insertIndex: toInsertIndex(group.grabbed, targetIndex),
      }
    : { dragType: 'column', id: group.grabbedId, sourceIndex: group.grabbed, targetIndex }
}
