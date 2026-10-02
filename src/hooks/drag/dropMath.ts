// Pure maths for "where does the drop land". No DOM.
//
// The dragged rows are hidden but still occupy layout space, so the drop is resolved in
// *collapsed* coordinates: every dragged row is removed from the list and each later row is
// pulled up by the dragged rows above it. The gap is the number of collapsed items whose
// midpoint lies before the dragged card's leading edge. Moving the gap by one therefore
// needs half of the neighbour's size of travel, in either direction.

/** Number of entries in a sorted number array that are strictly less than `value`. */
export const countBelow = (sorted: readonly number[], value: number): number => {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Number of items (sorted along the axis) whose midpoint lies before `pos`. */
export const countMidpointsBefore = <T>(
  items: readonly T[],
  start: (it: T) => number,
  size: (it: T) => number,
  pos: number,
): number => {
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (start(items[mid]) + size(items[mid]) / 2 < pos) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * A gap in the collapsed list → the 2.x `targetIndex` convention ("where the grabbed row
 * lands", the number `arrayMove(rows, source, target)` expects).
 */
export const gapToTargetIndex = (
  gap: number,
  items: readonly { index: string }[],
  sourceIndex: number,
): number => {
  if (items.length === 0) return sourceIndex
  const insertIndex = gap < items.length ? +items[gap].index : +items[items.length - 1].index + 1
  return insertIndex > sourceIndex ? insertIndex - 1 : insertIndex
}

/** The 2.x `targetIndex` → the gap in the original array (`DragEndResult.insertIndex`). */
export const toInsertIndex = (sourceIndex: number, targetIndex: number): number =>
  targetIndex + (sourceIndex < targetIndex ? 1 : 0)

/** Resolve the drop for one axis: leading edge of the card vs. the collapsed items. */
export const resolveDrop = <T extends { index: string }>(
  items: readonly T[],
  start: (it: T) => number,
  size: (it: T) => number,
  leadingEdge: number,
  sourceIndex: number,
): number =>
  gapToTargetIndex(countMidpointsBefore(items, start, size, leadingEdge), items, sourceIndex)
