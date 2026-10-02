import { useCallback, useEffect, useRef } from 'react'
import type { HookRefs } from './types'
import { isTextEntryTarget } from './drag/dom'

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
  beginDrag: (e: React.TouchEvent<HTMLDivElement>, clientX: number, clientY: number) => boolean,
  dragEnd: () => void,
  onDragMove: (clientX: number, clientY: number) => void,
  onTap?: (target: EventTarget) => void,
) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef({ x: 0, y: 0 })
  const pendingTouchEventRef = useRef<React.TouchEvent<HTMLDivElement> | null>(null)
  const isTouchActiveRef = useRef(false)
  const touchReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** A touch gesture ended: ignore the browser's compatibility mousedown for 400ms. One timer,
   *  so an older gesture's timer can never clear the flag during a newer gesture. */
  const releaseTouchSoon = useCallback(() => {
    if (touchReleaseTimerRef.current) clearTimeout(touchReleaseTimerRef.current)
    touchReleaseTimerRef.current = setTimeout(() => {
      touchReleaseTimerRef.current = null
      isTouchActiveRef.current = false
    }, 400)
  }, [])
  const cleanupRef = useRef<(() => void) | null>(null)
  const momentumRafRef = useRef<number | null>(null)

  // unmount mid-gesture: drop document listeners and any momentum animation
  useEffect(
    () => () => {
      cleanupRef.current?.()
      if (momentumRafRef.current !== null) cancelAnimationFrame(momentumRafRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      if (touchReleaseTimerRef.current) clearTimeout(touchReleaseTimerRef.current)
    },
    [],
  )

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
      // one finger drives a gesture; a second finger must not restart or cancel the first
      if (e.touches.length > 1) return

      // Only start long-press if touch is on a draggable element
      let el = e.target as HTMLElement | null
      let draggableEl: HTMLElement | null = null
      while (el) {
        if (el.dataset?.contextid) break
        if (el.dataset?.disabled === 'true') break
        if (el.dataset?.rtdnd === 'draggable') {
          draggableEl = el
          break
        }
        el = el.parentNode as HTMLElement | null
      }
      if (!draggableEl) return
      // a long-press in a text field or select is the browser's (caret, text selection, picker)
      if (isTextEntryTarget(e.target, draggableEl)) return

      // Stop any ongoing momentum scroll from a previous gesture
      stopMomentum()

      cancelLongPress()
      if (touchReleaseTimerRef.current) {
        clearTimeout(touchReleaseTimerRef.current) // a new gesture: the old release must not fire
        touchReleaseTimerRef.current = null
      }
      isTouchActiveRef.current = true

      // Prevent text selection during long-press
      window.getSelection()?.removeAllRanges()

      const touch = e.touches[0]
      const fingerId = touch.identifier // the finger this gesture follows
      const ownTouch = (list: TouchList) => {
        for (let i = 0; i < list.length; i++) if (list[i].identifier === fingerId) return list[i]
        return null
      }
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      pendingTouchEventRef.current = e

      const tableEl = refs.tableRef?.current
      if (!tableEl) return

      let dragPhase = false
      let scrollPhase = false
      let resolvedAsClick = false // long-press that beginDrag turned into a click (no drag)
      let lastScrollY = touch.clientY
      let lastScrollX = touch.clientX
      // Velocity tracking for momentum scroll
      let velY = 0
      let velX = 0
      let lastTime = Date.now()

      // Block text selection during long-press detection + drag
      const onSelectStart = (ev: Event) => ev.preventDefault()
      document.addEventListener('selectstart', onSelectStart)

      // Scroll `el`; whatever it cannot take (it is at its edge) scrolls the page instead, so a
      // table that fills the screen never traps the page. Native scrolling does the same.
      const scrollOrPassOn = (el: HTMLElement, dx: number, dy: number) => {
        const top = el.scrollTop
        const left = el.scrollLeft
        el.scrollTop -= dy
        el.scrollLeft -= dx
        const leftoverY = el.scrollTop === top ? dy : 0
        const leftoverX = el.scrollLeft === left ? dx : 0
        if (leftoverX || leftoverY) window.scrollBy(-leftoverX, -leftoverY)
      }

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
      const tapTarget: EventTarget = e.target

      const onMove = (ev: TouchEvent) => {
        ev.preventDefault()
        const t = ownTouch(ev.touches)
        if (!t) return // only another finger moved
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
              if (body) scrollOrPassOn(body, overflowX ? dx : 0, overflowY ? dy : 0)
            } else {
              scrollOrPassOn(scrollTarget, dx, dy)
            }
          }

          // Track velocity (px/ms → px/frame at 60fps ≈ 16ms)
          velY = (-dy / dt) * 16
          velX = (-dx / dt) * 16
          lastScrollY = t.clientY
          lastScrollX = t.clientX
        } else if (!dragPhase && !resolvedAsClick) {
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
        } else if (dragPhase) {
          onDragMove(t.clientX, t.clientY)
        }
        // resolvedAsClick: the long-press became a click, so there is no drag to move
      }

      const onEnd = (ev: TouchEvent) => {
        if (!ownTouch(ev.changedTouches)) return // another finger lifted: keep going
        if (dragPhase) {
          cleanup()
          dragEnd()
        } else {
          cancelLongPress()

          // Finger lifted before the long-press fired and without scrolling: a tap.
          // A browser-initiated touchcancel is not one, and neither is a long-press that
          // already resolved as a click.
          if (!scrollPhase && !resolvedAsClick && ev.type !== 'touchcancel') onTap?.(tapTarget)

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

          releaseTouchSoon()
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
        const saved = pendingTouchEventRef.current
        pendingTouchEventRef.current = null
        // beginDrag may resolve the press as a click instead (select handle, off a drag
        // handle): then there is nothing to drag, so drop the gesture cleanly
        dragPhase = !!saved && beginDrag(saved, touch.clientX, touch.clientY)
        // Not a drag: keep the touch listeners so `onEnd` finishes the gesture on finger lift
        // (and its 400ms reset still shields the compat mouse events that follow).
        if (!dragPhase) resolvedAsClick = true
      }, LONG_PRESS_DELAY)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      beginDrag,
      dragEnd,
      onDragMove,
      onTap,
      cancelLongPress,
      stopMomentum,
      releaseTouchSoon,
      refs.tableRef?.current,
      refs.bodyRef?.current,
    ],
  )

  return { touchStart, cancelLongPress, isTouchActiveRef, releaseTouchSoon }
}
