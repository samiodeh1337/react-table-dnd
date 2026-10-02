/**
 * useDropSettle — the "unfold" after a drop (a FLIP animation).
 *
 * Before the consumer re-renders the new order we note where every mounted row is on screen;
 * the rows that moved are noted at the card's landing slot. After the re-render each row is
 * started at its old spot with a transform (moved rows collapsed on the slot, invisible) and
 * transitions to where it now belongs. One rect read per row before and after; nothing per
 * frame. Skipped under prefers-reduced-motion; cancelled by a new drag or unmount.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { DROP_FLIP_MS } from './drag/constants'
import { prefersReducedMotion } from './drag/dom'

export interface SettleSnapshot {
  prevTop: Map<string, number>
  moved: Set<string>
}

const useDropSettle = () => {
  const elsRef = useRef<HTMLElement[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    for (const el of elsRef.current) {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
    }
    elsRef.current = []
  }, [])

  useEffect(() => () => clear(), [clear])

  /** Part 1 — call before the consumer re-renders. */
  const measure = useCallback(
    (
      body: HTMLElement,
      movedIds: readonly string[],
      landingTop: number | null,
    ): SettleSnapshot | null => {
      if (prefersReducedMotion()) return null
      clear()
      const moved = new Set(movedIds)
      const prevTop = new Map<string, number>()
      body
        .querySelectorAll<HTMLElement>('[data-rtdnd="draggable"][data-type="row"]')
        .forEach((row) => {
          const id = row.dataset.id
          const inner = row.firstElementChild as HTMLElement | null
          if (id === undefined || !inner) return
          if (moved.has(id)) {
            if (landingTop !== null) prevTop.set(id, landingTop)
          } else prevTop.set(id, inner.getBoundingClientRect().top)
        })
      return { prevTop, moved }
    },
    [clear],
  )

  /** Part 2 — call after the re-render and the scroll restore. */
  const play = useCallback(
    (body: HTMLElement, snapshot: SettleSnapshot, grabbedId: string | null) => {
      const els: HTMLElement[] = []
      body
        .querySelectorAll<HTMLElement>('[data-rtdnd="draggable"][data-type="row"]')
        .forEach((row) => {
          const id = row.dataset.id
          const inner = row.firstElementChild as HTMLElement | null
          if (id === undefined || !inner) return
          const oldTop = snapshot.prevTop.get(id)
          if (oldTop === undefined) return
          const dy = oldTop - inner.getBoundingClientRect().top
          const isMoved = snapshot.moved.has(id)
          if (Math.abs(dy) < 0.5 && !isMoved) return
          inner.style.transition = 'none'
          inner.style.transform = `translateY(${dy}px)`
          if (isMoved && id !== grabbedId) inner.style.opacity = '0'
          els.push(inner)
        })
      if (!els.length) return
      void body.offsetHeight // commit the start positions before animating
      for (const el of els) {
        el.style.transition = `transform ${DROP_FLIP_MS}ms cubic-bezier(0.2, 0, 0, 1), opacity ${DROP_FLIP_MS}ms ease-out`
        el.style.transform = ''
        el.style.opacity = ''
      }
      elsRef.current = els
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        for (const el of elsRef.current) el.style.transition = ''
        elsRef.current = []
      }, DROP_FLIP_MS + 20)
    },
    [],
  )

  return useMemo(() => ({ measure, play, clear }), [measure, play, clear])
}

export default useDropSettle
