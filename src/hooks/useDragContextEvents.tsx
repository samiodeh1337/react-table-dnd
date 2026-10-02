/**
 * useDragContextEvents — the drag orchestrator.
 *
 * One drag, start to finish:
 *   dragStart  (mousedown)  → selection press rule; selectable rows wait 5px, others start now
 *   beginDrag               → resolve the DragGroup, cache geometry, hide rows, build the clone
 *   dragMove   (per frame)  → move the clone, auto-scroll at the edges, resolve the slot, shift rows
 *   dragEnd    (release)    → snap the clone into the slot, then finalizeDrop
 *   finalizeDrop            → restore rows, call onDragEnd, settle animation
 *
 * The lifecycle callbacks (onDragStart / onDragOver / onDragEnd / onDragCancel) are
 * read from a ref at call time and receive objects built by `drag/dropResult.ts`.
 *   dragCancel (Escape)     → restore everything, nothing moves
 *
 * Decisions live in `drag/*` (pure) and the smaller hooks; this file only sequences them.
 */
import { useCallback, useEffect, useRef, type Dispatch } from 'react'
import { flushSync } from 'react-dom'
import useAutoScroll from './useAutoScroll'
import useLongPress from './useLongPress'
import useShiftTransforms from './useShiftTransforms'
import useIndexMaps from './useIndexMaps'
import useDropTarget from './useDropTarget'
import useSelectionGestures, { type CommitSelection } from './useSelectionGestures'
import useDeferredActivation from './useDeferredActivation'
import useDropSettle from './useDropSettle'
import useDragClone from './useDragClone'
import useHiddenElements from './useHiddenElements'
import useDragWindowEvents from './useDragWindowEvents'
import { isScrollbarClick } from '../Components/utils'
import {
  CLICK_MOVE_TOLERANCE,
  DROP_SNAP_MS,
  EDGE_SCROLL_SPEED,
  EDGE_SCROLL_ZONE,
} from './drag/constants'
import {
  findDraggable,
  isInteractiveTarget,
  isTextEntryTarget,
  type FoundDraggable,
} from './drag/dom'
import { resolveDragGroup, type MountedRowInfo } from './drag/dragGroup'
import { dragCancelInfo, dragStartInfo, dropResult } from './drag/dropResult'
import type {
  HookRefs,
  DraggedState,
  DragType,
  Options,
  DragCallbacks,
  DragGroup,
  Point,
  TableAction,
  TableState,
} from './types'
import useIsomorphicLayoutEffect from './useIsomorphicLayoutEffect'

type PressEvent = React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>

