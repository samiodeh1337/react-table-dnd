import { useCallback, useEffect, useLayoutEffect, useRef, type Dispatch } from 'react'
import useAutoScroll from './useAutoScroll'
import useLongPress from './useLongPress'
import { binarySearchDropIndex, binarySearchDropIndexHeader } from '../Components/utils'
import type {
  HookRefs,
  DraggedState,
  DragType,
  Options,
  DragEndResult,
  RowItem,
  ColumnItem,
  Point,
  TableAction,
} from './types'
import { flushSync } from 'react-dom'

const TRANSITION_STYLE = 'transform 450ms cubic-bezier(0.2, 0, 0, 1)'
const DROP_ANIM_MS = 200

// ── Hook ────────────────────────────────────────────────

const useDragContextEvents = (
  refs: HookRefs,
  dragged: DraggedState,
  dispatch: Dispatch<TableAction>,
  dragType: DragType | null,
  options: Options,
  onDragEnd: ((result: DragEndResult) => void) | undefined,
) => {
  const { startAutoScroll, stopAutoScroll, setContainerRect, pointerRef } = useAutoScroll(
    refs as Parameters<typeof useAutoScroll>[0],
  )

  // ── Refs ────────────────────────────────────────────────

  const cachedItemsRef = useRef<RowItem[] | ColumnItem[] | null>(null)
  const baseScrollTopRef = useRef(0)
  const baseScrollLeftRef = useRef(0)
  const cachedContainerRef = useRef<DOMRect | null>(null)
  const dragTypeRef = useRef<DragType | null>(null)
  const initialRef = useRef<Point>({ x: 0, y: 0 })
  const sourceIndexRef = useRef<number | null>(null)
  const targetIndexRef = useRef<number | null>(null)
  const prevTargetIndexRef = useRef<number | null>(null)
  const draggedSizeRef = useRef({ width: 0, height: 0 })
  const lastClientRef = useRef<Point>({ x: 0, y: 0 })
  const dragEndFiredRef = useRef(false)

  // Track shifted elements for efficient cleanup
  const shiftedElementsRef = useRef<Set<HTMLElement>>(new Set())
  const shiftedCellsRef = useRef<Set<HTMLElement>>(new Set())

  // Index maps: built once at drag start, used for O(1) element lookup
  // Maps data-index → { outer: draggable element, inner: first child }
  const rowIndexMapRef = useRef<Map<number, { outer: HTMLElement; inner: HTMLElement }>>(new Map())
  const colIndexMapRef = useRef<Map<number, { outer: HTMLElement; inner: HTMLElement }>>(new Map())
  // For column drag: maps col-index → array of cell elements (one per row)
  const cellIndexMapRef = useRef<Map<number, HTMLElement[]>>(new Map())

  // ── Compute items ───────────────────────────────────────

  const computeRowItems = useCallback((): RowItem[] | null => {
    const body = refs.bodyRef?.current
    if (!body) return null
    const scrollTop = body.scrollTop
    const topOffset = body.getBoundingClientRect().top

    const elements = body.querySelectorAll('.draggable[data-type="row"]')
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
        (item) => (!start || +item.index >= start) && (!end || +item.index < end),
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
        return (start === undefined || idx >= start) && (end === undefined || idx < end)
      })
    }
    return items
  }, [refs.headerRef, options.columnDragRange])

  // ── Placeholder ─────────────────────────────────────────

  const positionPlaceholder = useCallback(
    (
      targetEl: HTMLElement | null,
      sourceIdx: number | null,
      targetIdx: number | null,
      dtype: DragType | null,
    ) => {
      const ph = refs.placeholderRef?.current
      if (!ph || !targetEl) {
        if (ph) ph.style.display = 'none'
        return
      }

      const size = draggedSizeRef.current
      const rect = targetEl.getBoundingClientRect()
      const tableRect = refs.tableRef?.current?.getBoundingClientRect()
      const forward = (sourceIdx ?? 0) < (targetIdx ?? 0)

      ph.style.display = 'block'
      if (dtype === 'row') {
        ph.style.top = `${forward ? rect.top + rect.height - size.height : rect.top}px`
        ph.style.left = `${tableRect?.left ?? rect.left}px`
        ph.style.width = `${tableRect?.width ?? rect.width}px`
        ph.style.height = `${size.height}px`
      } else {
        ph.style.top = `${tableRect?.top ?? rect.top}px`
        ph.style.left = `${forward ? rect.left + rect.width - size.width : rect.left}px`
        ph.style.width = `${size.width}px`
        ph.style.height = `${tableRect?.height ?? rect.height}px`
      }
    },
    [refs.placeholderRef, refs.tableRef],
  )

  // ── Shift transforms (optimized: index map lookup, no querySelectorAll) ─────────

  const applyShiftTransforms = useCallback(
    (sourceIndex: number | null, targetIndex: number | null, dtype: DragType | null) => {
      if (sourceIndex === null || targetIndex === null) return
      const size = draggedSizeRef.current
      const prevTarget = prevTargetIndexRef.current
      let targetEl: HTMLElement | null = null

      // Determine which indices need updating
      const needsFullPass = prevTarget === null
      const rangeMin = needsFullPass
        ? -Infinity
        : Math.min(prevTarget!, targetIndex, sourceIndex) - 1
      const rangeMax = needsFullPass
        ? Infinity
        : Math.max(prevTarget!, targetIndex, sourceIndex) + 1

      if (dtype === 'row') {
        const map = rowIndexMapRef.current
        if (needsFullPass) {
          // First call: must process all entries
          for (const [idx, { outer, inner }] of map) {
            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateY(-${size.height}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateY(${size.height}px)`

            inner.style.transform = shift
            inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
            if (shift) shiftedElementsRef.current.add(inner)

            if (idx === targetIndex) {
              outer.setAttribute('data-drop-target', 'true')
              targetEl = outer
            } else {
              outer.removeAttribute('data-drop-target')
            }
          }
        } else {
          // Delta: only look up the specific indices that changed
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const entry = map.get(idx)
            if (!entry) continue
            const { outer, inner } = entry

            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateY(-${size.height}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateY(${size.height}px)`

            inner.style.transform = shift
            inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
            if (shift) shiftedElementsRef.current.add(inner)

            if (idx === targetIndex) {
              outer.setAttribute('data-drop-target', 'true')
              targetEl = outer
            } else {
              outer.removeAttribute('data-drop-target')
            }
          }
        }
      } else if (dtype === 'column') {
        const colMap = colIndexMapRef.current
        if (needsFullPass) {
          for (const [idx, { outer, inner }] of colMap) {
            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`

            inner.style.transform = shift
            inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
            if (shift) shiftedElementsRef.current.add(inner)

            if (idx === targetIndex) {
              outer.setAttribute('data-drop-target', 'true')
              targetEl = outer
            } else {
              outer.removeAttribute('data-drop-target')
            }
          }
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const entry = colMap.get(idx)
            if (!entry) continue
            const { outer, inner } = entry

            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`

            inner.style.transform = shift
            inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
            if (shift) shiftedElementsRef.current.add(inner)

            if (idx === targetIndex) {
              outer.setAttribute('data-drop-target', 'true')
              targetEl = outer
            } else {
              outer.removeAttribute('data-drop-target')
            }
          }
        }

        // Shift body cells by column index
        const cellMap = cellIndexMapRef.current
        if (needsFullPass) {
          for (const [idx, cells] of cellMap) {
            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`
            for (const cell of cells) {
              cell.style.transform = shift
              cell.style.transition = TRANSITION_STYLE
              if (shift) shiftedCellsRef.current.add(cell)
            }
          }
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const cells = cellMap.get(idx)
            if (!cells) continue
            let shift = ''
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`
            for (const cell of cells) {
              cell.style.transform = shift
              cell.style.transition = TRANSITION_STYLE
              if (shift) shiftedCellsRef.current.add(cell)
            }
          }
        }
      }

      prevTargetIndexRef.current = targetIndex
      positionPlaceholder(targetEl, sourceIndex, targetIndex, dtype)
    },
    [positionPlaceholder],
  )

  // ── Clear shift transforms (optimized: only tracked elements) ──

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current
    if (ph) ph.style.display = 'none'

    // Clear only elements that were actually shifted
    for (const inner of shiftedElementsRef.current) {
      inner.style.transition = 'none'
      inner.style.transform = ''
      // Also clear the parent's data-drop-target
      const parent = inner.parentElement
      if (parent) parent.removeAttribute('data-drop-target')
    }
    shiftedElementsRef.current.clear()

    for (const cell of shiftedCellsRef.current) {
      cell.style.transition = 'none'
      cell.style.transform = ''
    }
    shiftedCellsRef.current.clear()

    prevTargetIndexRef.current = null
  }, [refs.placeholderRef])

  // ── Find draggable from event target ───────────────────

  const findDraggable = (
    target: EventTarget,
  ): { element: HTMLElement; foundHandle: boolean } | null => {
    let el = target as HTMLElement | null
    let foundHandle = false
    while (el) {
      if (el.dataset?.dragHandle === 'true') foundHandle = true
      if (el.dataset?.contextid) return null
      if (el.dataset?.disabled === 'true') return null
      if (el.dataset?.id) return { element: el, foundHandle }
      el = el.parentNode as HTMLElement | null
    }
    return null
  }

  // ── Begin drag (shared by mouse + touch) ──────────────

  const beginDrag = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      clientX: number,
      clientY: number,
    ) => {
      const result = findDraggable(e.target)
      if (!result) return
      const { element: draggableEl, foundHandle } = result
      if (!foundHandle && draggableEl.querySelector('[data-drag-handle]')) return

      const id = draggableEl.dataset.id
      const sourceIndex = +draggableEl.dataset.index!
      const dtype = draggableEl.dataset.type as DragType | undefined
      const isTouch = e.type === 'touchstart'

      dragTypeRef.current = dtype ?? null
      sourceIndexRef.current = sourceIndex
      targetIndexRef.current = null
      prevTargetIndexRef.current = null
      dragEndFiredRef.current = false

      if (isTouch) {
        draggableEl.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerType: 'mouse',
          }),
        )
      }

      const scrollOffset = dtype === 'row' ? (refs.bodyRef?.current?.scrollLeft ?? 0) : 0
      const itemRect = draggableEl.getBoundingClientRect()
      draggedSizeRef.current = {
        width: itemRect.width,
        height: itemRect.height,
      }

      const initial = {
        x: clientX - itemRect.left - scrollOffset,
        y: clientY - itemRect.top,
      }
      initialRef.current = initial
      lastClientRef.current = { x: clientX, y: clientY }
      pointerRef.current = { x: clientX, y: clientY }

      const translate = { x: itemRect.left + scrollOffset, y: itemRect.top }

      // Compute and cache items at drag start
      cachedItemsRef.current = dtype === 'row' ? computeRowItems() : computeColumnItems()

      // Build index maps for O(1) element lookup during shift transforms
      rowIndexMapRef.current.clear()
      colIndexMapRef.current.clear()
      cellIndexMapRef.current.clear()

      const body = refs.bodyRef?.current
      if (body) {
        baseScrollTopRef.current = body.scrollTop
        baseScrollLeftRef.current = body.scrollLeft
        const bodyRect = body.getBoundingClientRect()
        cachedContainerRef.current = bodyRect
        setContainerRect(bodyRect)

        if (dtype === 'row') {
          // Build row index map
          const rows = body.querySelectorAll('.draggable[data-type="row"]')
          for (let i = 0; i < rows.length; i++) {
            const el = rows[i] as HTMLElement
            const idx = el.dataset.index
            if (idx === undefined) continue
            const inner = el.firstElementChild as HTMLElement | null
            if (inner) rowIndexMapRef.current.set(+idx, { outer: el, inner })
          }
        }
      }

      if (dtype === 'column') {
        // Build column index map
        const header = refs.headerRef?.current
        if (header) {
          const cols = header.querySelectorAll('.draggable[data-type="column"]')
          for (let i = 0; i < cols.length; i++) {
            const el = cols[i] as HTMLElement
            const idx = el.dataset.index
            if (idx === undefined) continue
            const inner = el.firstElementChild as HTMLElement | null
            if (inner) colIndexMapRef.current.set(+idx, { outer: el, inner })
          }
        }
        // Build cell index map
        if (body) {
          const cells = body.querySelectorAll('.td[data-col-index]')
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i] as HTMLElement
            const idx = +cell.dataset.colIndex!
            if (!cellIndexMapRef.current.has(idx)) {
              cellIndexMapRef.current.set(idx, [])
            }
            cellIndexMapRef.current.get(idx)!.push(cell)
          }
        }
      }

      const tableEl = refs.tableRef?.current
      if (tableEl) tableEl.style.touchAction = 'none'

      const cloneEl = refs.cloneRef?.current
      if (cloneEl) cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`

      const tableRect = refs.tableRef?.current
      if (tableRect) {
        dispatch({
          type: 'setTableDimensions',
          value: {
            height: tableRect.offsetHeight,
            width: tableRect.offsetWidth,
          },
        })
      }

      dispatch({
        type: 'dragStart',
        value: {
          rect: {
            draggedItemHeight: itemRect.height,
            draggedItemWidth: itemRect.width,
          },
          dragged: {
            initial,
            translate,
            draggedID: id ?? null,
            isDragging: true,
            sourceIndex,
          },
          dragType: (dtype as DragType) ?? null,
        },
      })

      const syncScroll = () => {
        const c = refs.cloneRef?.current
        const b = refs.bodyRef?.current
        if (!c || !b) return
        if (dtype === 'row') c.scrollLeft = b.scrollLeft
        else {
          const cb = c.querySelector('.clone-body') as HTMLElement | null
          if (cb) cb.scrollTop = b.scrollTop
        }
      }
      syncScroll()
      requestAnimationFrame(() => {
        syncScroll()
        requestAnimationFrame(syncScroll)
      })
    },
    [dispatch, refs, computeRowItems, computeColumnItems, pointerRef, setContainerRect],
  )

  // ── Finalize drop (called after optional clone animation) ──

  const finalizeDrop = useCallback(
    (
      finalSource: number | null,
      finalTarget: number | null,
      finalDragType: DragType | null,
      savedScrollTop: number,
      savedScrollLeft: number,
    ) => {
      const cloneEl = refs.cloneRef?.current
      if (cloneEl) cloneEl.style.visibility = 'hidden'

      const tableEl = refs.tableRef?.current
      if (tableEl) tableEl.style.touchAction = ''

      flushSync(() => {
        if (
          onDragEnd &&
          finalSource !== null &&
          finalTarget !== null &&
          (finalDragType === 'row' || finalDragType === 'column')
        ) {
          onDragEnd({
            sourceIndex: finalSource,
            targetIndex: finalTarget,
            dragType: finalDragType,
          })
        }
        dispatch({
          type: 'dragEnd',
          value: { targetIndex: finalTarget, sourceIndex: finalSource },
        })
      })

      // Clear transforms
      clearShiftTransforms()

      // Restore scroll position
      const body = refs.bodyRef?.current
      if (body) {
        body.scrollTop = savedScrollTop
        body.scrollLeft = savedScrollLeft
        requestAnimationFrame(() => {
          body.scrollTop = savedScrollTop
          body.scrollLeft = savedScrollLeft
        })
      }
    },
    [dispatch, refs.bodyRef, refs.cloneRef, refs.tableRef, clearShiftTransforms, onDragEnd],
  )

  // ── Drag end ──────────────────────────────────────────

  const dragEnd = useCallback(() => {
    if (dragEndFiredRef.current) return
    dragEndFiredRef.current = true

    cancelLongPress()
    setTimeout(() => {
      isTouchActiveRef.current = false
    }, 400)

    const finalTarget = targetIndexRef.current
    const finalSource = sourceIndexRef.current
    const finalDragType = dragTypeRef.current

    const body = refs.bodyRef?.current
    const savedScrollTop = body?.scrollTop ?? 0
    const savedScrollLeft = body?.scrollLeft ?? 0

    cachedItemsRef.current = null
    cachedContainerRef.current = null
    stopAutoScroll()

    dragTypeRef.current = null
    sourceIndexRef.current = null
    targetIndexRef.current = null

    // Animate clone to drop gap, then finalize
    const cloneEl = refs.cloneRef?.current
    const ph = refs.placeholderRef?.current
    if (cloneEl && ph && ph.style.display !== 'none') {
      const toX = parseFloat(ph.style.left) || 0
      const toY = parseFloat(ph.style.top) || 0
      cloneEl.style.transition = `transform ${DROP_ANIM_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      cloneEl.style.transform = `translate(${toX}px, ${toY}px)`
      setTimeout(
        () =>
          finalizeDrop(finalSource, finalTarget, finalDragType, savedScrollTop, savedScrollLeft),
        DROP_ANIM_MS,
      )
    } else {
      finalizeDrop(finalSource, finalTarget, finalDragType, savedScrollTop, savedScrollLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAutoScroll, refs.bodyRef, refs.placeholderRef, refs.cloneRef, finalizeDrop])

  // ── Stable ref for dragMove ──
  const dragMoveRef = useRef<(x: number, y: number) => void>(() => {})

  // ── Long press (mobile) ───────────────────────────────

  const { touchStart, cancelLongPress, isTouchActiveRef } = useLongPress(
    refs,
    beginDrag,
    dragEnd,
    (x: number, y: number) => dragMoveRef.current(x, y),
  )

  // ── Mouse: start drag immediately ─────────────────────

  const dragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) return
      if (isTouchActiveRef.current) return
      beginDrag(e, e.clientX, e.clientY)
    },
    [beginDrag, isTouchActiveRef],
  )

  // ── Core drag move (shared by mouse + touch) ─────────

  const dragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (dragEndFiredRef.current) return

      const initial = initialRef.current

      lastClientRef.current = { x: clientX, y: clientY }
      pointerRef.current = { x: clientX, y: clientY }

      const cloneEl = refs.cloneRef?.current
      if (cloneEl) {
        cloneEl.style.transform = `translate(${clientX - initial.x}px, ${clientY - initial.y}px)`
        const body = refs.bodyRef?.current
        if (body) {
          if (dragTypeRef.current === 'row') cloneEl.scrollLeft = body.scrollLeft
          else {
            const cb = cloneEl.querySelector('.clone-body') as HTMLElement | null
            if (cb) cb.scrollTop = body.scrollTop
          }
        }
      }

      const container = refs.bodyRef?.current
      if (!container) return

      let rect = cachedContainerRef.current
      if (!rect) {
        rect = container.getBoundingClientRect()
        cachedContainerRef.current = rect
      }

      let dropIndex = 0
      const dtype = dragTypeRef.current || dragType

      // Auto-scroll detection
      if (dtype === 'row') {
        if (clientY < rect.top + 30) {
          startAutoScroll(-5, container, 'vertical')
        } else if (clientY > rect.bottom - 30) {
          startAutoScroll(5, container, 'vertical')
        } else {
          stopAutoScroll()
          // Left auto-scroll zone — invalidate cache and rebuild index maps
          // (virtual tables swap DOM elements during scroll)
          cachedItemsRef.current = null
          prevTargetIndexRef.current = null
          if (dtype === 'row') {
            rowIndexMapRef.current.clear()
            const rows = container.querySelectorAll('.draggable[data-type="row"]')
            for (let i = 0; i < rows.length; i++) {
              const el = rows[i] as HTMLElement
              const idx = el.dataset.index
              if (idx === undefined) continue
              const inner = el.firstElementChild as HTMLElement | null
              if (inner) rowIndexMapRef.current.set(+idx, { outer: el, inner })
            }
          }
        }
      } else {
        if (clientX < rect.left + 30) {
          startAutoScroll(-5, container, 'horizontal')
        } else if (clientX > rect.right - 30) {
          startAutoScroll(5, container, 'horizontal')
        } else {
          stopAutoScroll()
          cachedItemsRef.current = null
          prevTargetIndexRef.current = null
          // Rebuild column maps if needed
          colIndexMapRef.current.clear()
          cellIndexMapRef.current.clear()
          const header = refs.headerRef?.current
          if (header) {
            const cols = header.querySelectorAll('.draggable[data-type="column"]')
            for (let i = 0; i < cols.length; i++) {
              const el = cols[i] as HTMLElement
              const idx = el.dataset.index
              if (idx === undefined) continue
              const inner = el.firstElementChild as HTMLElement | null
              if (inner) colIndexMapRef.current.set(+idx, { outer: el, inner })
            }
          }
          const cells = container.querySelectorAll('.td[data-col-index]')
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i] as HTMLElement
            const idx = +cell.dataset.colIndex!
            if (!cellIndexMapRef.current.has(idx)) {
              cellIndexMapRef.current.set(idx, [])
            }
            cellIndexMapRef.current.get(idx)!.push(cell)
          }
        }
      }

      // Use cached items if available, otherwise recompute
      let items: RowItem[] | ColumnItem[] | null
      if (dtype === 'row') {
        items = cachedItemsRef.current as RowItem[] | null
        if (!items) {
          items = computeRowItems()
          cachedItemsRef.current = items
          baseScrollTopRef.current = container.scrollTop
        }
        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndex(clientY - rect.top + container.scrollTop, items)
        }
      } else {
        items = cachedItemsRef.current as ColumnItem[] | null
        if (!items) {
          items = computeColumnItems()
          cachedItemsRef.current = items
          baseScrollLeftRef.current = container.scrollLeft
        }
        if (items && items.length > 0) dropIndex = binarySearchDropIndexHeader(clientX, items)
      }

      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex
        requestAnimationFrame(() => applyShiftTransforms(sourceIndexRef.current, dropIndex, dtype))
      }
    },
    [
      pointerRef,
      refs.cloneRef,
      refs.bodyRef,
      refs.headerRef,
      dragType,
      startAutoScroll,
      stopAutoScroll,
      computeRowItems,
      computeColumnItems,
      applyShiftTransforms,
    ],
  )

  dragMoveRef.current = dragMove

  // ── Drag cancel (Escape) ──────────────────────────────

  const dragCancel = useCallback(() => {
    cancelLongPress()
    cachedItemsRef.current = null
    cachedContainerRef.current = null

    const cloneEl = refs.cloneRef?.current
    if (cloneEl) cloneEl.style.visibility = 'hidden'
    const tableEl = refs.tableRef?.current
    if (tableEl) tableEl.style.touchAction = ''

    dispatch({
      type: 'dragEnd',
      value: { targetIndex: null, sourceIndex: null },
    })
    stopAutoScroll()
    clearShiftTransforms()

    dragTypeRef.current = null
    sourceIndexRef.current = null
    targetIndexRef.current = null
  }, [
    dispatch,
    stopAutoScroll,
    clearShiftTransforms,
    refs.cloneRef,
    refs.tableRef,
    cancelLongPress,
  ])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') dragCancel()
    },
    [dragCancel],
  )

  // ── Reset clone after drag ends ─────────────────────────
  useLayoutEffect(() => {
    if (!dragged.isDragging) {
      clearShiftTransforms()
      const cloneEl = refs.cloneRef?.current
      if (cloneEl) {
        cloneEl.style.transition = ''
        cloneEl.style.transform = 'translate(0px, 0px)'
        cloneEl.style.visibility = ''
        cloneEl.scrollLeft = 0
      }
    }
  }, [dragged.isDragging, clearShiftTransforms, refs.cloneRef])

  // ── touch-action:none on body (permanent) ───────────────
  useEffect(() => {
    const body = refs.bodyRef?.current
    if (body) body.style.touchAction = 'none'
    return () => {
      if (body) body.style.touchAction = ''
    }
  }, [refs.bodyRef])

  // ── Pointer event listeners while dragging ────────────

  useEffect(() => {
    if (!dragged.isDragging) return

    const onPointerMove = (e: PointerEvent) => {
      dragMove(e.clientX, e.clientY)
    }
    const onPointerEnd = () => {
      dragEnd()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dragged.isDragging, dragMove, dragEnd, handleKeyDown])

  return { dragStart, touchStart }
}

export default useDragContextEvents
