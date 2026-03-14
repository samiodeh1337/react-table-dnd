/* eslint-disable no-unused-vars */
// @ts-nocheck
import { useCallback, useEffect, useRef } from "react";
import useAutoScroll from "./useAutoScroll";
import {
  binarySearchDropIndex,
  binarySearchDropIndexHeader,
} from "../Components/utils";

const TRANSITION_STYLE = "all 450ms cubic-bezier(0.2, 0, 0, 1)";
const LONG_PRESS_DELAY = 300;
const LONG_PRESS_MOVE_THRESHOLD = 8;

const useDragContextEvents = (refs, dragged, dispatch, dragType, options, onDragEnd) => {
  const {
    startAutoScroll,
    stopAutoScroll,
    pointerRef,
  } = useAutoScroll(refs);

  const cachedItemsRef = useRef(null);
  const cachedContainerRef = useRef(null);
  const dragTypeRef = useRef(null);
  const initialRef = useRef({ x: 0, y: 0 });
  const sourceIndexRef = useRef(null);
  const targetIndexRef = useRef(null);
  const draggedSizeRef = useRef({ width: 0, height: 0 });
  const lastClientRef = useRef({ x: 0, y: 0 });

  // Long-press state for touch
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const pendingTouchEventRef = useRef(null);
  const isTouchActiveRef = useRef(false);
  const touchMoveBeforeDragRef = useRef<any>(null);
  const touchEndBeforeDragRef = useRef<any>(null);

  // Pointer capture for guaranteed pointermove delivery
  const capturedPointerIdRef = useRef<number | null>(null);

  const computeRowItems = useCallback(() => {
    const body = refs.bodyRef.current;
    if (!body) return null;
    const containerScrollTop = body.scrollTop;
    const containerTopOffset = body.getBoundingClientRect().top;

    const elements = body.querySelectorAll('.draggable[data-type="row"]');
    let items = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.dataset.index === undefined) continue;
      const rect = el.getBoundingClientRect();
      const itemTop = rect.top - containerTopOffset + containerScrollTop;
      items.push({
        height: rect.height,
        itemTop,
        itemBottom: itemTop + rect.height,
        index: el.dataset.index,
      });
    }

    const start = options.rowDragRange.start;
    const end = options.rowDragRange.end;
    if (start || end) {
      items = items.filter((item) => {
        return (!start || item.index >= start) && (!end || item.index < end);
      });
    }

    return items;
  }, [refs.bodyRef, options.rowDragRange]);

  const computeColumnItems = useCallback(() => {
    const header = refs.headerRef.current;
    if (!header || !header.children[0]) return null;

    let items = Array.from(header.children[0].children)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left,
          width: rect.width,
          itemLeft: rect.left,
          itemRight: rect.left + rect.width,
          index: el.dataset.index,
        };
      })
      .filter((item) => item.index !== undefined);

    const start = options.columnDragRange?.start;
    const end = options.columnDragRange?.end;
    if (start !== undefined || end !== undefined) {
      items = items.filter((item) => {
        const idx = +item.index;
        return (start === undefined || idx >= start) && (end === undefined || idx < end);
      });
    }

    return items;
  }, [refs.headerRef, options.columnDragRange]);

  const positionPlaceholder = useCallback((targetEl, sourceIndex, targetIndex, currentDragType) => {
    const ph = refs.placeholderRef?.current;
    if (!ph || !targetEl) {
      if (ph) ph.style.display = "none";
      return;
    }

    const size = draggedSizeRef.current;
    const rect = targetEl.getBoundingClientRect();

    ph.style.display = "block";

    const movingForward = sourceIndex < targetIndex;

    if (currentDragType === "row") {
      const tableEl = refs.tableRef?.current;
      const tableRect = tableEl?.getBoundingClientRect();
      const gapTop = movingForward
        ? rect.top + rect.height - size.height
        : rect.top;
      ph.style.top = `${gapTop}px`;
      ph.style.left = `${tableRect?.left ?? rect.left}px`;
      ph.style.width = `${tableRect?.width ?? rect.width}px`;
      ph.style.height = `${size.height}px`;
    } else {
      const tableEl = refs.tableRef?.current;
      const tableRect = tableEl?.getBoundingClientRect();
      const gapLeft = movingForward
        ? rect.left + rect.width - size.width
        : rect.left;
      ph.style.top = `${tableRect?.top ?? rect.top}px`;
      ph.style.left = `${gapLeft}px`;
      ph.style.width = `${size.width}px`;
      ph.style.height = `${tableRect?.height ?? rect.height}px`;
    }
  }, [refs.placeholderRef, refs.tableRef]);

  const applyShiftTransforms = useCallback((sourceIndex, targetIndex, currentDragType) => {
    if (sourceIndex === null || targetIndex === null) return;

    const size = draggedSizeRef.current;
    let targetEl = null;

    if (currentDragType === "row") {
      const body = refs.bodyRef.current;
      if (!body) return;
      const draggables = body.querySelectorAll('.draggable[data-type="row"]');
      for (let i = 0; i < draggables.length; i++) {
        const el = draggables[i];
        const idx = +el.dataset.index;
        const inner = el.firstElementChild;
        if (!inner) continue;

        let shift = "";
        if (idx > sourceIndex && idx <= targetIndex) {
          shift = `translateY(-${size.height}px)`;
        } else if (idx < sourceIndex && idx >= targetIndex) {
          shift = `translateY(${size.height}px)`;
        }
        inner.style.transform = shift;
        inner.style.transition = idx === sourceIndex ? "none" : TRANSITION_STYLE;

        if (idx === targetIndex) {
          el.setAttribute("data-drop-target", "true");
          targetEl = el;
        } else {
          el.removeAttribute("data-drop-target");
        }
      }
    } else if (currentDragType === "column") {
      const header = refs.headerRef.current;
      if (header) {
        const draggables = header.querySelectorAll('.draggable[data-type="column"]');
        for (let i = 0; i < draggables.length; i++) {
          const el = draggables[i];
          const idx = +el.dataset.index;
          const inner = el.firstElementChild;
          if (!inner) continue;

          let shift = "";
          if (idx > sourceIndex && idx <= targetIndex) {
            shift = `translateX(-${size.width}px)`;
          } else if (idx < sourceIndex && idx >= targetIndex) {
            shift = `translateX(${size.width}px)`;
          }
          inner.style.transform = shift;
          inner.style.transition = idx === sourceIndex ? "none" : TRANSITION_STYLE;

          if (idx === targetIndex) {
            el.setAttribute("data-drop-target", "true");
            targetEl = el;
          } else {
            el.removeAttribute("data-drop-target");
          }
        }
      }

      const body = refs.bodyRef.current;
      if (body) {
        const cells = body.querySelectorAll('.td[data-col-index]');
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const idx = +cell.dataset.colIndex;

          let shift = "";
          if (idx > sourceIndex && idx <= targetIndex) {
            shift = `translateX(-${size.width}px)`;
          } else if (idx < sourceIndex && idx >= targetIndex) {
            shift = `translateX(${size.width}px)`;
          }
          cell.style.transform = shift;
          cell.style.transition = TRANSITION_STYLE;
        }
      }
    }

    positionPlaceholder(targetEl, sourceIndex, targetIndex, currentDragType);
  }, [refs.bodyRef, refs.headerRef, positionPlaceholder]);

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current;
    if (ph) ph.style.display = "none";

    const body = refs.bodyRef.current;
    if (body) {
      const draggables = body.querySelectorAll('.draggable');
      for (let i = 0; i < draggables.length; i++) {
        draggables[i].removeAttribute("data-drop-target");
        const inner = draggables[i].firstElementChild;
        if (inner) {
          inner.style.transform = "";
          inner.style.transition = "";
        }
      }
      const cells = body.querySelectorAll('.td[data-col-index]');
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.transform = "";
        cells[i].style.transition = "";
      }
    }
    const header = refs.headerRef.current;
    if (header) {
      const draggables = header.querySelectorAll('.draggable');
      for (let i = 0; i < draggables.length; i++) {
        draggables[i].removeAttribute("data-drop-target");
        const inner = draggables[i].firstElementChild;
        if (inner) {
          inner.style.transform = "";
          inner.style.transition = "";
        }
      }
    }
  }, [refs.bodyRef, refs.headerRef]);

  // ── Core drag initiation ──────────────────────────────
  const beginDrag = useCallback(
    (e, clientX, clientY) => {
      let foundHandle = false;
      const getDraggableElement = (element) => {
        while (element) {
          if (element.dataset?.dragHandle === "true") foundHandle = true;
          if (element.dataset?.contextid) return null;
          if (element.dataset?.disabled === "true") return null;
          if (element.dataset?.id) return element;
          element = element.parentNode;
        }
        return null;
      };

      const draggableElement = getDraggableElement(e.target);
      if (!draggableElement) return;
      if (!foundHandle && draggableElement.querySelector("[data-drag-handle]")) return;

      const id = draggableElement.dataset.id;
      const sourceIndex = +draggableElement.dataset.index;
      const dragtype = draggableElement.dataset.type;
      const isTouch = e.type === "touchstart";
      dragTypeRef.current = dragtype;
      sourceIndexRef.current = sourceIndex;
      targetIndexRef.current = null;

      // For touch, Draggable's onPointerDown skips touch — dispatch synthetic event
      if (isTouch) {
        draggableElement.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" })
        );
      }

      const scrollOffset =
        dragtype === "row" ? refs.bodyRef.current.scrollLeft : 0;

      const itemRect = draggableElement.getBoundingClientRect();
      draggedSizeRef.current = { width: itemRect.width, height: itemRect.height };

      const initial = {
        x: clientX - itemRect.left - scrollOffset,
        y: clientY - itemRect.top,
      };
      initialRef.current = initial;
      lastClientRef.current = { x: clientX, y: clientY };
      pointerRef.current = { x: clientX, y: clientY };

      const translate = {
        x: itemRect.left + scrollOffset,
        y: itemRect.top,
      };

      if (dragtype === "row") {
        cachedItemsRef.current = computeRowItems();
      } else {
        cachedItemsRef.current = computeColumnItems();
      }

      const refContainer = refs.bodyRef.current;
      if (refContainer) {
        cachedContainerRef.current = refContainer.getBoundingClientRect();
      }

      const cloneEl = refs.cloneRef?.current;
      if (cloneEl) {
        cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`;
      }

      const tableEl = refs.tableRef?.current;
      if (tableEl) {
        tableEl.style.touchAction = "none";
      }

      dispatch({
        type: "dragStart",
        value: {
          rect: {
            draggedItemHeight: itemRect.height,
            draggedItemWidth: itemRect.width,
          },
          dragged: {
            initial: initial,
            translate: translate,
            draggedID: id,
            isDragging: true,
            sourceIndex: sourceIndex,
          },
          dragType: dragtype,
        },
      });

      const syncCloneScroll = () => {
        const cloneEl = refs.cloneRef?.current;
        const body = refs.bodyRef.current;
        if (cloneEl && body) {
          if (dragtype === "row") {
            cloneEl.scrollLeft = body.scrollLeft;
          } else if (dragtype === "column") {
            const cloneBody = cloneEl.querySelector('.clone-body');
            if (cloneBody) cloneBody.scrollTop = body.scrollTop;
          }
        }
      };
      syncCloneScroll();
      requestAnimationFrame(() => {
        syncCloneScroll();
        requestAnimationFrame(syncCloneScroll);
      });
    },
    [refs.bodyRef, refs.cloneRef, refs.tableRef, pointerRef, dispatch, computeRowItems, computeColumnItems]
  );

  // ── Mouse: start drag immediately ─────────────────────
  const dragStart = useCallback(
    (e) => {
      if (e.target === e.currentTarget) return;
      if (isTouchActiveRef.current) return;
      beginDrag(e, e.clientX, e.clientY);
    },
    [beginDrag]
  );

  // ── Long-press for touch ──────────────────────────────
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingTouchEventRef.current = null;
    window.removeEventListener("touchmove", touchMoveBeforeDragRef.current);
    window.removeEventListener("touchend", touchEndBeforeDragRef.current);
  }, []);

  const touchStart = useCallback(
    (e) => {
      if (e.target === e.currentTarget) return;
      cancelLongPress();
      isTouchActiveRef.current = true;

      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      pendingTouchEventRef.current = e;

      const onMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        const dx = t.clientX - touchStartPosRef.current.x;
        const dy = t.clientY - touchStartPosRef.current.y;
        if (Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD) {
          cancelLongPress();
          setTimeout(() => { isTouchActiveRef.current = false; }, 400);
        }
      };
      const onEnd = () => {
        cancelLongPress();
        setTimeout(() => { isTouchActiveRef.current = false; }, 400);
      };
      touchMoveBeforeDragRef.current = onMove;
      touchEndBeforeDragRef.current = onEnd;
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd, false);

      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        const saved = pendingTouchEventRef.current;
        pendingTouchEventRef.current = null;
        if (saved) {
          beginDrag(saved, touch.clientX, touch.clientY);
        }
      }, LONG_PRESS_DELAY);
    },
    [beginDrag, cancelLongPress]
  );

  // ── Capture pointer ID on pointerdown ─────────────────
  const onPointerDown = useCallback((e: any) => {
    capturedPointerIdRef.current = e.pointerId ?? null;
  }, []);

  // ── Drag end ──────────────────────────────────────────
  const dragEnd = useCallback(() => {
    cancelLongPress();
    setTimeout(() => { isTouchActiveRef.current = false; }, 400);

    const finalTarget = targetIndexRef.current;
    const finalSource = sourceIndexRef.current;
    const finalDragType = dragTypeRef.current;

    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) {
      cloneEl.style.transform = `translate(0px, 0px)`;
      cloneEl.scrollLeft = 0;
    }

    const tableEl = refs.tableRef?.current;
    if (tableEl) {
      tableEl.style.touchAction = "";
    }

    clearShiftTransforms();

    if (onDragEnd && finalSource !== null && finalTarget !== null && finalDragType) {
      onDragEnd({
        sourceIndex: finalSource,
        targetIndex: finalTarget,
        dragType: finalDragType,
      });
    }

    dispatch({
      type: "dragEnd",
      value: {
        targetIndex: finalTarget,
        sourceIndex: finalSource,
      },
    });
    stopAutoScroll();

    dragTypeRef.current = null;
    sourceIndexRef.current = null;
    targetIndexRef.current = null;
  }, [dispatch, stopAutoScroll, refs.cloneRef, refs.tableRef, clearShiftTransforms, cancelLongPress, onDragEnd]);

  // ── Scroll handler during drag ────────────────────────
  const handleScrollDuringDrag = useCallback(() => {
    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const src = sourceIndexRef.current;
    const tgt = targetIndexRef.current;
    const dtype = dragTypeRef.current;
    if (src !== null && tgt !== null) {
      applyShiftTransforms(src, tgt, dtype);
    }

    // Sync clone scroll
    const cloneEl = refs.cloneRef?.current;
    const body = refs.bodyRef?.current;
    if (cloneEl && body) {
      if (dtype === "row") {
        cloneEl.scrollLeft = body.scrollLeft;
      } else if (dtype === "column") {
        const cloneBody = cloneEl.querySelector('.clone-body');
        if (cloneBody) cloneBody.scrollTop = body.scrollTop;
      }
    }

    // Re-compute drop index using last pointer position
    const refContainer = refs.bodyRef?.current;
    if (refContainer && dtype) {
      const last = lastClientRef.current;
      let containerRect = cachedContainerRef.current;
      if (!containerRect) {
        containerRect = refContainer.getBoundingClientRect();
        cachedContainerRef.current = containerRect;
      }

      let dropIndex = 0;
      if (dtype === "row") {
        let items = cachedItemsRef.current;
        if (!items) {
          items = computeRowItems();
          cachedItemsRef.current = items;
        }
        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndex(
            last.y - containerRect.top + refContainer.scrollTop,
            items
          );
        }
      } else {
        let items = cachedItemsRef.current;
        if (!items) {
          items = computeColumnItems();
          cachedItemsRef.current = items;
        }
        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndexHeader(last.x, items);
        }
      }

      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex;
        applyShiftTransforms(src, dropIndex, dtype);
      }
    }
  }, [applyShiftTransforms, refs.cloneRef, refs.bodyRef, computeRowItems, computeColumnItems]);

  // ── Drag (pointermove handler) ────────────────────────
  const drag = useCallback(
    (e) => {
      const clientX = e.clientX ?? 0;
      const clientY = e.clientY ?? 0;

      const initial = initialRef.current;
      const tx = clientX - initial.x;
      const ty = clientY - initial.y;

      lastClientRef.current = { x: clientX, y: clientY };
      pointerRef.current = { x: clientX, y: clientY };

      const cloneEl = refs.cloneRef?.current;
      if (cloneEl) {
        cloneEl.style.transform = `translate(${tx}px, ${ty}px)`;

        const body = refs.bodyRef.current;
        if (body) {
          if (dragTypeRef.current === "row") {
            cloneEl.scrollLeft = body.scrollLeft;
          } else if (dragTypeRef.current === "column") {
            const cloneBody = cloneEl.querySelector('.clone-body');
            if (cloneBody) cloneBody.scrollTop = body.scrollTop;
          }
        }
      }

      const refContainer = refs.bodyRef.current;
      if (!refContainer) return;

      let containerRect = cachedContainerRef.current;
      if (!containerRect) {
        containerRect = refContainer.getBoundingClientRect();
        cachedContainerRef.current = containerRect;
      }
      const { top, bottom, left, right } = containerRect;

      let dropIndex = 0;
      const currentDragType = dragTypeRef.current || dragType;

      if (currentDragType === "row") {
        const containerScrollTop = refContainer.scrollTop;
        const containerTopOffset = containerRect.top;

        let items = cachedItemsRef.current;
        if (!items) {
          items = computeRowItems();
          cachedItemsRef.current = items;
        }

        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndex(
            clientY - containerTopOffset + containerScrollTop,
            items
          );
        }

        if (clientY < top + 30) {
          startAutoScroll(-5, refContainer, "vertical");
          cachedItemsRef.current = null;
        } else if (clientY > bottom - 30) {
          startAutoScroll(5, refContainer, "vertical");
          cachedItemsRef.current = null;
        } else {
          stopAutoScroll();
        }
      } else {
        let items = cachedItemsRef.current;
        if (!items) {
          items = computeColumnItems();
          cachedItemsRef.current = items;
        }

        if (items && items.length > 0) {
          dropIndex = binarySearchDropIndexHeader(clientX, items);
        }

        if (clientX < left + 30) {
          startAutoScroll(-5, refContainer, "horizontal");
          cachedItemsRef.current = null;
        } else if (clientX > right - 30) {
          startAutoScroll(5, refContainer, "horizontal");
          cachedItemsRef.current = null;
        } else {
          stopAutoScroll();
        }
      }

      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex;
        requestAnimationFrame(() => {
          applyShiftTransforms(sourceIndexRef.current, dropIndex, currentDragType);
        });
      }
    },
    [pointerRef, refs.cloneRef, refs.bodyRef, dragType, computeRowItems, startAutoScroll, stopAutoScroll, computeColumnItems, applyShiftTransforms]
  );

  // ── Drag cancel (Escape) ──────────────────────────────
  const dragCancel = useCallback(() => {
    cancelLongPress();
    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) {
      cloneEl.style.transform = `translate(0px, 0px)`;
      cloneEl.scrollLeft = 0;
    }

    const tableEl = refs.tableRef?.current;
    if (tableEl) tableEl.style.touchAction = "";

    clearShiftTransforms();

    dispatch({
      type: "dragEnd",
      value: { targetIndex: null, sourceIndex: null },
    });
    stopAutoScroll();

    dragTypeRef.current = null;
    sourceIndexRef.current = null;
    targetIndexRef.current = null;
  }, [dispatch, stopAutoScroll, refs.cloneRef, refs.tableRef, clearShiftTransforms, cancelLongPress]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") dragCancel();
  }, [dragCancel]);

  // ── Event listeners while dragging ────────────────────
  useEffect(() => {
    if (dragged.isDragging) {
      const body = refs.bodyRef.current;
      const tableEl = refs.tableRef?.current;

      // Pointer capture guarantees pointermove delivery on mobile
      if (tableEl && capturedPointerIdRef.current !== null) {
        try { tableEl.setPointerCapture(capturedPointerIdRef.current); } catch (_) {}
      }

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") e.preventDefault();
        drag(e);
      };
      const onPointerUp = () => dragEnd();
      const onPointerCancel = () => dragEnd();

      if (tableEl) {
        tableEl.addEventListener("pointermove", onPointerMove, { passive: false });
        tableEl.addEventListener("pointerup", onPointerUp);
        tableEl.addEventListener("pointercancel", onPointerCancel);
      }

      window.addEventListener("mouseup", dragEnd, false);
      window.addEventListener("keydown", handleKeyDown);
      body?.addEventListener("scroll", handleScrollDuringDrag, { passive: true });

      return () => {
        if (tableEl) {
          tableEl.removeEventListener("pointermove", onPointerMove);
          tableEl.removeEventListener("pointerup", onPointerUp);
          tableEl.removeEventListener("pointercancel", onPointerCancel);
          if (capturedPointerIdRef.current !== null) {
            try { tableEl.releasePointerCapture(capturedPointerIdRef.current); } catch (_) {}
            capturedPointerIdRef.current = null;
          }
          tableEl.style.touchAction = "";
        }
        window.removeEventListener("mouseup", dragEnd, false);
        window.removeEventListener("keydown", handleKeyDown);
        body?.removeEventListener("scroll", handleScrollDuringDrag);
      };
    }
  }, [dragged.isDragging, drag, dragEnd, dragCancel, handleKeyDown, handleScrollDuringDrag, refs.bodyRef, refs.tableRef]);

  return { dragStart, touchStart, onPointerDown };
};

export default useDragContextEvents;