const useDragContextEvents = (
  refs: HookRefs,
  dragged: DraggedState,
  dispatch: Dispatch<TableAction>,
  dragType: DragType | null,
  options: Options,
  callbacks: DragCallbacks,
  getState?: () => TableState,
  commitSelection?: CommitSelection,
) => {
  // ---- collaborators -------------------------------------------------------------------
  const autoScroll = useAutoScroll(refs as Parameters<typeof useAutoScroll>[0])
  const { startAutoScroll, stopAutoScroll, setContainerRect, pointerRef } = autoScroll
  const indexMaps = useIndexMaps(refs)
  const { rowIndexMapRef, colIndexMapRef, cellIndexMapRef, mapStaleRef } = indexMaps
  const groupRef = useRef<DragGroup | null>(null) // what is being dragged (never null mid-drag)
  const shifts = useShiftTransforms(refs, rowIndexMapRef, colIndexMapRef, cellIndexMapRef, groupRef)
  const { applyShiftTransforms, clearShiftTransforms, prevTargetIndexRef, draggedSizeRef } = shifts
  const drop = useDropTarget(refs, options, groupRef)
  const { resolveDropIndex, cachedItemsRef, cachedContainerRef } = drop
  const selection = useSelectionGestures(
    refs,
    !!options.selectable,
    dragged.isDragging,
    getState,
    commitSelection,
  )
  const activation = useDeferredActivation()
  const settle = useDropSettle()
  const clone = useDragClone(refs.cloneRef, dragged.isDragging)
  const hidden = useHiddenElements(refs, rowIndexMapRef)

  // ---- per-drag state --------------------------------------------------------------------
  const dragTypeRef = useRef<DragType | null>(null)
  const initialRef = useRef<Point>({ x: 0, y: 0 }) // pointer offset inside the grabbed item
  const targetIndexRef = useRef<number | null>(null)
  // true whenever no drag is running (also before the first one): moves and ends are ignored
  const dragEndFiredRef = useRef(true)
  // the latest callbacks, read when they fire: a consumer may pass new functions every render
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  // the last slot onDragOver reported; unlike targetIndexRef it survives the resets that
  // auto-scroll and map rebuilds do, so the same slot is never reported twice
  const reportedSlotRef = useRef<number | null>(null)
  const dragSeqRef = useRef(0) // bumps per drag so late animation frames from an older drag are ignored
  const isVirtualRef = useRef(false)
  const dropAnimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFinalizeRef = useRef<(() => void) | null>(null)
  // where the drag started, and whether the pointer has left the click tolerance since: a press
  // that never moved ends in onDragCancel, not onDragEnd
  const startPointRef = useRef<Point>({ x: 0, y: 0 })
  const movedRef = useRef(false)

  useEffect(
    () => () => {
      if (dropAnimTimeoutRef.current !== null) clearTimeout(dropAnimTimeoutRef.current)
      pendingFinalizeRef.current = null // never finalize into an unmounted tree
    },
    [],
  )

  /** Run any drop cleanup that is still waiting on the snap animation. Returns true when a drop
   *  was actually finalized (the consumer re-rendered, so the DOM may have changed). */
  const flushPendingDrop = useCallback((): boolean => {
    if (dropAnimTimeoutRef.current !== null) {
      clearTimeout(dropAnimTimeoutRef.current)
      dropAnimTimeoutRef.current = null
    }
    const finalize = pendingFinalizeRef.current
    pendingFinalizeRef.current = null
    finalize?.()
    return finalize !== null
  }, [])

  /** Re-hide the group after a virtual table remounted its rows. */
  const rehideGroup = useCallback(() => {
    if (groupRef.current) hidden.hideGroupRows(groupRef.current)
  }, [hidden])

  // ---- begin ---------------------------------------------------------------------------------
  /** The selected rows that are mounted, measured. Only a multi-row selection needs this;
   *  otherwise the group is the grabbed row alone and nothing is measured. */
  const mountedRowInfo = useCallback(
    (selectedIds: ReadonlySet<string> | null): MountedRowInfo[] => {
      const rows: MountedRowInfo[] = []
      if (!selectedIds || selectedIds.size < 2) return rows
      for (const [index, { outer }] of rowIndexMapRef.current) {
        const id = outer.dataset.id
        if (id === undefined || !selectedIds.has(id)) continue
        rows.push({
          index,
          id,
          locked: outer.dataset.disabled === 'true',
          height: outer.getBoundingClientRect().height,
        })
      }
      return rows
    },
    [rowIndexMapRef],
  )

  const dispatchDragStart = useCallback(
    (group: DragGroup, dtype: DragType | null, itemRect: DOMRect, translate: Point) => {
      const body = refs.bodyRef?.current
      const tableEl = refs.tableRef?.current
      dispatch({
        type: 'dragStart',
        value: {
          rect: { draggedItemHeight: itemRect.height, draggedItemWidth: itemRect.width },
          dragged: {
            initial: initialRef.current,
            translate,
            draggedID: group.grabbedId,
            isDragging: true,
            sourceIndex: group.grabbed,
          },
          dragType: dtype,
          tableDimensions: {
            height:
              (tableEl?.offsetHeight ?? 0) - (body ? body.offsetHeight - body.clientHeight : 0),
            width: (tableEl?.offsetWidth ?? 0) - (body ? body.offsetWidth - body.clientWidth : 0),
          },
        },
      })
    },
    [refs.bodyRef, refs.tableRef, dispatch],
  )

  /** Fresh per-drag state: a new sequence number, no slot yet, nothing fired. */
  const resetDragState = useCallback(
    (dtype: DragType | null, alreadyMoved: boolean) => {
      dragSeqRef.current++
      dragTypeRef.current = dtype
      targetIndexRef.current = null
      prevTargetIndexRef.current = null
      reportedSlotRef.current = null
      dragEndFiredRef.current = false
      selection.setMoved(alreadyMoved)
    },
    [selection, prevTargetIndexRef],
  )

  /** Measure the grabbed item and the body once; build the index maps. Returns where the
   *  clone starts (the item's screen position, in clone coordinates). */
  const captureGeometry = useCallback(
    (
      draggableEl: HTMLElement,
      dtype: DragType | null,
      clientX: number,
      clientY: number,
    ): { itemRect: DOMRect; translate: Point } => {
      const body = refs.bodyRef?.current ?? null
      const itemRect = draggableEl.getBoundingClientRect()
      const scrollOffset = dtype === 'row' ? (body?.scrollLeft ?? 0) : 0
      draggedSizeRef.current = { width: itemRect.width, height: itemRect.height }
      initialRef.current = { x: clientX - itemRect.left - scrollOffset, y: clientY - itemRect.top }
      pointerRef.current = { x: clientX, y: clientY }
      if (body) {
        cachedContainerRef.current = body.getBoundingClientRect()
        setContainerRect(cachedContainerRef.current)
      }
      indexMaps.buildMaps(dtype, body)
      isVirtualRef.current =
        (body?.querySelector('[data-rtdnd="draggable"][data-type="row"]') as HTMLElement | null)
          ?.style.position === 'absolute'
      return { itemRect, translate: { x: itemRect.left + scrollOffset, y: itemRect.top } }
    },
    [refs.bodyRef, draggedSizeRef, pointerRef, cachedContainerRef, setContainerRect, indexMaps],
  )

  /** Everything a drag needs before its first move: geometry, the group, hidden rows, the clone. */
  const startDrag = useCallback(
    (
      draggableEl: HTMLElement,
      clientX: number,
      clientY: number,
      selectedIds: ReadonlySet<string> | null,
      alreadyMoved: boolean,
    ) => {
      flushPendingDrop() // no-op after beginDrag; kept so startDrag is safe on its own
      settle.clear()
      hidden.restore()

      const dtype = (draggableEl.dataset.type as DragType | undefined) ?? null
      const body = refs.bodyRef?.current ?? null
      resetDragState(dtype, alreadyMoved)
      startPointRef.current = { x: clientX, y: clientY }
      movedRef.current = alreadyMoved // a deferred drag starts only after the pointer moved
      const { itemRect, translate } = captureGeometry(draggableEl, dtype, clientX, clientY)

      const grabbed: MountedRowInfo = {
        index: +draggableEl.dataset.index!,
        id: draggableEl.dataset.id!,
        height: itemRect.height,
        locked: false,
      }
      const selection = dtype === 'row' ? selectedIds : null
      const group = resolveDragGroup(
        selection,
        mountedRowInfo(selection),
        grabbed,
        isVirtualRef.current,
      )
      groupRef.current = group
      cachedItemsRef.current = dtype === 'row' ? drop.computeRowItems() : drop.computeColumnItems()

      hidden.grab(draggableEl) // the pressed row disappears; its clone is what the user sees
      const columnCells = clone.build({
        dtype,
        draggableEl,
        group,
        body,
        isVirtual: isVirtualRef.current,
        showBadge: options.showDragCount !== false,
        grabX: initialRef.current.x,
        x: translate.x,
        y: translate.y,
      })
      hidden.hideCells(columnCells) // column drags only; restore() shows them again after the drop
      if (dtype === 'row') {
        // after cloning (the clone snapshots visible rows); the members chase the card, which
        // follows the pointer from the first move on
        hidden.foldGroupRows(group, () => pointerRef.current.y - initialRef.current.y)
      }

      dispatchDragStart(group, dtype, itemRect, translate)
      if (dtype) callbacksRef.current.onDragStart?.(dragStartInfo(group, dtype))
      const bodyScrollLeft = body?.scrollLeft ?? 0
      const bodyScrollTop = body?.scrollTop ?? 0
      requestAnimationFrame(() => clone.syncScroll(bodyScrollLeft, bodyScrollTop))
    },
    [
      refs.bodyRef,
      options.showDragCount,
      settle,
      drop,
      clone,
      hidden,
      flushPendingDrop,
      resetDragState,
      captureGeometry,
      mountedRowInfo,
      dispatchDragStart,
      cachedItemsRef,
      pointerRef,
    ],
  )

  /**
   * Start a drag on the pressed row/column. Returns false when nothing can be dragged (the
   * press was resolved as a click, or the row is gone).
   */
  const beginDrag = useCallback(
    (
      e: PressEvent,
      clientX: number,
      clientY: number,
      selectedIds?: ReadonlySet<string> | null, // resolved by dragStart; touch resolves it here
      alreadyMoved = false,
      preFound?: FoundDraggable, // the row found at press time (its content may have re-rendered)
    ): boolean => {
      // A drop still snapping (200ms) re-renders the consumer when flushed; rows keyed by index
      // remount then, so flush first and only then check that the pressed row is still there.
      flushPendingDrop()
      if (preFound && !preFound.element.isConnected) return false
      const found = preFound ?? findDraggable(e.target)
      if (!found || !found.element.isConnected) return false

      if (selectedIds === undefined) {
        // touch: run the press rule now, flushed so the row already renders as selected
        // before its content is cloned; the store (not the guess) then defines the group
        const pressed = flushSync(() => selection.press(e, found, clientX, clientY))
        if (pressed.clickNow) return false
        selectedIds = selection.enabled() ? getState!().selection.ids : null
      }
      if (!found.foundHandle && found.element.querySelector('[data-drag-handle]')) return false

      startDrag(found.element, clientX, clientY, selectedIds, alreadyMoved)
      return true
    },
    [selection, getState, startDrag, flushPendingDrop],
  )

  // ---- move ----------------------------------------------------------------------------------
  /** The pointer is now over `slot`: report it to `onDragOver` if it is a new one. */
  const reportSlot = useCallback((slot: number | null, dtype: DragType): number | null => {
    const group = groupRef.current
    if (slot === null || !group || slot === reportedSlotRef.current) return slot
    reportedSlotRef.current = slot
    callbacksRef.current.onDragOver?.(dropResult(group, slot, dtype))
    return slot
  }, [])

  /** After a scroll (auto-scroll stopping, the page, a parent or the body scrolling) or a resize:
   *  fresh positions, fresh maps in a virtual list, fresh slot. */
  const recomputeAfterScroll = useCallback(
    (dtype: DragType) => {
      const seq = dragSeqRef.current
      requestAnimationFrame(() => {
        if (dragEndFiredRef.current || seq !== dragSeqRef.current) return
        const body = refs.bodyRef?.current
        if (!body) return
        if (isVirtualRef.current) {
          if (dtype === 'row') {
            indexMaps.rebuildRowMap(body)
            rehideGroup()
          } else {
            indexMaps.rebuildColumnMaps(body, refs.headerRef?.current ?? null)
            hidden.hideCells(clone.topUpStrip(body)) // rows mounted since the drag began
          }
        }
        clone.syncScroll(body.scrollLeft, body.scrollTop)
        cachedItemsRef.current = null
        const rect = body.getBoundingClientRect()
        cachedContainerRef.current = rect
        const target = reportSlot(
          resolveDropIndex(
            pointerRef.current.x,
            pointerRef.current.y,
            dtype,
            rect,
            body.scrollTop,
            initialRef.current,
          ),
          dtype,
        )
        targetIndexRef.current = target
        prevTargetIndexRef.current = null
        applyShiftTransforms(target, dtype)
      })
    },
    [
      refs.bodyRef,
      refs.headerRef,
      indexMaps,
      rehideGroup,
      hidden,
      clone,
      cachedItemsRef,
      cachedContainerRef,
      resolveDropIndex,
      reportSlot,
      pointerRef,
      prevTargetIndexRef,
      applyShiftTransforms,
    ],
  )

  /** Start/stop auto-scroll depending on where the pointer is relative to the body's edges. */
  const edgeAutoScroll = useCallback(
    (
      dtype: DragType,
      clientX: number,
      clientY: number,
      rect: DOMRect,
      container: HTMLDivElement,
    ) => {
      const axis = dtype === 'row' ? 'vertical' : 'horizontal'
      const pos = dtype === 'row' ? clientY : clientX
      const lo = dtype === 'row' ? rect.top : rect.left
      const hi = dtype === 'row' ? rect.bottom : rect.right
      const scrolling =
        dtype === 'row' ? autoScroll.isAutoScrollingVertical : autoScroll.isAutoScrollingHorizontal
      if (pos < lo + EDGE_SCROLL_ZONE) {
        startAutoScroll(-EDGE_SCROLL_SPEED, container, axis)
        mapStaleRef.current = true
      } else if (pos > hi - EDGE_SCROLL_ZONE) {
        startAutoScroll(EDGE_SCROLL_SPEED, container, axis)
        mapStaleRef.current = true
      } else {
        const wasScrolling = scrolling.current
        stopAutoScroll()
        if (wasScrolling) recomputeAfterScroll(dtype)
      }
    },
    [
      autoScroll.isAutoScrollingVertical,
      autoScroll.isAutoScrollingHorizontal,
      startAutoScroll,
      stopAutoScroll,
      mapStaleRef,
      recomputeAfterScroll,
    ],
  )

  /** The maps went stale (auto-scroll): drop the caches; a virtual table also rebuilds them. */
  const refreshStaleMaps = useCallback(
    (dtype: DragType, container: HTMLDivElement) => {
      cachedItemsRef.current = null
      targetIndexRef.current = null
      prevTargetIndexRef.current = null
      if (!isVirtualRef.current) mapStaleRef.current = false
      else if (dtype === 'row') {
        indexMaps.rebuildRowMap(container)
        rehideGroup()
      } else indexMaps.rebuildColumnMaps(container, refs.headerRef?.current ?? null)
    },
    [cachedItemsRef, prevTargetIndexRef, mapStaleRef, indexMaps, rehideGroup, refs.headerRef],
  )

  const dragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (dragEndFiredRef.current) return
      const container = refs.bodyRef?.current
      if (!container) return
      const dtype = dragTypeRef.current ?? dragType ?? 'row'
      pointerRef.current.x = clientX
      pointerRef.current.y = clientY
      selection.noteMove(clientX, clientY)
      if (
        !movedRef.current &&
        (Math.abs(clientX - startPointRef.current.x) > CLICK_MOVE_TOLERANCE ||
          Math.abs(clientY - startPointRef.current.y) > CLICK_MOVE_TOLERANCE)
      )
        movedRef.current = true

      let rect = cachedContainerRef.current
      if (!rect || mapStaleRef.current)
        cachedContainerRef.current = rect = container.getBoundingClientRect()
      const bodyScrollTop = container.scrollTop

      clone.follow(clientX - initialRef.current.x, clientY - initialRef.current.y)
      clone.syncScroll(container.scrollLeft, bodyScrollTop)

      if (isVirtualRef.current) indexMaps.checkStaleness()
      if (mapStaleRef.current) refreshStaleMaps(dtype, container)
      edgeAutoScroll(dtype, clientX, clientY, rect, container)

      const target = reportSlot(
        resolveDropIndex(clientX, clientY, dtype, rect, bodyScrollTop, initialRef.current),
        dtype,
      )
      if (target === targetIndexRef.current) return
      targetIndexRef.current = target
      const seq = dragSeqRef.current
      requestAnimationFrame(() => {
        if (dragEndFiredRef.current || seq !== dragSeqRef.current) return
        applyShiftTransforms(target, dtype)
      })
    },
    [
      refs.bodyRef,
      dragType,
      pointerRef,
      selection,
      cachedContainerRef,
      mapStaleRef,
      clone,
      indexMaps,
      refreshStaleMaps,
      edgeAutoScroll,
      resolveDropIndex,
      reportSlot,
      applyShiftTransforms,
    ],
  )

  const dragMoveRef = useRef(dragMove)
  dragMoveRef.current = dragMove
  // Virtual tables remount rows while auto-scrolling even if the pointer is still: re-run the
  // move pipeline per scroll tick so remounted members are re-hidden and shifts stay current.
  autoScroll.onTickRef.current = () => {
    if (!isVirtualRef.current || dragEndFiredRef.current || dragTypeRef.current !== 'row') return
    dragMoveRef.current(pointerRef.current.x, pointerRef.current.y)
  }

  // ---- drop ------------------------------------------------------------------------------------
  /** Tell the consumer how the drag ended: a drop (`onDragEnd`, inside flushSync so the new order
   *  renders before the settle animation measures it), or no slot at all (`onDragCancel`). */
  const reportDrop = useCallback(
    (group: DragGroup, target: number | null, dtype: DragType | null) => {
      const { onDragEnd, onDragCancel } = callbacksRef.current
      const dropped = target !== null && movedRef.current // a press that never moved is no drop
      flushSync(() => {
        if (dropped && dtype) onDragEnd?.(dropResult(group, target, dtype))
        dispatch({ type: 'dragEnd', value: { targetIndex: target, sourceIndex: group.grabbed } })
      })
      if (!dropped && dtype) onDragCancel?.(dragCancelInfo(group, dtype))
    },
    [dispatch],
  )

  const finalizeDrop = useCallback(
    (
      group: DragGroup,
      target: number | null,
      dtype: DragType | null,
      savedScrollTop: number,
      savedScrollLeft: number,
    ) => {
      clone.hide()
      const body = refs.bodyRef?.current ?? null

      let snapshot = null
      if (dtype === 'row' && body) {
        const ph = refs.placeholderRef?.current
        const landing = ph && ph.style.display !== 'none' ? parseFloat(ph.style.top) || 0 : null
        snapshot = settle.measure(body, group.ids, landing)
      }

      hidden.restore()
      reportDrop(group, target, dtype) // the consumer re-renders the new order here
      clearShiftTransforms()

      if (!body) return
      body.scrollTop = savedScrollTop
      body.scrollLeft = savedScrollLeft
      requestAnimationFrame(() => {
        body.scrollTop = savedScrollTop
        body.scrollLeft = savedScrollLeft
      })
      if (snapshot) settle.play(body, snapshot, group.grabbedId)
    },
    [refs.bodyRef, refs.placeholderRef, clone, settle, hidden, reportDrop, clearShiftTransforms],
  )

  const dragEnd = useCallback(() => {
    if (dragEndFiredRef.current) return
    dragEndFiredRef.current = true
    cancelLongPress()
    releaseTouchSoon()

    const group = groupRef.current
    const target = targetIndexRef.current
    const dtype = dragTypeRef.current
    selection.release() // clears the press record (a mouse drag has always moved by now; touch presses never click here)
    hidden.settleFold() // a fold still running would chase a pointer that no longer moves

    const body = refs.bodyRef?.current
    const savedScrollTop = body?.scrollTop ?? 0
    const savedScrollLeft = body?.scrollLeft ?? 0
    cachedItemsRef.current = null
    cachedContainerRef.current = null
    stopAutoScroll()
    dragTypeRef.current = null
    targetIndexRef.current = null
    if (!group) return

    const finalize = () => finalizeDrop(group, target, dtype, savedScrollTop, savedScrollLeft)
    const ph = refs.placeholderRef?.current
    const slotShown = !!ph && ph.style.display !== 'none'
    if (slotShown && clone.snapTo(parseFloat(ph.style.left) || 0, parseFloat(ph.style.top) || 0)) {
      // finalize once the clone has settled into the slot
      pendingFinalizeRef.current = finalize
      dropAnimTimeoutRef.current = setTimeout(() => {
        dropAnimTimeoutRef.current = null
        flushPendingDrop()
      }, DROP_SNAP_MS)
    } else finalize()
    // cancelLongPress / releaseTouchSoon come from useLongPress below (a forward reference); they
    // and the cache refs are stable, so they are left out of the deps on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, selection, clone, stopAutoScroll, finalizeDrop, flushPendingDrop])

  const { touchStart, cancelLongPress, isTouchActiveRef, releaseTouchSoon } = useLongPress(
    refs,
    beginDrag,
    dragEnd,
    (x, y) => dragMoveRef.current(x, y),
    selection.tap,
  )

  // ---- start -----------------------------------------------------------------------------------
  const dragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (e.target === e.currentTarget) return
      if (isTouchActiveRef.current) return // a touch gesture is in progress
      if (isScrollbarClick(e.clientX, e.clientY, e.target as HTMLElement)) return

      // A drop still snapping (200ms) is applied first: the consumer re-renders the new order,
      // so the press is then resolved against the layout the user actually sees.
      let target: EventTarget = e.target
      if (flushPendingDrop()) target = document.elementFromPoint(e.clientX, e.clientY) ?? e.target

      const found = findDraggable(target)
      if (!found) {
        selection.clearOnEmptyPress(e)
        return
      }
      if (isTextEntryTarget(target, found.element)) return // caret / text selection / picker
      if (found.element.dataset.type !== 'row' || !selection.enabled()) {
        // columns, or selection off: drag at once (2.x behaviour). A press on a button, link or
        // other control waits for a real move instead, so a click on it still reaches it.
        if (isInteractiveTarget(target, found.element))
          activation.arm({
            startX: e.clientX,
            startY: e.clientY,
            onActivate: (ev) => {
              if (beginDrag(e, e.clientX, e.clientY, undefined, true, found))
                dragMoveRef.current(ev.clientX, ev.clientY)
            },
            onRelease: () => {},
            onCancel: () => {},
          })
        else beginDrag(e, e.clientX, e.clientY, undefined, false, found)
        return
      }

      // Selectable rows: decide the selection now; drag only after the pointer has travelled.
      const { clickNow } = selection.press(e, found, e.clientX, e.clientY, target)
      selection.setMoved(false)
      if (clickNow) return
      activation.arm({
        startX: e.clientX,
        startY: e.clientY,
        onActivate: (ev) => {
          // by now React has flushed the press-time selection (a controlled consumer had its say)
          if (!beginDrag(e, e.clientX, e.clientY, getState!().selection.ids, true, found)) return
          dragMoveRef.current(ev.clientX, ev.clientY)
        },
        onRelease: () => selection.release(),
        onCancel: () => selection.forgetPress(),
      })
    },
    [isTouchActiveRef, selection, beginDrag, activation, getState, flushPendingDrop],
  )

  // ---- cancel ----------------------------------------------------------------------------------
  const dragCancel = useCallback(() => {
    // Already released: the drop is committed and only its snap is still running. Escape then
    // just finishes it now; cancelling on top would report the drag a second time.
    if (dragEndFiredRef.current) {
      flushPendingDrop()
      return
    }
    const group = groupRef.current
    const dtype = dragTypeRef.current
    // Mark the drag as over first: a queued pointer-move frame must not run dragMove (it could
    // restart auto-scroll) and a late pointerup must not run dragEnd.
    dragEndFiredRef.current = true
    flushPendingDrop()
    cancelLongPress()
    releaseTouchSoon()
    cachedItemsRef.current = null
    cachedContainerRef.current = null
    clone.hide()
    hidden.restore()
    selection.forgetPress()
    dispatch({ type: 'dragEnd', value: { targetIndex: null, sourceIndex: null } })
    stopAutoScroll()
    clearShiftTransforms()
    dragTypeRef.current = null
    targetIndexRef.current = null
    if (group && dtype) callbacksRef.current.onDragCancel?.(dragCancelInfo(group, dtype))
  }, [
    flushPendingDrop,
    cancelLongPress,
    releaseTouchSoon,
    cachedItemsRef,
    cachedContainerRef,
    clone,
    hidden,
    selection,
    dispatch,
    stopAutoScroll,
    clearShiftTransforms,
  ])

  // ---- effects ---------------------------------------------------------------------------------
  // drop every row transform after React renders isDragging: false
  useIsomorphicLayoutEffect(() => {
    if (!dragged.isDragging) clearShiftTransforms()
  }, [dragged.isDragging, clearShiftTransforms])

  useDragWindowEvents(dragged.isDragging, dragMove, dragEnd, dragCancel)

  // Every position the drag cached is relative to the screen. When something scrolls without the
  // pointer moving (the page, a parent, the body under a wheel) or the window resizes, those
  // positions are stale: recompute once per frame. Skipped while auto-scroll runs.
  useEffect(() => {
    if (!dragged.isDragging) return
    let queued = false
    const onViewportChange = () => {
      const dtype = dragTypeRef.current
      if (queued || !dtype || dragEndFiredRef.current) return
      if (
        autoScroll.isAutoScrollingVertical.current ||
        autoScroll.isAutoScrollingHorizontal.current
      )
        return
      queued = true
      requestAnimationFrame(() => {
        queued = false
      })
      recomputeAfterScroll(dtype)
    }
    window.addEventListener('scroll', onViewportChange, true) // capture: any scrolling element
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [dragged.isDragging, recomputeAfterScroll, autoScroll])

  return { dragStart, touchStart }
}

export default useDragContextEvents
