/**
 * useDropTarget — "which slot is the pointer over?"
 *
 * Caches the positions of the rows/columns that are NOT being dragged once at drag start, in
 * collapsed coordinates (see `drag/dropMath.ts`), and answers per pointer move with a binary
 * search. The cache is invalidated by the orchestrator when auto-scroll or a virtual list
 * changes the DOM.
 */
import { useCallback, useMemo, useRef } from 'react'
import type { HookRefs, Options, RowItem, ColumnItem, DragType, DragGroup, Point } from './types'
import { memberHeightAbove, memberPrefixHeights } from './drag/dragGroup'
import { resolveDrop } from './drag/dropMath'

interface DropTargetResult {
  computeRowItems: () => RowItem[] | null
  computeColumnItems: () => ColumnItem[] | null
  /** The 2.x-style target index for the pointer position (see `gapToTargetIndex`). */
  resolveDropIndex: (
    clientX: number,
    clientY: number,
    dtype: DragType | null,
    rect: DOMRect,
    bodyScrollTop: number,
    initial: Point,
  ) => number
  cachedItemsRef: React.RefObject<RowItem[] | ColumnItem[] | null> // null = invalidated
  cachedContainerRef: React.RefObject<DOMRect | null>
}

const rowStart = (it: RowItem) => it.itemTop
const rowSize = (it: RowItem) => it.height
const colStart = (it: ColumnItem) => it.itemLeft
const colSize = (it: ColumnItem) => it.width

const useDropTarget = (
  refs: HookRefs,
  options: Options,
  groupRef: React.RefObject<DragGroup | null>,
): DropTargetResult => {
  const cachedItemsRef = useRef<RowItem[] | ColumnItem[] | null>(null)
  const cachedContainerRef = useRef<DOMRect | null>(null)

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const computeRowItems = useCallback((): RowItem[] | null => {
    const body = refs.bodyRef?.current
    const group = groupRef.current
    if (!body || !group) return null
    const scrollTop = body.scrollTop
    const topOffset = body.getBoundingClientRect().top
    const prefix = memberPrefixHeights(group)

    let items: RowItem[] = []
    body
      .querySelectorAll<HTMLElement>('[data-rtdnd="draggable"][data-type="row"]')
      .forEach((el) => {
        if (el.dataset.index === undefined) return
        const idx = +el.dataset.index
        if (group.indexSet.has(idx)) return // dragged rows are not in the list
        const rect = el.getBoundingClientRect()
        // pulled up by the dragged rows above it, whether or not they are mounted right now
        const itemTop = rect.top - topOffset + scrollTop - memberHeightAbove(group, idx, prefix)
        items.push({
          height: rect.height,
          itemTop,
          itemBottom: itemTop + rect.height,
          index: el.dataset.index,
        })
      })

    const { start, end } = options.rowDragRange
    if (start !== undefined || end !== undefined)
      items = items.filter(
        (item) =>
          (start === undefined || +item.index >= start) &&
          (end === undefined || +item.index <= end),
      )
    return items
  }, [refs.bodyRef, options.rowDragRange, groupRef])

  const computeColumnItems = useCallback((): ColumnItem[] | null => {
    const header = refs.headerRef?.current
    const group = groupRef.current
    if (!header || !header.children[0] || !group) return null
    let collapsed = 0

    let items: ColumnItem[] = []
    for (const el of Array.from(header.children[0].children)) {
      const index = (el as HTMLElement).dataset.index
      if (index === undefined) continue
      const rect = el.getBoundingClientRect()
      if (+index === group.grabbed) {
        collapsed += rect.width
        continue
      }
      const left = rect.left - collapsed
      items.push({ left, width: rect.width, itemLeft: left, itemRight: left + rect.width, index })
    }

    const { start, end } = options.columnDragRange ?? {}
    if (start !== undefined || end !== undefined)
      items = items.filter((item) => {
        const idx = +item.index
        return (start === undefined || idx >= start) && (end === undefined || idx <= end)
      })
    return items
  }, [refs.headerRef, options.columnDragRange, groupRef])
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const resolveDropIndex = useCallback<DropTargetResult['resolveDropIndex']>(
    (clientX, clientY, dtype, rect, bodyScrollTop, initial) => {
      const group = groupRef.current
      const source = group?.grabbed ?? 0
      if (dtype === 'row') {
        let items = cachedItemsRef.current as RowItem[] | null
        if (!items) cachedItemsRef.current = items = computeRowItems()
        if (!items || items.length === 0) return source
        const cardTop = clientY - initial.y - rect.top + bodyScrollTop // the card's top edge, in list coordinates
        return resolveDrop(items, rowStart, rowSize, cardTop, source)
      }
      let items = cachedItemsRef.current as ColumnItem[] | null
      if (!items) cachedItemsRef.current = items = computeColumnItems()
      if (!items || items.length === 0) return source
      const cardLeft = clientX - initial.x
      return resolveDrop(items, colStart, colSize, cardLeft, source)
    },
    [groupRef, computeRowItems, computeColumnItems],
  )

  return useMemo(
    () => ({
      computeRowItems,
      computeColumnItems,
      resolveDropIndex,
      cachedItemsRef,
      cachedContainerRef,
    }),
    [computeRowItems, computeColumnItems, resolveDropIndex],
  )
}

export default useDropTarget
