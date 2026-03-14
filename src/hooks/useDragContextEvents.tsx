/* eslint-disable no-unused-vars */
// @ts-nocheck
import { useCallback, useEffect, useRef } from "react";
import useAutoScroll from "./useAutoScroll";
import {
  binarySearchDropIndex,
  binarySearchDropIndexHeader,
} from "../Components/utils";

const TRANSITION_STYLE = "all 450ms cubic-bezier(0.2, 0, 0, 1)";

const useDragContextEvents = (refs, dragged, dispatch, dragType, options, onDragEnd) => {
  const {
    startAutoScroll,
    stopAutoScroll,
    isAutoScrollingHorizontal,
    isAutoScrollingVertical,
  } = useAutoScroll(refs);

  // Cached rects computed once at drag start
  const cachedItemsRef = useRef(null);
  const cachedContainerRef = useRef(null);
  const dragTypeRef = useRef(null);
  const initialRef = useRef({ x: 0, y: 0 });
  const sourceIndexRef = useRef(null);
  const targetIndexRef = useRef(null);
  const draggedSizeRef = useRef({ width: 0, height: 0 });

  // Use querySelectorAll — works with virtualized containers where
  // rows aren't direct children of the scroll container
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

    // Filter by drag range (same approach as rows — filter, don't slice)
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

  // Position the placeholder element at the gap left by shifted items.
  // The outer .draggable div has no transform (only its inner child shifts),
  // so getBoundingClientRect() gives the ORIGINAL position — which IS the gap.
  const positionPlaceholder = useCallback((targetEl, sourceIndex, targetIndex, currentDragType) => {
    const ph = refs.placeholderRef?.current;
    if (!ph || !targetEl) {
      if (ph) ph.style.display = "none";
      return;
    }

    const size = draggedSizeRef.current;
    const rect = targetEl.getBoundingClientRect();

    ph.style.display = "block";

    // When moving right/down, items shift left/up by size.width/height.
    // The gap opens at the END of the target's original bounds, offset
    // back by the dragged item's size. When moving left/up, gap is at
    // the target's original position.
    const movingForward = sourceIndex < targetIndex;

    if (currentDragType === "row") {
      const gapTop = movingForward
        ? rect.top + rect.height - size.height
        : rect.top;
      ph.style.top = `${gapTop}px`;
      ph.style.left = `${rect.left}px`;
      ph.style.width = `${rect.width}px`;
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

  // Apply shift transforms directly on DOM elements — bypasses React entirely
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
        // Always keep transition on non-source items so they animate
        // both into AND out of their shifted position
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

    // Position the custom placeholder at the gap.
    // Always show it — even when source === target the source item is
    // opacity:0 so there's a visible gap that the placeholder fills.
    positionPlaceholder(targetEl, sourceIndex, targetIndex, currentDragType);
  }, [refs.bodyRef, refs.headerRef, refs.placeholderRef, positionPlaceholder]);

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

  const dragStart = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) {
        // Walk up from click target to find the draggable element.
        // Track whether we passed through a drag handle along the way.
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

        // If this draggable contains a DragHandle, only allow drag from the handle
        if (!foundHandle && draggableElement.querySelector("[data-drag-handle]")) return;

        const id = draggableElement.dataset.id;
        const sourceIndex = +draggableElement.dataset.index;
        const dragtype = draggableElement.dataset.type;
        dragTypeRef.current = dragtype;
        sourceIndexRef.current = sourceIndex;
        targetIndexRef.current = null;

        const scrollOffset =
          dragtype === "row" ? refs.bodyRef.current.scrollLeft : 0;

        const itemRect = draggableElement.getBoundingClientRect();
        draggedSizeRef.current = { width: itemRect.width, height: itemRect.height };

        let initial = { x: 0, y: 0 };
        if (e.type === "touchstart") {
          initial.x = e.touches[0].clientX;
          initial.y = e.touches[0].clientY;
        } else {
          initial.x = e.clientX - itemRect.left - scrollOffset;
          initial.y = e.clientY - itemRect.top;
        }
        initialRef.current = initial;

        const translate = {
          x: itemRect.left + scrollOffset,
          y: itemRect.top,
        };

        // Pre-compute item rects for binary search during drag
        if (dragtype === "row") {
          cachedItemsRef.current = computeRowItems();
        } else {
          cachedItemsRef.current = computeColumnItems();
        }

        // Cache container rect
        const refContainer = refs.bodyRef.current;
        if (refContainer) {
          cachedContainerRef.current = refContainer.getBoundingClientRect();
        }

        // Set initial clone position directly via DOM
        const cloneEl = refs.cloneRef?.current;
        if (cloneEl) {
          cloneEl.style.transform = `translate(${translate.x}px, ${translate.y}px)`;
        }

        // Single batched dispatch — one state transition, one render
        requestAnimationFrame(() => {
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

          // After React renders the clone content, sync scroll position
          requestAnimationFrame(() => {
            const cloneEl = refs.cloneRef?.current;
            const body = refs.bodyRef.current;
            if (cloneEl && body) {
              if (dragtype === "row") {
                cloneEl.scrollLeft = body.scrollLeft;
              } else if (dragtype === "column") {
                const cloneBody = cloneEl.querySelector('.clone-body');
                if (cloneBody) {
                  cloneBody.scrollTop = body.scrollTop;
                }
              }
            }
          });
        });
      }
    },
    [dispatch, refs, computeRowItems, computeColumnItems]
  );

  const dragEnd = useCallback(() => {
    const finalTarget = targetIndexRef.current;
    const finalSource = sourceIndexRef.current;
    const finalDragType = dragTypeRef.current;

    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    // Reset clone position and scroll
    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) {
      cloneEl.style.transform = `translate(0px, 0px)`;
      cloneEl.scrollLeft = 0;
    }

    // Clear all DOM shift transforms
    clearShiftTransforms();

    // Call consumer callback before resetting state
    if (onDragEnd && finalSource !== null && finalTarget !== null && finalDragType) {
      onDragEnd({
        sourceIndex: finalSource,
        targetIndex: finalTarget,
        dragType: finalDragType,
      });
    }

    // Dispatch synchronously — no rAF. This ensures React re-renders in
    // the same frame as the DOM cleanup above, so the browser never paints
    // the intermediate state (no ghost).
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
  }, [dispatch, stopAutoScroll, refs.cloneRef, clearShiftTransforms, onDragEnd]);

  // Re-apply shifts when scroll container scrolls during drag
  // Handles virtual recycling: new DOM elements entering the viewport need shifts
  const handleScrollDuringDrag = useCallback(() => {
    // Invalidate cached rects since scroll changed positions
    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const src = sourceIndexRef.current;
    const tgt = targetIndexRef.current;
    const dtype = dragTypeRef.current;
    if (src !== null && tgt !== null) {
      applyShiftTransforms(src, tgt, dtype);
    }
  }, [applyShiftTransforms]);

  const drag = useCallback(
    (e) => {
      e.stopPropagation();

      const initial = initialRef.current;
      let tx, ty;
      if (e.type === "touchmove") {
        tx = e.touches[0].clientX - initial.x;
        ty = e.touches[0].clientY - initial.y;
      } else {
        tx = e.clientX - initial.x;
        ty = e.clientY - initial.y;
      }

      // Move clone directly via DOM — zero React overhead
      const cloneEl = refs.cloneRef?.current;
      if (cloneEl) {
        cloneEl.style.transform = `translate(${tx}px, ${ty}px)`;

        // Sync clone scroll with table body so the visible portion matches
        const body = refs.bodyRef.current;
        if (body) {
          if (dragTypeRef.current === "row") {
            cloneEl.scrollLeft = body.scrollLeft;
          } else if (dragTypeRef.current === "column") {
            // Sync the portal body's scrollTop (not the portalroot — that
            // would scroll the header away). Target the .clone-body wrapper.
            const cloneBody = cloneEl.querySelector('.clone-body');
            if (cloneBody) {
              cloneBody.scrollTop = body.scrollTop;
            }
          }
        }
      }

      isAutoScrollingVertical.current = false;
      isAutoScrollingHorizontal.current = false;

      const refContainer = refs.bodyRef.current;
      if (!refContainer) return;
      const { clientY, clientX } = e;

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

      // Apply DOM shifts when targetIndex changes — zero React dispatches
      if (dropIndex !== targetIndexRef.current) {
        targetIndexRef.current = dropIndex;
        requestAnimationFrame(() => {
          applyShiftTransforms(sourceIndexRef.current, dropIndex, currentDragType);
        });
      }
    },
    [
      dragType,
      isAutoScrollingHorizontal,
      isAutoScrollingVertical,
      refs.bodyRef,
      refs.cloneRef,
      computeRowItems,
      computeColumnItems,
      startAutoScroll,
      stopAutoScroll,
      applyShiftTransforms,
    ]
  );

  // Cancel drag on Escape key
  const dragCancel = useCallback(() => {
    cachedItemsRef.current = null;
    cachedContainerRef.current = null;

    const cloneEl = refs.cloneRef?.current;
    if (cloneEl) {
      cloneEl.style.transform = `translate(0px, 0px)`;
      cloneEl.scrollLeft = 0;
    }

    clearShiftTransforms();

    dispatch({
      type: "dragEnd",
      value: { targetIndex: null, sourceIndex: null },
    });
    stopAutoScroll();

    dragTypeRef.current = null;
    sourceIndexRef.current = null;
    targetIndexRef.current = null;
  }, [dispatch, stopAutoScroll, refs.cloneRef, clearShiftTransforms]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") dragCancel();
  }, [dragCancel]);

  useEffect(() => {
    if (dragged.isDragging) {
      const body = refs.bodyRef.current;

      window.addEventListener("mousemove", drag, { passive: true });
      window.addEventListener("touchmove", drag, false);
      window.addEventListener("touchend", dragEnd, false);
      window.addEventListener("mouseup", dragEnd, false);
      window.addEventListener("keydown", handleKeyDown);

      // Re-apply shifts on scroll (handles virtual recycling)
      body?.addEventListener("scroll", handleScrollDuringDrag, { passive: true });

      return () => {
        window.removeEventListener("mousemove", drag);
        window.removeEventListener("touchmove", drag, false);
        window.removeEventListener("touchend", dragEnd, false);
        window.removeEventListener("mouseup", dragEnd, false);
        window.removeEventListener("keydown", handleKeyDown);
        body?.removeEventListener("scroll", handleScrollDuringDrag);
      };
    }
  }, [dragged.isDragging, drag, dragEnd, dragCancel, handleKeyDown, handleScrollDuringDrag, refs.bodyRef]);

  return { dragStart };
};

export default useDragContextEvents;
