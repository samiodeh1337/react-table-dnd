export function isScrollbarClick(clientX: number, clientY: number, target: HTMLElement): boolean {
  // SVG shapes and other zero-size targets report clientWidth/Height 0 and can never
  // carry a scrollbar — without this, a press on a grip icon's <circle> was ignored.
  if (!target.clientWidth || !target.clientHeight) return false
  const rect = target.getBoundingClientRect()
  return clientX > rect.left + target.clientWidth || clientY > rect.top + target.clientHeight
}

export const isIndexOutOfRange = (
  index: string | number,
  start?: number,
  end?: number,
): boolean => {
  const numericIndex = Number(index) // convert to number

  if (start !== undefined && numericIndex < start) return true
  if (end !== undefined && numericIndex > end) return true
  return false
}

/**
 * Move several items at once. `sourceIndices` are removed, then re-inserted as a
 * block (in their original relative order) at `insertIndex`, which is a gap in the
 * ORIGINAL array — exactly what `DragEndResult.insertIndex` reports.
 */
export function arrayMoveMultiple<T>(arr: T[], sourceIndices: number[], insertIndex: number): T[] {
  const sorted = Array.from(new Set(sourceIndices))
    .filter((i) => i >= 0 && i < arr.length)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return arr
  const moving = new Set(sorted)
  const group = sorted.map((i) => arr[i])
  const rest: T[] = []
  for (let i = 0; i < arr.length; i++) if (!moving.has(i)) rest.push(arr[i])
  let removedBefore = 0
  for (const i of sorted) if (i < insertIndex) removedBefore++
  const at = Math.max(0, Math.min(rest.length, insertIndex - removedBefore))
  rest.splice(at, 0, ...group)
  return rest
}

/**
 * Id-based variant of `arrayMoveMultiple`. Works for virtual tables too, where the
 * library cannot resolve indices of selected rows that are scrolled out of view.
 */
export function moveRowsById<T>(
  arr: T[],
  ids: ReadonlyArray<string | number>,
  insertIndex: number,
  getId: (row: T) => string | number = (row) => (row as { id: string | number }).id,
): T[] {
  const wanted = new Set(ids.map(String))
  const indices: number[] = []
  for (let i = 0; i < arr.length; i++) if (wanted.has(String(getId(arr[i])))) indices.push(i)
  return arrayMoveMultiple(arr, indices, insertIndex)
}
