import { useCallback, useEffect, useRef } from "react";
import useAutoScroll from "./useAutoScroll";
import useLongPress from "./useLongPress";
import { binarySearchDropIndex, binarySearchDropIndexHeader } from "../Components/utils";
import type { HookRefs, DraggedState, DragAction, Options, DragEndResult, RowItem, ColumnItem, Point } from "./types";

const TRANSITION_STYLE = "all 450ms cubic-bezier(0.2, 0, 0, 1)";

// ── Hook ────────────────────────────────────────────────

const useDragContextEvents = (
  refs: HookRefs,
  dragged: DraggedState,
  dispatch: (action: DragAction) => void,
  dragType: string | null,
  options: Options,
  onDragEnd: ((result: DragEndResult) => void) | undefined
) => {
  const { startAutoScroll, stopAutoScroll, setContainerRect, pointerRef } = useAutoScroll(
    refs as Parameters<typeof useAutoScroll>[0]
  );

  // ── Refs ────────────────────────────────────────────────

  const cachedItemsRef = useRef<RowItem[] | ColumnItem[] | null>(null);
  const cachedContainerRef = useRef<DOMRect | null>(null);
  const dragTypeRef = useRef<string | null | undefined>(null);
  const initialRef = useRef<Point>({ x: 0, y: 0 });
  const sourceIndexRef = useRef<number | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const draggedSizeRef = useRef({ width: 0, height: 0 });
  const lastClientRef = useRef<Point>({ x: 0, y: 0 });

  // ── Compute items ───────────────────────────────────────

  const computeRowItems = useCallback((): RowItem[] | null => {
    const body = refs.bodyRef?.current;
    if (!body) return null;
    const scrollTop = body.scrollTop;
    const topOffset = body.getBoundingClientRect().top;

    const elements = body.querySelectorAll('.draggable[data-type="row"]');
    let items: RowItem[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (el.dataset.index === undefined) continue;
      const rect = el.getBoundingClientRect();
      const itemTop = rect.top - topOffset + scrollTop;
      items.push({ height: rect.height, itemTop, itemBottom: itemTop + rect.height, index: el.dataset.index });
    }

    const { start, end } = options.rowDragRange;
    if (start || end) {
      items = items.filter((item) => (!start || +item.index >= start) && (!end || +item.index < end));
    }
    return items;
  }, [refs.bodyRef, options.rowDragRange]);

  const computeColumnItems = useCallback((): ColumnItem[] | null => {
    const header = refs.headerRef?.current;
    if (!header || !header.children[0]) return null;

    let items = Array.from(header.children[0].children).map((el) => {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, width: rect.width, itemLeft: rect.left, itemRight: rect.left + rect.width, index: (el as HTMLElement).dataset.index };
    }).filter((item) => item.index !== undefined);

    const { start, end } = options.columnDragRange ?? {};
    if (start !== undefined || end !== undefined) {
      items = items.filter((item) => {
        const idx = +item.index!;
        return (start === undefined || idx >= start) && (end === undefined || idx < end);
      });
    }
    return items;
  }, [refs.headerRef, options.columnDragRange]);

  // ── Placeholder ─────────────────────────────────────────

  const positionPlaceholder = useCallback(
    (targetEl: HTMLElement | null, sourceIdx: number | null, targetIdx: number | null, dtype: string | null | undefined) => {
      const ph = refs.placeholderRef?.current;
      if (!ph || !targetEl) { if (ph) ph.style.display = "none"; return; }

      const size = draggedSizeRef.current;
      const rect = targetEl.getBoundingClientRect();
      const tableRect = refs.tableRef?.current?.getBoundingClientRect();
      const forward = (sourceIdx ?? 0) < (targetIdx ?? 0);

      ph.style.display = "block";
      if (dtype === "row") {
        ph.style.top = `${forward ? rect.top + rect.height - size.height : rect.top}px`;
        ph.style.left = `${tableRect?.left ?? rect.left}px`;
        ph.style.width = `${tableRect?.width ?? rect.width}px`;
        ph.style.height = `${size.height}px`;
      } else {
        ph.style.top = `${tableRect?.top ?? rect.top}px`;
        ph.style.left = `${forward ? rect.left + rect.width - size.width : rect.left}px`;
        ph.style.width = `${size.width}px`;
        ph.style.height = `${tableRect?.height ?? rect.height}px`;
      }
    },
    [refs.placeholderRef, refs.tableRef]
  );

  // ── Shift transforms ───────────────────────────────────

  const applyShiftTransforms = useCallback(
    (sourceIndex: number | null, targetIndex: number | null, dtype: string | null | undefined) => {
      if (sourceIndex === null || targetIndex === null) return;
      const size = draggedSizeRef.current;
      let targetEl: HTMLElement | null = null;

      const shiftElements = (
        container: HTMLElement | null, selector: string, axis: "X" | "Y", amount: number
      ) => {
        if (!container) return;
        const els = container.querySelectorAll(selector);
        for (let i = 0; i < els.length; i++) {
          const el = els[i] as HTMLElement;
          const idx = +el.dataset.index!;
          const inner = el.firstElementChild as HTMLElement | null;
          if (!inner) continue;

          let shift = "";
          if (idx > sourceIndex && idx <= targetIndex) shift = `translate${axis}(-${amount}px)`;
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translate${axis}(${amount}px)`;

          inner.style.transform = shift;
          inner.style.transition = idx === sourceIndex ? "none" : TRANSITION_STYLE;

          if (idx === targetIndex) { el.setAttribute("data-drop-target", "true"); targetEl = el; }
          else el.removeAttribute("data-drop-target");
        }
      };

      if (dtype === "row") {
        shiftElements(refs.bodyRef?.current ?? null, '.draggable[data-type="row"]', "Y", size.height);
      } else if (dtype === "column") {
        shiftElements(refs.headerRef?.current ?? null, '.draggable[data-type="column"]', "X", size.width);

        // Also shift body cells for column drag
        const body = refs.bodyRef?.current;
        if (body) {
          const cells = body.querySelectorAll('.td[data-col-index]');
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i] as HTMLElement;
            const idx = +cell.dataset.colIndex!;
            let shift = "";
            if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`;
            else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`;
            cell.style.transform = shift;
            cell.style.transition = TRANSITION_STYLE;
          }
        }
      }

      positionPlaceholder(targetEl, sourceIndex, targetIndex, dtype);
    },
    [refs.bodyRef, refs.headerRef, positionPlaceholder]
  );

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current;
    if (ph) ph.style.display = "none";

    for (const container of [refs.bodyRef?.current, refs.headerRef?.current]) {
      if (!container) continue;
      const draggables = container.querySelectorAll('.draggable');
      for (let i = 0; i < draggables.length; i++) {
        draggables[i].removeAttribute("data-drop-target");
        const inner = draggables[i].firstElementChild as HTMLElement | null;
        if (inner) { inner.style.transform = ""; inner.style.transition = ""; }
      }
    }
    const body = refs.bodyRef?.current;
    if (body) {
      const cells = body.querySelectorAll('.td[data-col-index]');
      for (let i = 0; i < cells.length; i++) {
        (cells[i] as HTMLElement).style.transform = "";
        (cells[i] as HTMLElement).style.transition = "";
      }
    }
  }, [refs.bodyRef, refs.headerRef, refs.placeholderRef]);

  // ── Find draggable from event target ───────────────────

  const findDraggable = (target: EventTarget): { element: HTMLElement; foundHandle: boolean } | null => {
    let el = target as HTMLElement | null;
    let foundHandle = false;
    while (el) {
      if (el.dataset?.dragHandle === "true") foundHandle = true;
      if (el.dataset?.contextid) return null;
      if (el.dataset?.disabled === "true") return null;
      if (el.dataset?.id) return { element: el, foundHandle };
      el = el.parentNode as HTMLElement | null;
    }
    return null;
  };

  // ── Begin drag (shared by mouse + touch) ──────────────

  const beginDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, clientX: number, clientY: number) => {
      const result = findDraggable(e.target);
      if (!result) return;
      const { element: draggableEl, foundHandle } = result;
      if (!foundHandle && draggableEl.querySelector("[data-drag-handle]")) return;

      const id = draggableEl.dataset.id;
      const sourceIndex = +draggableEl.dataset.index!;
      const dtype = draggableEl.dataset.type;
      const isTouch = e.type === "touchstart";

      dragTypeRef.current = dtype;
      sourceIndexRef.current = sourceIndex;
      targetIndexRef.current = null;

      // For touch, Draggable's onPointerDown skips touch — dispatch synthetic event
      if (isTouch) {
        draggableEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
      }

      const scrollOffset = dtype === "row" ? (refs.bodyRef?.current?.scrollLeft ?? 0) : 0;
      const itemRect = draggableEl.getBoundingClientRect();
      draggedSizeRef.current = { width: itemRect.width, height: itemRect.height };

      const initial = { x: clientX - itemRect.left - scrollOffset, y: clientY - itemRect.top };
      initialRef.current = initial;
      lastClientRef.current = { x: clientX, y: clientY };
      pointerRef.current = { x: clientX, y: clientY };

      const translate = { x: itemRect.left + scrollOffset, y: itemRect.top };

      cachedItemsRef.current = dtype === "row" ? computeRowItems() : computeColumnItems();
      const body = refs.bodyRef?.current;
      if (body) {
        const bodyRect = body.getBoundingClientRect();
        cachedContainerRef.current = bodyRect;
        setContainerRect(bodyRect); // share with auto-scroll — calculated once, never changes
      }

      const cloneEl = refs.cloneRef?.current;
      if (cloneEl) cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`;

      dispatch({
        type: "dragStart",
        value: {
          rect: { draggedItemHeight: itemRect.height, draggedItemWidth: itemRect.width },
          dragged: { initial, translate, draggedID: id, isDragging: true, sourceIndex },
          dragType: dtype,
        },
      });

      // Sync clone scroll (immediate + after React render)
      const syncScroll = () => {
        const c = refs.cloneRef?.current;
        const b = refs.bodyRef?.current;
        if (!c || !b) return;
        if (dtype === "row") c.scrollLeft = b.scrollLeft;
        else { const cb = c.querySelector('.clone-body') as HTMLElement | null; if (cb) cb.scrollTop = b.scrollTop; }
      };
      syncScroll();
      requestAnimationFrame(() => { syncScroll(); requestAnimationFrame(syncScroll); });
    },
    [dispatch, refs, computeRowItems, computeColumnItems, pointerRef, setContainerRect]
  );

  // ── Drag end ──────────────────────────────────────────

  const dragEnd = useCallback(() => {
    cancelLongPress();
    setTimeout(() => { isTouchActiveRef.current = false; }, 400);

    const finalTarget = targetIndexRef.current;
    const finalSource = sourceIndexRef.current;
    const finalDragType = dragTypeRef.current;

    // Preserve scroll position — clearShiftTransforms causes reflow that can shift it
    const body = refs.bodyRef?.current;
    const savedScrollTop = body?.scrollTop ?? 0;
    const savedScrollLeft = body?.scrollLeft ?? 0;

    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) { cloneEl.style.transform = "translate(0px, 0px)"; cloneEl.scrollLeft = 0; }

    clearShiftTransforms();

    if (onDragEnd && finalSource !== null && finalTarget !== null && (finalDragType === "row" || finalDragType === "column")) {
      onDragEnd({ sourceIndex: finalSource, targetIndex: finalTarget, dragType: finalDragType });
    }

    dispatch({ type: "dragEnd", value: { targetIndex: finalTarget, sourceIndex: finalSource } });
    stopAutoScroll();

    // Restore scroll position — clearShiftTransforms + React re-render (from
    // onDragEnd/dispatch) cause reflows that shift scrollTop by ~1 row height.
    // Restore synchronously AND after React's next paint.
    if (body) {
      body.scrollTop = savedScrollTop;
      body.scrollLeft = savedScrollLeft;
      requestAnimationFrame(() => {
        body.scrollTop = savedScrollTop;
        body.scrollLeft = savedScrollLeft;
      });
    }

    dragTypeRef.current = null;
    sourceIndexRef.current = null;
    targetIndexRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, stopAutoScroll, refs.bodyRef, refs.cloneRef, clearShiftTransforms, onDragEnd]);

  // ── Stable ref for dragMove (avoids circular dep with useLongPress) ──
  const dragMoveRef = useRef<(x: number, y: number) => void>(() => {});

  // ── Long press (mobile) ───────────────────────────────

  const { touchStart, cancelLongPress, isTouchActiveRef } = useLongPress(
    refs, beginDrag, dragEnd,
    (x: number, y: number) => dragMoveRef.current(x, y),
  );

  // ── Mouse: start drag immediately ─────────────────────

  const dragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) return;
      if (isTouchActiveRef.current) return;
      beginDrag(e, e.clientX, e.clientY);
    },
    [beginDrag, isTouchActiveRef]
  );


  // ── Core drag move (shared by mouse + touch) ─────────

  const dragMove = useCallback(
    (clientX: number, clientY: number) => {
      const initial = initialRef.current;

      lastClientRef.current = { x: clientX, y: clientY };
      pointerRef.current = { x: clientX, y: clientY };

      // Move clone
      const cloneEl = refs.cloneRef?.current;
      if (cloneEl) {
        cloneEl.style.transform = `translate(${clientX - initial.x}px, ${clientY - initial.y}px)`;
        const body = refs.bodyRef?.current;
        if (body) {
          if (dragTypeRef.current === "row") cloneEl.scrollLeft = body.scrollLeft;
          else { const cb = cloneEl.querySelector('.clone-body') as HTMLElement | null; if (cb) cb.scrollTop = body.scrollTop; }
        }
      }

      // Drop target + auto-scroll
      const container = refs.bodyRef?.current;
      if (!container) return;

      let rect = cachedContainerRef.current;
      if (!rect) { rect = container.getBoundingClientRect(); cachedContainerRef.current = rect; }

      let dropIndex = 0;
      const dtype = dragTypeRef.current || dragType;

      // Auto-scroll edge zone check
      if (dtype === "row") {
        if (clientY < rect.top + 30) { startAutoScroll(-5, container, "vertical"); cachedItemsRef.current = null; }
        else if (clientY > rect.bottom - 30) { startAutoScroll(5, container, "vertical"); cachedItemsRef.current = null; }
        else stopAutoScroll();
      } else {
        if (clientX < rect.left + 30) { startAutoScroll(-5, container, "horizontal"); cachedItemsRef.current = null; }
        else if (clientX > rect.right - 30) { startAutoScroll(5, container, "horizontal"); cachedItemsRef.current = null; }
        else stopAutoScroll();
      }

      // Drop index — always recompute items fresh (positions change during scroll)
      let items: RowItem[] | ColumnItem[] | null;
      if (dtype === "row") {
        items = computeRowItems();
        cachedItemsRef.current = items;
        if (items && items.length > 0) dropIndex = binarySearchDropIndex(clientY - rect.top + container.scrollTop, items);
      } else {
        items = computeColumnItems();
        cachedItemsRef.current = items;
        if (items && items.length > 0) dropIndex = binarySearchDropIndexHeader(clientX, items);
      }

      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex;
        requestAnimationFrame(() => applyShiftTransforms(sourceIndexRef.current, dropIndex, dtype));
      }
    },
    [dragType, refs.bodyRef, refs.cloneRef, computeRowItems, computeColumnItems, startAutoScroll, stopAutoScroll, applyShiftTransforms, pointerRef]
  );

  // Keep ref in sync for useLongPress
  dragMoveRef.current = dragMove;

  // ── Drag cancel (Escape) ──────────────────────────────

  const dragCancel = useCallback(() => {
    cancelLongPress();
    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) { cloneEl.style.transform = "translate(0px, 0px)"; cloneEl.scrollLeft = 0; }

    clearShiftTransforms();
    dispatch({ type: "dragEnd", value: { targetIndex: null, sourceIndex: null } });
    stopAutoScroll();

    dragTypeRef.current = null;
    sourceIndexRef.current = null;
    targetIndexRef.current = null;
  }, [dispatch, stopAutoScroll, refs.cloneRef, clearShiftTransforms, cancelLongPress]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") dragCancel();
  }, [dragCancel]);

  // ── touch-action:none on body (permanent) ───────────────────
  // Chrome Android locks in touch-action at pointerdown time. Must be
  // set BEFORE any touch — dynamic setting is ignored. JS scrolling
  // in useLongPress replaces native scroll.
  useEffect(() => {
    const body = refs.bodyRef?.current;
    if (body) body.style.touchAction = "none";
    return () => { if (body) body.style.touchAction = ""; };
  }, [refs.bodyRef]);

  // ── Pointer event listeners while dragging ────────────

  useEffect(() => {
    if (!dragged.isDragging) return;

    // All pointer types (mouse, pen, touch) — same path for all.
    // With touch-action:none set permanently, pointer events fire reliably for touch.
    // useLongPress touchmove/touchend may also fire — double calls are safe.
    const onPointerMove = (e: PointerEvent) => {
      dragMove(e.clientX, e.clientY);
    };
    const onPointerEnd = () => {
      dragEnd();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dragged.isDragging, dragMove, dragEnd, handleKeyDown]);

  return { dragStart, touchStart };
};

export default useDragContextEvents;
