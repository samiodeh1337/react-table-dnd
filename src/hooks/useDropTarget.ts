// caches row/column item positions at drag start and resolves drop index via binary search
import { useCallback, useRef } from 'react'
import { binarySearchDropIndex, binarySearchDropIndexHeader } from '../Components/utils'
import type { HookRefs, Options, RowItem, ColumnItem, DragType, Point } from './types'

interface DropTargetResult {
  computeRowItems: () => RowItem[] | null
  computeColumnItems: () => ColumnItem[] | null
  resolveDropIndex: (
    clientX: number,
    clientY: number,
    dtype: DragType | null,
    rect: DOMRect,
    bodyScrollTop: number,
    initial: Point,
    size: { width: number; height: number },
  ) => number
  cachedItemsRef: React.RefObject<RowItem[] | ColumnItem[] | null> // null = invalidated
  cachedContainerRef: React.RefObject<DOMRect | null>
}

const useDropTarget = (refs: HookRefs, options: Options): DropTargetResult => {
  const cachedItemsRef = useRef<RowItem[] | ColumnItem[] | null>(null)
  const cachedContainerRef = useRef<DOMRect | null>(null)

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const computeRowItems = useCallback((): RowItem[] | null => {
    const body = refs.bodyRef?.current
    if (!body) return null
    const scrollTop = body.scrollTop
    const topOffset = body.getBoundingClientRect().top

    const elements = body.querySelectorAll('[data-rtdnd="draggable"][data-type="row"]')
    let items: RowItem[] = []
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement
      if (el.dataset.index === undefined) continue
      const rect = el.getBoundingClientRect()
      const itemTop = rect.top - topOffset + scrollTop
      items.push({
        height: rect.height,
        itemTop,
        itemBottom: itemTop + rect.height,
        index: el.dataset.index,
      })
    }

    const { start, end } = options.rowDragRange
    if (start || end) {
      items = items.filter(
        (item) => (!start || +item.index >= start) && (!end || +item.index <= end),
      )
    }
    return items
  }, [refs.bodyRef, options.rowDragRange])

  const computeColumnItems = useCallback((): ColumnItem[] | null => {
    const header = refs.headerRef?.current
    if (!header || !header.children[0]) return null

    let items = Array.from(header.children[0].children)
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          left: rect.left,
          width: rect.width,
          itemLeft: rect.left,
          itemRight: rect.left + rect.width,
          index: (el as HTMLElement).dataset.index!,
        }
      })
      .filter((item) => item.index !== undefined)

    const { start, end } = options.columnDragRange ?? {}
    if (start !== undefined || end !== undefined) {
      items = items.filter((item) => {
        const idx = +item.index!
        return (start === undefined || idx >= start) && (end === undefined || idx <= end)
      })
    }
    return items
  }, [refs.headerRef, options.columnDragRange])
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const resolveDropIndex = useCallback(
    (
      clientX: number,
      clientY: number,
      dtype: DragType | null,
      rect: DOMRect,
      bodyScrollTop: number,
      initial: Point,
      size: { width: number; height: number },
    ): number => {
      let items: RowItem[] | ColumnItem[] | null
      if (dtype === 'row') {
        items = cachedItemsRef.current as RowItem[] | null
        if (!items) {
          items = computeRowItems()
          cachedItemsRef.current = items
        }
        if (items && items.length > 0) {
          // use clone center, not raw pointer — feels more natural
          const cloneCenterY = clientY - initial.y + size.height / 2
          return binarySearchDropIndex(cloneCenterY - rect.top + bodyScrollTop, items)
        }
      } else {
        items = cachedItemsRef.current as ColumnItem[] | null
        if (!items) {
          items = computeColumnItems()
          cachedItemsRef.current = items
        }
        if (items && items.length > 0) {
          const cloneCenterX = clientX - initial.x + size.width / 2
          return binarySearchDropIndexHeader(cloneCenterX, items)
        }
      }
      return 0
    },
    [computeRowItems, computeColumnItems],
  )

  return {
    computeRowItems,
    computeColumnItems,
    resolveDropIndex,
    cachedItemsRef,
    cachedContainerRef,
  }
}

export default useDropTarget
