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
  selectedIndices?: number[],
) => {
  const {
    startAutoScroll,
    stopAutoScroll,
    setContainerRect,
    pointerRef,
    isAutoScrollingVertical,
    isAutoScrollingHorizontal,
  } = useAutoScroll(refs as Parameters<typeof useAutoScroll>[0])

  const indexMaps = useIndexMaps(refs)
  const { rowIndexMapRef, colIndexMapRef, cellIndexMapRef, mapStaleRef } = indexMaps

  const shifts = useShiftTransforms(refs, rowIndexMapRef, colIndexMapRef, cellIndexMapRef)
  const {
    applyShiftTransforms,
    clearShiftTransforms,
    repositionMultiDragPlaceholder,
    prevTargetIndexRef,
    draggedSizeRef,
  } = shifts

  const drop = useDropTarget(refs, options)
  const { resolveDropIndex, cachedItemsRef, cachedContainerRef } = drop

  const dragTypeRef = useRef<DragType | null>(null)
  const initialRef = useRef<Point>({ x: 0, y: 0 })
  const sourceIndexRef = useRef<number | null>(null)
  const targetIndexRef = useRef<number | null>(null)
  const dragEndFiredRef = useRef(false)
  const isVirtualRef = useRef(false)
  const cloneBodyElRef = useRef<HTMLElement | null>(null)
  const draggedInnerElRef = useRef<HTMLElement | null>(null)
  const draggedColCellsRef = useRef<HTMLElement[]>([])

  // Multi-drag refs
  const multiDragSetRef = useRef<Set<number> | null>(null)
  const multiDragIndicesRef = useRef<number[] | null>(null)
  const hiddenInnerElsRef = useRef<HTMLElement[]>([])

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

      // Multi-drag: freeze selection at drag start
      const isMultiDrag =
        dtype === 'row' &&
        selectedIndices &&
        selectedIndices.length > 1 &&
        selectedIndices.includes(sourceIndex)
      multiDragSetRef.current = isMultiDrag ? new Set(selectedIndices) : null
      multiDragIndicesRef.current = isMultiDrag ? [...selectedIndices].sort((a, b) => a - b) : null
      hiddenInnerElsRef.current = []

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

      // Multi-drag: hide all other selected rows after maps are built
      if (isMultiDrag) {
        for (const selIdx of multiDragIndicesRef.current!) {
          if (selIdx === sourceIndex) continue // already hidden above
          const entry = rowIndexMapRef.current.get(selIdx)
          if (entry) {
            entry.inner.style.opacity = '0'
            entry.inner.style.pointerEvents = 'none'
            hiddenInnerElsRef.current.push(entry.inner)
          }
        }
      }

      const cloneEl = refs.cloneRef?.current
      if (cloneEl) {
        cloneEl.innerHTML = ''
        cloneEl.classList.remove('multi-drag-clone')
        if (isMultiDrag) cloneEl.classList.add('multi-drag-clone')
        cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`

        // Build native DOM clone (no React re-render needed)
        // Important: clone the *inner content* (children of Draggable), NOT draggableEl itself.
        // draggableEl may carry virtual-scroll positioning (position:absolute, top:Xpx, transform)
        // that would misplace the clone inside #portalroot.
        // This mirrors what React.cloneElement(children) did in the old Draggable.onPointerDown.
        const firstBodyRow = body?.querySelector('[data-type="row"]') as HTMLElement | null
        isVirtualRef.current = firstBodyRow?.style.position === 'absolute'

        if (dtype === 'row') {
          const rowContent = draggableEl.firstElementChild?.firstElementChild
          if (rowContent) {
            if (isMultiDrag) {
              // Stacked clone: use box-shadow for the "stack" effect.
              // Box-shadow renders OUTSIDE the element and is never clipped by overflow.
              const count = multiDragSetRef.current!.size
              const layers = Math.min(count, 3)

              const wrapper = document.createElement('div')
              wrapper.style.position = 'relative'

              // Primary layer with stacked box-shadow
              const primaryWrap = document.createElement('div')
              primaryWrap.style.position = 'relative'
              primaryWrap.style.zIndex = '2'
              // Build stacked shadow layers
              const shadows: string[] = []
              for (let i = 1; i < layers; i++) {
                const offset = i * 4
                const opacity = 0.4 - (i - 1) * 0.15
                shadows.push(`${offset}px ${offset}px 0 -1px #1e1e24`)
                shadows.push(`${offset}px ${offset}px 0 0 rgba(46,46,54,${opacity})`)
              }
              if (shadows.length) primaryWrap.style.boxShadow = shadows.join(', ')
              primaryWrap.style.borderRadius = '4px'
              primaryWrap.appendChild(rowContent.cloneNode(true))
              wrapper.appendChild(primaryWrap)

              // Badge — positioned outside the clone, needs overflow:visible on #portalroot
              const badge = document.createElement('div')
              badge.textContent = String(count)
              Object.assign(badge.style, {
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                zIndex: '10',
                background: '#6366f1',
                color: '#fff',
                borderRadius: '50%',
                minWidth: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 2px 8px rgba(99,102,241,.4)',
                lineHeight: '1',
              })
              wrapper.appendChild(badge)

              cloneEl.appendChild(wrapper)
            } else {
              cloneEl.appendChild(rowContent.cloneNode(true))
            }
          }
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

          // Body column strip
          const bodyWrapper = document.createElement('div')
          bodyWrapper.style.flex = '1'

          const inner = document.createElement('div')
          inner.className = 'rbody'
          inner.style.height = `${body.scrollHeight}px`
          inner.style.position = 'relative'

          body.querySelectorAll('[data-type="row"]').forEach((row) => {
            const rowClone = row.cloneNode(true) as HTMLElement
            if (isVirtualRef.current) {
              // Virtual rows have spacer divs alongside cells. Strip .tr down to just
              // the target cell so the column strip shows correctly at offset 0.
              const trEl = rowClone.querySelector('.tr')
              if (trEl) {
                const targetCell = trEl.querySelector(`[data-col-index="${idx}"]`)
                while (trEl.firstChild) trEl.removeChild(trEl.firstChild)
                if (targetCell) trEl.appendChild(targetCell)
              }
            } else {
              rowClone.querySelectorAll('[data-col-index]').forEach((cell) => {
                if (cell.getAttribute('data-col-index') !== idx) cell.remove()
              })
            }
            inner.appendChild(rowClone)
          })

          bodyWrapper.appendChild(inner)

          if (isVirtualRef.current) {
            // overflow:auto lets scrollTop work; scrollbarWidth:none hides the scrollbar (Firefox)
            // The 'clone-body-strip' class hides scrollbar in WebKit via style.css
            bodyWrapper.style.overflow = 'auto'
            bodyWrapper.style.scrollbarWidth = 'none'
            bodyWrapper.className = 'clone-body-strip'
          } else {
            bodyWrapper.style.overflow = 'hidden'
          }

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
            height:
              (refs.tableRef?.current?.offsetHeight ?? 0) -
              (body ? body.offsetHeight - body.clientHeight : 0),
            width:
              (refs.tableRef?.current?.offsetWidth ?? 0) -
              (body ? body.offsetWidth - body.clientWidth : 0),
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
      selectedIndices,
      rowIndexMapRef,
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
      if (cloneEl) {
        cloneEl.style.visibility = 'hidden'
        cloneEl.classList.remove('multi-drag-clone')
      }

      if (draggedInnerElRef.current) {
        draggedInnerElRef.current.style.opacity = ''
        draggedInnerElRef.current.style.pointerEvents = ''
        draggedInnerElRef.current.style.zIndex = ''
        draggedInnerElRef.current.style.cursor = ''
        draggedInnerElRef.current = null
      }

      // Restore multi-drag hidden elements
      for (const el of hiddenInnerElsRef.current) {
        el.style.opacity = ''
        el.style.pointerEvents = ''
      }
      hiddenInnerElsRef.current = []

      draggedColCellsRef.current.forEach((cell) => {
        cell.style.opacity = ''
      })
      draggedColCellsRef.current = []

      const tableEl = refs.tableRef?.current
      if (tableEl) tableEl.style.touchAction = ''

      // Capture multi-drag state before clearing
      const frozenSourceIndices = multiDragIndicesRef.current
      multiDragSetRef.current = null
      multiDragIndicesRef.current = null

      flushSync(() => {
        if (
          onDragEnd &&
          finalSource !== null &&
          finalTarget !== null &&
          (finalDragType === 'row' || finalDragType === 'column')
        ) {
          const result: DragEndResult = {
            sourceIndex: finalSource,
            targetIndex: finalTarget,
            dragType: finalDragType,
          }
          if (frozenSourceIndices) result.sourceIndices = frozenSourceIndices
          onDragEnd(result)
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

      // When multi-select is active, modifier-key clicks are for selection, not drag
      if (selectedIndices && selectedIndices.length >= 0 && (e.ctrlKey || e.metaKey || e.shiftKey))
        return

      beginDrag(e, e.clientX, e.clientY)
    },
    [beginDrag, isTouchActiveRef, selectedIndices],
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

      if (isVirtualRef.current) {
        indexMaps.checkStaleness()
      }

      if (mapStaleRef.current) {
        cachedItemsRef.current = null
        targetIndexRef.current = null
        prevTargetIndexRef.current = null
        if (isVirtualRef.current) {
          if (dtype === 'row') {
            indexMaps.rebuildRowMap(container)
          } else {
            indexMaps.rebuildColumnMaps(container, refs.headerRef?.current ?? null)
          }
        } else {
          mapStaleRef.current = false
        }
      }

      // edge-zone auto-scroll
      if (dtype === 'row') {
        if (clientY < rect.top + EDGE_SCROLL_ZONE) {
          startAutoScroll(-EDGE_SCROLL_SPEED, container, 'vertical')
          mapStaleRef.current = true
        } else if (clientY > rect.bottom - EDGE_SCROLL_ZONE) {
          startAutoScroll(EDGE_SCROLL_SPEED, container, 'vertical')
          mapStaleRef.current = true
        } else {
          const wasScrollingV = isAutoScrollingVertical.current
          stopAutoScroll()
          if (wasScrollingV) {
            requestAnimationFrame(() => {
              const c = refs.bodyRef?.current
              if (!c) return
              if (isVirtualRef.current) indexMaps.rebuildRowMap(c)
              cachedItemsRef.current = null
              const freshRect = c.getBoundingClientRect()
              cachedContainerRef.current = freshRect
              const freshDropIndex = resolveDropIndex(
                pointerRef.current.x,
                pointerRef.current.y,
                'row',
                freshRect,
                c.scrollTop,
                initialRef.current,
                draggedSizeRef.current,
                multiDragSetRef.current ?? undefined,
              )
              targetIndexRef.current = freshDropIndex
              prevTargetIndexRef.current = null
              applyShiftTransforms(
                sourceIndexRef.current,
                freshDropIndex,
                'row',
                multiDragSetRef.current ?? undefined,
              )
            })
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
          const wasScrollingH = isAutoScrollingHorizontal.current
          stopAutoScroll()
          if (wasScrollingH) {
            // React virtualizer commits new virtual columns asynchronously after scroll.
            // Wait one rAF for the commit, then: rebuild maps, recompute drop zone from
            // fresh column rects, and re-apply shift transforms.
            requestAnimationFrame(() => {
              const c = refs.bodyRef?.current
              if (!c) return
              if (isVirtualRef.current)
                indexMaps.rebuildColumnMaps(c, refs.headerRef?.current ?? null)
              // Clear cached positions so resolveDropIndex re-reads from the updated DOM
              cachedItemsRef.current = null
              const freshRect = c.getBoundingClientRect()
              cachedContainerRef.current = freshRect
              const freshDropIndex = resolveDropIndex(
                pointerRef.current.x,
                pointerRef.current.y,
                'column',
                freshRect,
                c.scrollTop,
                initialRef.current,
                draggedSizeRef.current,
              )
              targetIndexRef.current = freshDropIndex
              prevTargetIndexRef.current = null
              applyShiftTransforms(
                sourceIndexRef.current,
                freshDropIndex,
                'column',
                multiDragSetRef.current ?? undefined,
              )
            })
          }
        }
      }

      // Multi-drag: always refresh container rect + item cache so positions are never stale
      if (multiDragSetRef.current) {
        cachedItemsRef.current = null
        rect = container.getBoundingClientRect()
        cachedContainerRef.current = rect
      }

      const dropIndex = resolveDropIndex(
        clientX,
        clientY,
        dtype,
        rect,
        bodyScrollTop,
        initial,
        draggedSizeRef.current,
        multiDragSetRef.current ?? undefined,
      )
      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex
        applyShiftTransforms(
          sourceIndexRef.current,
          dropIndex,
          dtype,
          multiDragSetRef.current ?? undefined,
        )
      } else if (multiDragSetRef.current) {
        // Placeholder is position:fixed — reposition every frame to track body scroll
        repositionMultiDragPlaceholder()
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
      isAutoScrollingVertical,
      isAutoScrollingHorizontal,
      indexMaps,
      resolveDropIndex,
      applyShiftTransforms,
      repositionMultiDragPlaceholder,
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

    // Restore multi-drag hidden elements
    if (draggedInnerElRef.current) {
      draggedInnerElRef.current.style.opacity = ''
      draggedInnerElRef.current.style.pointerEvents = ''
      draggedInnerElRef.current.style.zIndex = ''
      draggedInnerElRef.current.style.cursor = ''
      draggedInnerElRef.current = null
    }
    for (const el of hiddenInnerElsRef.current) {
      el.style.opacity = ''
      el.style.pointerEvents = ''
    }
    hiddenInnerElsRef.current = []
    multiDragSetRef.current = null
    multiDragIndicesRef.current = null

    const cloneEl = refs.cloneRef?.current
    if (cloneEl) {
      cloneEl.style.visibility = 'hidden'
      cloneEl.classList.remove('multi-drag-clone')
    }
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
        cloneEl.classList.remove('multi-drag-clone')
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
