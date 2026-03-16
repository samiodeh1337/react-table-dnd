import { useRef, useCallback } from 'react'
import type { MutableRefObject } from 'react'

interface Refs {
  bodyRef: MutableRefObject<HTMLDivElement> | null
  headerRef: MutableRefObject<HTMLDivElement> | null
}

const EDGE_ZONE = 30 // px from edge to trigger auto-scroll

const useAutoScroll = (refs: Refs) => {
  const isAutoScrollingHorizontal = useRef(false)
  const isAutoScrollingVertical = useRef(false)
  const decaySpeed = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  // Pointer position ref — updated externally by drag handler
  const pointerRef = useRef({ x: 0, y: 0 })

  // Container rect — set once at drag start via setContainerRect, reused by the loop
  const containerRectRef = useRef<DOMRect | null>(null)

  const setContainerRect = useCallback((rect: DOMRect) => {
    containerRectRef.current = rect
  }, [])

  const stopAutoScroll = useCallback(() => {
    isAutoScrollingVertical.current = false
    isAutoScrollingHorizontal.current = false
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const autoScroll = useCallback(
    (speed: number, ref: HTMLDivElement, dir: 'horizontal' | 'vertical') => {
      const isVertical = dir === 'vertical'
      const flag = isVertical ? isAutoScrollingVertical : isAutoScrollingHorizontal

      if (!flag.current) return

      // Check if pointer is still in edge zone — stop if not.
      // Uses cached rect (set once at drag start) to avoid getBoundingClientRect per frame.
      const rect = containerRectRef.current
      if (rect) {
        const ptr = pointerRef.current
        if (isVertical) {
          const inTopEdge = ptr.y < rect.top + EDGE_ZONE
          const inBottomEdge = ptr.y > rect.bottom - EDGE_ZONE
          if (!inTopEdge && !inBottomEdge) {
            flag.current = false
            return
          }
        } else {
          const inLeftEdge = ptr.x < rect.left + EDGE_ZONE
          const inRightEdge = ptr.x > rect.right - EDGE_ZONE
          if (!inLeftEdge && !inRightEdge) {
            flag.current = false
            return
          }
        }
      }

      // Scroll
      const maxScroll = isVertical
        ? ref.scrollHeight - ref.clientHeight
        : ref.scrollWidth - ref.clientWidth

      if (isVertical) ref.scrollTop += speed
      else ref.scrollLeft += speed

      // Hit boundary — stop
      const pos = isVertical ? ref.scrollTop : ref.scrollLeft
      if (pos >= maxScroll || pos <= 0) {
        flag.current = false
        return
      }

      // Continue
      decaySpeed.current += speed / 1000
      animationFrameRef.current = requestAnimationFrame(() =>
        autoScroll(speed + decaySpeed.current, ref, dir),
      )
    },
    [],
  )

  const startAutoScroll = useCallback(
    (speed: number, ref: HTMLDivElement, dir: 'horizontal' | 'vertical') => {
      const isVertical = dir === 'vertical'
      const flag = isVertical ? isAutoScrollingVertical : isAutoScrollingHorizontal

      if (!flag.current) {
        flag.current = true
        decaySpeed.current = 0
        // Defer first tick — writing scrollTop inside a touch handler causes
        // Chrome Android to reclaim the touch and kill future event delivery.
        animationFrameRef.current = requestAnimationFrame(() => autoScroll(speed, ref, dir))
      }
    },
    [autoScroll],
  )

  const BodyScrollHandle = useCallback<React.UIEventHandler<HTMLDivElement>>(
    (e) => {
      if (refs.headerRef?.current && e.currentTarget) {
        refs.headerRef.current.scrollLeft = e.currentTarget.scrollLeft
      }
    },
    [refs],
  )

  const HeaderScrollHandle = useCallback<React.UIEventHandler<HTMLDivElement>>(
    (e) => {
      if (refs.bodyRef?.current && e.currentTarget) {
        refs.bodyRef.current.scrollLeft = e.currentTarget.scrollLeft
      }
    },
    [refs],
  )

  return {
    startAutoScroll,
    stopAutoScroll,
    setContainerRect,
    isAutoScrollingVertical,
    isAutoScrollingHorizontal,
    pointerRef,
    BodyScrollHandle,
    HeaderScrollHandle,
  }
}

export default useAutoScroll
