import { useCallback, useRef } from 'react'
import type { HookRefs } from './types'

const LONG_PRESS_DELAY = 300
const LONG_PRESS_MOVE_THRESHOLD = 8
const FRICTION = 0.92 // velocity multiplier per frame (1 = no friction, 0 = instant stop)
const MIN_VELOCITY = 0.5 // px/frame below which momentum stops

/**
 * Mobile long-press-to-drag.
 * this hook implements JS-based scrolling with momentum/inertia when
 * the long press is cancelled (user is scrolling, not dragging).
 *
 * preventDefault() is called on touchmove to stop any residual
 * browser behavior during the 300ms detection window.
 */
export default function useLongPress(
  refs: HookRefs,
  beginDrag: (e: React.TouchEvent<HTMLDivElement>, clientX: number, clientY: number) => void,
  dragEnd: () => void,
  onDragMove: (clientX: number, clientY: number) => void,
) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef({ x: 0, y: 0 })
  const pendingTouchEventRef = useRef<React.TouchEvent<HTMLDivElement> | null>(null)
  const isTouchActiveRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const momentumRafRef = useRef<number | null>(null)

  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current)
      momentumRafRef.current = null
    }
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    pendingTouchEventRef.current = null
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
  }, [])

  const touchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) return

      // Only start long-press if touch is on a draggable element
      let el = e.target as HTMLElement | null
      let isDraggable = false
      while (el) {
        if (el.dataset?.contextid) break
        if (el.dataset?.disabled === 'true') break
        if (el.dataset?.id) {
          isDraggable = true
          break
        }
        el = el.parentNode as HTMLElement | null
      }
      if (!isDraggable) return

      // Stop any ongoing momentum scroll from a previous gesture
      stopMomentum()

      cancelLongPress()
      isTouchActiveRef.current = true

      // Prevent text selection during long-press
      window.getSelection()?.removeAllRanges()

      const touch = e.touches[0]
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      pendingTouchEventRef.current = e

      const tableEl = refs.tableRef?.current
      if (!tableEl) return

      let dragPhase = false
      let scrollPhase = false
      let lastScrollY = touch.clientY
      let lastScrollX = touch.clientX
      // Velocity tracking for momentum scroll
      let velY = 0
      let velX = 0
      let lastTime = Date.now()

      // Block text selection during long-press detection + drag
      const onSelectStart = (ev: Event) => ev.preventDefault()
      document.addEventListener('selectstart', onSelectStart)

      // Walk up from the touch target to find the first scrollable ancestor.
      const findScrollTarget = (startEl: HTMLElement): HTMLElement => {
        const body = refs.bodyRef?.current
        let el: HTMLElement | null = startEl
        while (el && el !== body) {
          const style = window.getComputedStyle(el)
          const oy = style.overflowY
          const ox = style.overflowX
          const canScrollY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight
          const canScrollX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth
          if (canScrollY || canScrollX) return el
          el = el.parentElement
        }
        return body ?? (document.body as HTMLElement)
      }

      // Determine scroll target once at gesture start from the touch target element
      const scrollTarget: HTMLElement = findScrollTarget(e.target as HTMLElement)

      const onMove = (ev: TouchEvent) => {
        ev.preventDefault()
        const t = ev.touches[0]
        const now = Date.now()
        const dt = Math.max(now - lastTime, 1)
        lastTime = now

        if (scrollPhase) {
          const dy = t.clientY - lastScrollY
          const dx = t.clientX - lastScrollX

          if (scrollTarget) {
            const body = refs.bodyRef?.current

            // Check if scrollTarget has reached its scroll boundary
            const atTopEdge = dy > 0 && scrollTarget.scrollTop <= 0
            const atBottomEdge =
              dy < 0 &&
              scrollTarget.scrollTop + scrollTarget.clientHeight >= scrollTarget.scrollHeight - 1
            const atLeftEdge = dx > 0 && scrollTarget.scrollLeft <= 0
            const atRightEdge =
              dx < 0 &&
              scrollTarget.scrollLeft + scrollTarget.clientWidth >= scrollTarget.scrollWidth - 1

            const overflowY = atTopEdge || atBottomEdge
            const overflowX = atLeftEdge || atRightEdge

            if (scrollTarget !== body) {
              // Scroll the cell for the non-overflow axis
              if (!overflowX) scrollTarget.scrollLeft -= dx
              if (!overflowY) scrollTarget.scrollTop -= dy

              // Overflow to body for the axis that hit the boundary
              if (body) {
                if (overflowY) body.scrollTop -= dy
                if (overflowX) body.scrollLeft -= dx
              }
            } else {
              scrollTarget.scrollTop -= dy
              scrollTarget.scrollLeft -= dx
            }
          }

          // Track velocity (px/ms → px/frame at 60fps ≈ 16ms)
          velY = (-dy / dt) * 16
          velX = (-dx / dt) * 16
          lastScrollY = t.clientY
          lastScrollX = t.clientX
        } else if (!dragPhase) {
          const dx = t.clientX - touchStartPosRef.current.x
          const dy = t.clientY - touchStartPosRef.current.y
          if (
            Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD ||
            Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD
          ) {
            // User wants to scroll — cancel long press, switch to JS scroll
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            pendingTouchEventRef.current = null
            scrollPhase = true
            lastScrollY = t.clientY
            lastScrollX = t.clientX
            velY = 0
            velX = 0
            lastTime = Date.now()
          }
        } else {
          onDragMove(t.clientX, t.clientY)
        }
      }

      const onEnd = () => {
        if (dragPhase) {
          cleanup()
          dragEnd()
        } else {
          cancelLongPress()

          // Launch momentum scroll if we were in scroll phase
          if (
            scrollPhase &&
            scrollTarget &&
            (Math.abs(velY) > MIN_VELOCITY || Math.abs(velX) > MIN_VELOCITY)
          ) {
            const target = scrollTarget
            const runMomentum = () => {
              velY *= FRICTION
              velX *= FRICTION
              target.scrollTop += velY
              target.scrollLeft += velX
              if (Math.abs(velY) > MIN_VELOCITY || Math.abs(velX) > MIN_VELOCITY) {
                momentumRafRef.current = requestAnimationFrame(runMomentum)
              } else {
                momentumRafRef.current = null
              }
            }
            momentumRafRef.current = requestAnimationFrame(runMomentum)
          }

          setTimeout(() => {
            isTouchActiveRef.current = false
          }, 400)
        }
      }

      const cleanup = () => {
        tableEl.removeEventListener('touchmove', onMove)
        tableEl.removeEventListener('touchend', onEnd)
        tableEl.removeEventListener('touchcancel', onEnd)
        document.removeEventListener('selectstart', onSelectStart)
        cleanupRef.current = null
      }

      tableEl.addEventListener('touchmove', onMove, { passive: false })
      tableEl.addEventListener('touchend', onEnd, false)
      tableEl.addEventListener('touchcancel', onEnd, false)
      cleanupRef.current = cleanup

      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        dragPhase = true

        const saved = pendingTouchEventRef.current
        pendingTouchEventRef.current = null
        if (saved) {
          beginDrag(saved, touch.clientX, touch.clientY)
        }
      }, LONG_PRESS_DELAY)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      beginDrag,
      dragEnd,
      onDragMove,
      cancelLongPress,
      stopMomentum,
      refs.tableRef?.current,
      refs.bodyRef?.current,
    ],
  )

  return { touchStart, cancelLongPress, isTouchActiveRef }
}
