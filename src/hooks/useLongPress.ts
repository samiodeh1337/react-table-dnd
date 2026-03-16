import { useCallback, useRef } from "react";
import type { HookRefs } from "./types";

const LONG_PRESS_DELAY = 300;
const LONG_PRESS_MOVE_THRESHOLD = 8;

/**
 * Mobile long-press-to-drag.
 *
 * touch-action:none is set permanently on the body element (by
 * useDragContextEvents on mount) so Chrome Android respects it at
 * pointerdown time. Since native scrolling is disabled on the body,
 * this hook implements JS-based scrolling when the long press is cancelled.
 *
 * preventDefault() is still called on touchmove to stop any residual
 * browser behavior during the 300ms detection window.
 */
export default function useLongPress(
  refs: HookRefs,
  beginDrag: (e: React.TouchEvent<HTMLDivElement>, clientX: number, clientY: number) => void,
  dragEnd: () => void,
  onDragMove: (clientX: number, clientY: number) => void,
) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const pendingTouchEventRef = useRef<React.TouchEvent<HTMLDivElement> | null>(null);
  const isTouchActiveRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingTouchEventRef.current = null;
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const touchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) return;

      // Only start long-press if touch is on a draggable element
      let el = e.target as HTMLElement | null;
      let isDraggable = false;
      while (el) {
        if (el.dataset?.contextid) break;
        if (el.dataset?.disabled === "true") break;
        if (el.dataset?.id) { isDraggable = true; break; }
        el = el.parentNode as HTMLElement | null;
      }
      if (!isDraggable) return;

      cancelLongPress();
      isTouchActiveRef.current = true;

      // Prevent text selection during long-press
      window.getSelection()?.removeAllRanges();

      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      pendingTouchEventRef.current = e;

      const tableEl = refs.tableRef?.current;
      if (!tableEl) return;

      let dragPhase = false;
      let scrollPhase = false;
      let lastScrollY = touch.clientY;
      let lastScrollX = touch.clientX;

      // Block text selection during long-press detection + drag
      const onSelectStart = (ev: Event) => ev.preventDefault();
      document.addEventListener("selectstart", onSelectStart);

      const onMove = (ev: TouchEvent) => {
        ev.preventDefault();
        const t = ev.touches[0];

        if (scrollPhase) {
          // JS scrolling — replaces native scroll since touch-action:none
          // is set permanently on the body element
          const body = refs.bodyRef?.current;
          if (body) {
            body.scrollTop -= (t.clientY - lastScrollY);
            body.scrollLeft -= (t.clientX - lastScrollX);
          }
          lastScrollY = t.clientY;
          lastScrollX = t.clientX;
        } else if (!dragPhase) {
          const dx = t.clientX - touchStartPosRef.current.x;
          const dy = t.clientY - touchStartPosRef.current.y;
          if (Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD) {
            // User wants to scroll — cancel long press, switch to JS scroll
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
            pendingTouchEventRef.current = null;
            scrollPhase = true;
            lastScrollY = t.clientY;
            lastScrollX = t.clientX;
          }
        } else {
          onDragMove(t.clientX, t.clientY);
        }
      };

      const onEnd = () => {
        if (dragPhase) {
          cleanup();
          dragEnd();
        } else {
          cancelLongPress();
          setTimeout(() => { isTouchActiveRef.current = false; }, 400);
        }
      };

      const cleanup = () => {
        tableEl.removeEventListener("touchmove", onMove);
        tableEl.removeEventListener("touchend", onEnd);
        tableEl.removeEventListener("touchcancel", onEnd);
        document.removeEventListener("selectstart", onSelectStart);
        cleanupRef.current = null;
      };

      tableEl.addEventListener("touchmove", onMove, { passive: false });
      tableEl.addEventListener("touchend", onEnd, false);
      tableEl.addEventListener("touchcancel", onEnd, false);
      cleanupRef.current = cleanup;

      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        dragPhase = true;

        const saved = pendingTouchEventRef.current;
        pendingTouchEventRef.current = null;
        if (saved) {
          beginDrag(saved, touch.clientX, touch.clientY);
        }
      }, LONG_PRESS_DELAY);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beginDrag, dragEnd, onDragMove, cancelLongPress, refs.tableRef?.current, refs.bodyRef?.current]
  );

  return { touchStart, cancelLongPress, isTouchActiveRef };
}
