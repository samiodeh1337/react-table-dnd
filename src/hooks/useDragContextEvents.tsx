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
  const cachedContainerRef = useRef<DOMRect | null>(null)
  const dragTypeRef = useRef<DragType | null>(null)
  const initialRef = useRef<Point>({ x: 0, y: 0 })
  const sourceIndexRef = useRef<number | null>(null)
  const targetIndexRef = useRef<number | null>(null)
  const prevTargetIndexRef = useRef<number | null>(null)
  const draggedSizeRef = useRef({ width: 0, height: 0 })
  const dragEndFiredRef = useRef(false)
  const cloneBodyElRef = useRef<HTMLElement | null>(null)
  const mapStaleRef = useRef(false)

  // Track shifted elements for efficient cleanup
  const shiftedElementsRef = useRef<Set<HTMLElement>>(new Set())
  const shiftedCellsRef = useRef<Set<HTMLElement>>(new Set())
  // Track current shift per cell to skip redundant writes
  const cellShiftCache = useRef<Map<HTMLElement, string>>(new Map())

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

      const needsFullPass = prevTarget === null
      const rangeMin = needsFullPass
        ? -Infinity
        : Math.min(prevTarget!, targetIndex, sourceIndex) - 1
      const rangeMax = needsFullPass
        ? Infinity
        : Math.max(prevTarget!, targetIndex, sourceIndex) + 1

      let targetEl: HTMLElement | null = null
      const map = dtype === 'row' ? rowIndexMapRef.current : colIndexMapRef.current
      const entry = map.get(targetIndex)
      if (entry) targetEl = entry.outer

      positionPlaceholder(targetEl, sourceIndex, targetIndex, dtype)

      // ── STEP 2: Apply all style writes (no reads after this) ──
      const applyShift = (
        idxMap: Map<number, { outer: HTMLElement; inner: HTMLElement }>,
        axis: 'Y' | 'X',
        amount: number,
      ) => {
        const doEntry = (idx: number, outer: HTMLElement, inner: HTMLElement) => {
          let shift = ''
          if (idx > sourceIndex && idx <= targetIndex) shift = `translate${axis}(-${amount}px)`
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translate${axis}(${amount}px)`
          inner.style.transform = shift
          inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
          if (shift) shiftedElementsRef.current.add(inner)
          if (idx === targetIndex) outer.setAttribute('data-drop-target', 'true')
          else outer.removeAttribute('data-drop-target')
        }

        if (needsFullPass) {
          for (const [idx, { outer, inner }] of idxMap) doEntry(idx, outer, inner)
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const e = idxMap.get(idx)
            if (e) doEntry(idx, e.outer, e.inner)
          }
        }
      }

      if (dtype === 'row') {
        applyShift(rowIndexMapRef.current, 'Y', size.height)
      } else if (dtype === 'column') {
        applyShift(colIndexMapRef.current, 'X', size.width)

        // Shift body cells — only write when the shift actually changed
        const cellMap = cellIndexMapRef.current
        const cache = cellShiftCache.current
        const doCells = (idx: number, cells: HTMLElement[], firstPass: boolean) => {
          let shift = ''
          if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`
          for (const cell of cells) {
            if (cache.get(cell) === shift) continue // skip if unchanged
            cell.style.transform = shift
            if (firstPass) cell.style.transition = TRANSITION_STYLE // set once, never again
            cache.set(cell, shift)
            if (shift) shiftedCellsRef.current.add(cell)
          }
        }
        if (needsFullPass) {
          for (const [idx, cells] of cellMap) doCells(idx, cells, true)
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const cells = cellMap.get(idx)
            if (cells) doCells(idx, cells, false)
          }
        }
      }

      prevTargetIndexRef.current = targetIndex
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
    cellShiftCache.current.clear()

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
      cloneBodyElRef.current = null
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

      const bodyScrollLeft = body?.scrollLeft ?? 0
      const bodyScrollTop = body?.scrollTop ?? 0
      requestAnimationFrame(() => {
        const c = refs.cloneRef?.current
        if (!c) return
        if (dtype === 'row') {
          c.scrollLeft = bodyScrollLeft
        } else {
          const cb = c.querySelector('.clone-body') as HTMLElement | null
          if (cb) cb.scrollTop = bodyScrollTop
        }
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
      pointerRef.current.x = clientX
      pointerRef.current.y = clientY

      const container = refs.bodyRef?.current
      if (!container) return

      let rect = cachedContainerRef.current
      if (!rect || mapStaleRef.current) {
        rect = container.getBoundingClientRect()
        cachedContainerRef.current = rect
      }

      const bodyScrollLeft = container.scrollLeft
      const bodyScrollTop = container.scrollTop
      let cloneBodyScrollTop = 0
      const cloneEl = refs.cloneRef?.current
      if (cloneEl && dragTypeRef.current === 'column') {
        if (!cloneBodyElRef.current) {
          cloneBodyElRef.current = cloneEl.querySelector('.clone-body') as HTMLElement | null
        }
        if (cloneBodyElRef.current) cloneBodyScrollTop = container.scrollTop
      }

      if (cloneEl) {
        cloneEl.style.transform = `translate(${clientX - initial.x}px, ${clientY - initial.y}px)`
        if (dragTypeRef.current === 'row') cloneEl.scrollLeft = bodyScrollLeft
        else if (cloneBodyElRef.current) cloneBodyElRef.current.scrollTop = cloneBodyScrollTop
      }

      let dropIndex = 0
      const dtype = dragTypeRef.current || dragType

      // Check if cached map elements are still in the DOM (virtual tables swap elements)
      if (!mapStaleRef.current && rowIndexMapRef.current.size > 0) {
        const firstEntry = rowIndexMapRef.current.values().next().value
        if (firstEntry && !firstEntry.outer.isConnected) {
          mapStaleRef.current = true
        }
      }
      if (!mapStaleRef.current && colIndexMapRef.current.size > 0) {
        const firstEntry = colIndexMapRef.current.values().next().value
        if (firstEntry && !firstEntry.outer.isConnected) {
          mapStaleRef.current = true
        }
      }

      // Auto-scroll detection

      if (dtype === 'row') {
        if (clientY < rect.top + 30) {
          startAutoScroll(-5, container, 'vertical')
          mapStaleRef.current = true // Mark map as stale while auto-scrolling
        } else if (clientY > rect.bottom - 30) {
          startAutoScroll(5, container, 'vertical')
          mapStaleRef.current = true
        } else {
          stopAutoScroll()
          // Rebuild map once after auto-scroll made it stale
          if (mapStaleRef.current) {
            mapStaleRef.current = false
            cachedItemsRef.current = null
            prevTargetIndexRef.current = null
            targetIndexRef.current = null
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
          mapStaleRef.current = true
        } else if (clientX > rect.right - 30) {
          startAutoScroll(5, container, 'horizontal')
          mapStaleRef.current = true
        } else {
          stopAutoScroll()
          if (mapStaleRef.current) {
            mapStaleRef.current = false
            cachedItemsRef.current = null
            prevTargetIndexRef.current = null
            targetIndexRef.current = null
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
      }

      // Use cached items if available, otherwise recompute
      let items: RowItem[] | ColumnItem[] | null
      if (dtype === 'row') {
        items = cachedItemsRef.current as RowItem[] | null
        if (!items) {
          items = computeRowItems()
          cachedItemsRef.current = items
        }
        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndex(clientY - rect.top + bodyScrollTop, items)
        }
      } else {
        items = cachedItemsRef.current as ColumnItem[] | null
        if (!items) {
          items = computeColumnItems()
          cachedItemsRef.current = items
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
      refs.bodyRef,
      refs.cloneRef,
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

    // Throttle pointermove to one dragMove per animation frame.
    // pointermove can fire 120+ times/sec on high-refresh displays.
    let pendingX = 0,
      pendingY = 0,
      rafPending = false
    const onPointerMove = (e: PointerEvent) => {
      pendingX = e.clientX
      pendingY = e.clientY
      if (!rafPending) {
        rafPending = true
        requestAnimationFrame(() => {
          rafPending = false
          dragMove(pendingX, pendingY)
        })
      }
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
