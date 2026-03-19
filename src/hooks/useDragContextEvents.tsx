/**
 * useDragContextEvents — the drag orchestrator.
 *
 * Responsibilities:
 *  - Detect drag start (mouse + touch via long-press)
 *  - Move the clone element via direct DOM transforms (no React re-renders during drag)
 *  - Drive edge-zone auto-scroll
 *  - Resolve the drop target index and apply shift animations
 *  - Finalize the drop with a snap animation, then call onDragEnd
 *  - Cancel on Escape key
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type Dispatch } from 'react'
import { flushSync } from 'react-dom'
import useAutoScroll from './useAutoScroll'
import useLongPress from './useLongPress'
import useShiftTransforms from './useShiftTransforms'
import useIndexMaps from './useIndexMaps'
import useDropTarget from './useDropTarget'
import { isScrollbarClick } from '../Components/utils'
import type {
  HookRefs,
  DraggedState,
  DragType,
  Options,
  DragEndResult,
  Point,
  TableAction,
} from './types'

const DROP_SNAP_MS = 200
const EDGE_SCROLL_ZONE = 30
const EDGE_SCROLL_SPEED = 5

function findDraggable(target: EventTarget): { element: HTMLElement; foundHandle: boolean } | null {
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

  const indexMaps = useIndexMaps(refs)
  const { rowIndexMapRef, colIndexMapRef, cellIndexMapRef, mapStaleRef } = indexMaps

  const shifts = useShiftTransforms(refs, rowIndexMapRef, colIndexMapRef, cellIndexMapRef)
  const { applyShiftTransforms, clearShiftTransforms, prevTargetIndexRef, draggedSizeRef } = shifts

  const drop = useDropTarget(refs, options)
  const { resolveDropIndex, cachedItemsRef, cachedContainerRef } = drop

  const dragTypeRef = useRef<DragType | null>(null)
  const initialRef = useRef<Point>({ x: 0, y: 0 })
  const sourceIndexRef = useRef<number | null>(null)
  const targetIndexRef = useRef<number | null>(null)
  const dragEndFiredRef = useRef(false)
  const cloneBodyElRef = useRef<HTMLElement | null>(null)
  const draggedInnerElRef = useRef<HTMLElement | null>(null)
  const draggedColCellsRef = useRef<HTMLElement[]>([])

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

      // Reset refs
      dragTypeRef.current = dtype ?? null
      sourceIndexRef.current = sourceIndex
      targetIndexRef.current = null
      cloneBodyElRef.current = null
      draggedColCellsRef.current = []
      prevTargetIndexRef.current = null
      dragEndFiredRef.current = false

      const scrollOffset = dtype === 'row' ? (refs.bodyRef?.current?.scrollLeft ?? 0) : 0
      const itemRect = draggableEl.getBoundingClientRect()
      draggedSizeRef.current = { width: itemRect.width, height: itemRect.height }

      const initial: Point = {
        x: clientX - itemRect.left - scrollOffset,
        y: clientY - itemRect.top,
      }
      initialRef.current = initial
      pointerRef.current = { x: clientX, y: clientY }

      const translate: Point = { x: itemRect.left + scrollOffset, y: itemRect.top }

      // Cache items + build index maps
      cachedItemsRef.current = dtype === 'row' ? drop.computeRowItems() : drop.computeColumnItems()
      const body = refs.bodyRef?.current
      if (body) {
        cachedContainerRef.current = body.getBoundingClientRect()
        setContainerRect(cachedContainerRef.current)
      }
      indexMaps.buildMaps(dtype, body ?? null)

      // DOM writes
      const tableEl = refs.tableRef?.current
      if (tableEl) tableEl.style.touchAction = 'none'

      const draggedInnerEl = draggableEl.firstElementChild as HTMLElement | null
      if (draggedInnerEl) {
        draggedInnerEl.style.opacity = '0'
        draggedInnerEl.style.pointerEvents = 'none'
        draggedInnerEl.style.zIndex = '2'
        draggedInnerEl.style.cursor = '-webkit-grabbing'
      }
      draggedInnerElRef.current = draggedInnerEl

      const cloneEl = refs.cloneRef?.current
      if (cloneEl) {
        cloneEl.innerHTML = ''
        cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`

        // Build native DOM clone (no React re-render needed)
        // Important: clone the *inner content* (children of Draggable), NOT draggableEl itself.
        // draggableEl may carry virtual-scroll positioning (position:absolute, top:Xpx, transform)
        // that would misplace the clone inside #portalroot.
        // This mirrors what React.cloneElement(children) did in the old Draggable.onPointerDown.
        if (dtype === 'row') {
          // children of Draggable = first child of draggableEl's inner div = the .tr element
          const rowContent = draggableEl.firstElementChild?.firstElementChild
          if (rowContent) cloneEl.appendChild(rowContent.cloneNode(true))
        } else if (dtype === 'column' && body) {
          const idx = String(sourceIndex)

          // Header: clone just the .th element — mirrors React.cloneElement(children) from Draggable
          const thEl = draggableEl.querySelector('.th')
          if (thEl) {
            const headerWrapper = document.createElement('div')
            headerWrapper.style.flexShrink = '0'
            headerWrapper.style.order = '-1'
            headerWrapper.appendChild(thEl.cloneNode(true))
            cloneEl.appendChild(headerWrapper)
          }

          // Body column strip — same structure the React portal produced
          const bodyWrapper = document.createElement('div')
          bodyWrapper.style.overflow = 'hidden'
          bodyWrapper.style.flex = '1'

          const inner = document.createElement('div')
          inner.className = 'rbody'
          inner.style.height = `${body.scrollHeight}px`
          inner.style.position = 'relative'

          body.querySelectorAll('[data-type="row"]').forEach((row) => {
            const rowClone = row.cloneNode(true) as HTMLElement
            rowClone.querySelectorAll('[data-col-index]').forEach((cell) => {
              if (cell.getAttribute('data-col-index') !== idx) cell.remove()
            })
            inner.appendChild(rowClone)
          })

          bodyWrapper.appendChild(inner)
          cloneEl.appendChild(bodyWrapper)
          cloneBodyElRef.current = bodyWrapper

          // Hide body cells AFTER clone is built so cloneNode snapshots them at opacity:1
          draggedColCellsRef.current = []
          body.querySelectorAll<HTMLElement>(`[data-col-index="${idx}"]`).forEach((cell) => {
            cell.style.opacity = '0'
            draggedColCellsRef.current.push(cell)
          })
        }
      }

      dispatch({
        type: 'dragStart',
        value: {
          rect: { draggedItemHeight: itemRect.height, draggedItemWidth: itemRect.width },
          dragged: { initial, translate, draggedID: id ?? null, isDragging: true, sourceIndex },
          dragType: (dtype as DragType) ?? null,
          tableDimensions: {
            height: refs.tableRef?.current?.offsetHeight ?? 0,
            width: refs.tableRef?.current?.offsetWidth ?? 0,
          },
        },
      })

      // Sync clone scroll with body
      const bodyScrollLeft = body?.scrollLeft ?? 0
      const bodyScrollTop = body?.scrollTop ?? 0
      requestAnimationFrame(() => {
        const c = refs.cloneRef?.current
        if (!c) return
        if (dtype === 'row') {
          c.scrollLeft = bodyScrollLeft
        } else if (cloneBodyElRef.current) {
          cloneBodyElRef.current.scrollTop = bodyScrollTop
        }
      })
    },
    [
      dispatch,
      refs,
      pointerRef,
      setContainerRect,
      drop,
      indexMaps,
      cachedItemsRef,
      cachedContainerRef,
      draggedSizeRef,
      prevTargetIndexRef,
    ],
  )

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

      if (draggedInnerElRef.current) {
        draggedInnerElRef.current.style.opacity = ''
        draggedInnerElRef.current.style.pointerEvents = ''
        draggedInnerElRef.current.style.zIndex = ''
        draggedInnerElRef.current.style.cursor = ''
        draggedInnerElRef.current = null
      }

      draggedColCellsRef.current.forEach((cell) => {
        cell.style.opacity = ''
      })
      draggedColCellsRef.current = []

      const tableEl = refs.tableRef?.current
      if (tableEl) tableEl.style.touchAction = ''

      flushSync(() => {
        if (
          onDragEnd &&
          finalSource !== null &&
          finalTarget !== null &&
          (finalDragType === 'row' || finalDragType === 'column')
        ) {
          onDragEnd({ sourceIndex: finalSource, targetIndex: finalTarget, dragType: finalDragType })
        }
        dispatch({ type: 'dragEnd', value: { targetIndex: finalTarget, sourceIndex: finalSource } })
      })

      clearShiftTransforms()

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
      cloneEl.style.transition = `transform ${DROP_SNAP_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      cloneEl.style.transform = `translate(${toX}px, ${toY}px)`
      setTimeout(
        () =>
          finalizeDrop(finalSource, finalTarget, finalDragType, savedScrollTop, savedScrollLeft),
        DROP_SNAP_MS,
      )
    } else {
      finalizeDrop(finalSource, finalTarget, finalDragType, savedScrollTop, savedScrollLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAutoScroll, refs.bodyRef, refs.placeholderRef, refs.cloneRef, finalizeDrop])

  // stable ref so dragEnd/longPress can always call the latest dragMove
  const dragMoveRef = useRef<(x: number, y: number) => void>(() => {})

  const { touchStart, cancelLongPress, isTouchActiveRef } = useLongPress(
    refs,
    beginDrag,
    dragEnd,
    (x: number, y: number) => dragMoveRef.current(x, y),
  )

  const dragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return // ignore right-click / middle-click
      if (e.target === e.currentTarget) return // click on container itself (not a child)
      if (isTouchActiveRef.current) return // touch gesture in progress
      if (isScrollbarClick(e.clientX, e.clientY, e.target as HTMLElement)) return // click on scrollbar track/thumb

      beginDrag(e, e.clientX, e.clientY)
    },
    [beginDrag, isTouchActiveRef],
  )

  const dragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (dragEndFiredRef.current) return

      const initial = initialRef.current
      pointerRef.current.x = clientX
      pointerRef.current.y = clientY

      const container = refs.bodyRef?.current
      if (!container) return

      // refresh container rect when stale (after auto-scroll)
      let rect = cachedContainerRef.current
      if (!rect || mapStaleRef.current) {
        rect = container.getBoundingClientRect()
        cachedContainerRef.current = rect
      }

      // batch reads before writes
      const bodyScrollLeft = container.scrollLeft
      const bodyScrollTop = container.scrollTop
      const cloneEl = refs.cloneRef?.current

      // DOM writes
      if (cloneEl) {
        cloneEl.style.transform = `translate(${clientX - initial.x}px, ${clientY - initial.y}px)`
        if (dragTypeRef.current === 'row') {
          cloneEl.scrollLeft = bodyScrollLeft
        } else if (cloneBodyElRef.current) {
          cloneBodyElRef.current.scrollTop = bodyScrollTop
        }
      }

      const dtype = dragTypeRef.current || dragType

      indexMaps.checkStaleness()

      // edge-zone auto-scroll; rebuild maps when finger leaves the zone
      if (dtype === 'row') {
        if (clientY < rect.top + EDGE_SCROLL_ZONE) {
          startAutoScroll(-EDGE_SCROLL_SPEED, container, 'vertical')
          mapStaleRef.current = true
        } else if (clientY > rect.bottom - EDGE_SCROLL_ZONE) {
          startAutoScroll(EDGE_SCROLL_SPEED, container, 'vertical')
          mapStaleRef.current = true
        } else {
          stopAutoScroll()
          if (mapStaleRef.current) {
            cachedItemsRef.current = null
            prevTargetIndexRef.current = null
            targetIndexRef.current = null
            indexMaps.rebuildRowMap(container)
          }
        }
      } else {
        if (clientX < rect.left + EDGE_SCROLL_ZONE) {
          startAutoScroll(-EDGE_SCROLL_SPEED, container, 'horizontal')
          mapStaleRef.current = true
        } else if (clientX > rect.right - EDGE_SCROLL_ZONE) {
          startAutoScroll(EDGE_SCROLL_SPEED, container, 'horizontal')
          mapStaleRef.current = true
        } else {
          stopAutoScroll()
          if (mapStaleRef.current) {
            cachedItemsRef.current = null
            prevTargetIndexRef.current = null
            targetIndexRef.current = null
            indexMaps.rebuildColumnMaps(container, refs.headerRef?.current ?? null)
          }
        }
      }

      const dropIndex = resolveDropIndex(
        clientX,
        clientY,
        dtype,
        rect,
        bodyScrollTop,
        initial,
        draggedSizeRef.current,
      )
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
      indexMaps,
      resolveDropIndex,
      applyShiftTransforms,
      cachedItemsRef,
      cachedContainerRef,
      mapStaleRef,
      prevTargetIndexRef,
      draggedSizeRef,
    ],
  )

  dragMoveRef.current = dragMove

  const dragCancel = useCallback(() => {
    cancelLongPress()
    cachedItemsRef.current = null
    cachedContainerRef.current = null

    const cloneEl = refs.cloneRef?.current
    if (cloneEl) cloneEl.style.visibility = 'hidden'
    const tableEl = refs.tableRef?.current
    if (tableEl) tableEl.style.touchAction = ''

    dispatch({ type: 'dragEnd', value: { targetIndex: null, sourceIndex: null } })
    stopAutoScroll()
    clearShiftTransforms()

    dragTypeRef.current = null
    sourceIndexRef.current = null
    targetIndexRef.current = null
  }, [
    cancelLongPress,
    cachedItemsRef,
    cachedContainerRef,
    refs.cloneRef,
    refs.tableRef,
    dispatch,
    stopAutoScroll,
    clearShiftTransforms,
  ])

  // reset clone after React re-renders isDragging:false
  useLayoutEffect(() => {
    if (!dragged.isDragging) {
      clearShiftTransforms()
      const cloneEl = refs.cloneRef?.current
      if (cloneEl) {
        cloneEl.style.transition = ''
        cloneEl.style.transform = 'translate(0px, 0px)'
        cloneEl.style.visibility = ''
        cloneEl.scrollLeft = 0
        cloneEl.innerHTML = ''
      }
    }
  }, [dragged.isDragging, clearShiftTransforms, refs.cloneRef])

  // pointermove is rAF-throttled so we don't block the main thread on every event
  useEffect(() => {
    if (!dragged.isDragging) return

    let pendingX = 0
    let pendingY = 0
    let rafPending = false

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

    const onPointerEnd = () => dragEnd()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dragCancel()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [dragged.isDragging, dragMove, dragEnd, dragCancel])

  return { dragStart, touchStart }
}

export default useDragContextEvents
