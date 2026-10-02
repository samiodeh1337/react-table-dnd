/* eslint-disable react-hooks/preserve-manual-memoization -- callbacks read refs.x.current (the DOM elements), which the compiler cannot track; same pattern as the other drag hooks */
/**
 * useHiddenElements — what disappears from the table while a drag runs.
 *
 * The grabbed row (its clone is what the user sees), every other mounted member of the
 * group, and for a column drag the column's body cells. Every inline style changed here goes
 * through one `InlineStyleStash`, so `restore` puts back exactly what each element had before
 * the drag (React's cursor, your own opacity or touch-action), not an empty string.
 *
 * At the start of a group drag the other members do not vanish: `foldGroupRows` slides each
 * one into the card under the pointer while fading it out (the mirror of the drop "unfold" in
 * useDropSettle). The card keeps moving with the pointer, so the fold is a small frame loop
 * that re-reads the card's position every frame instead of a CSS transition. When the fold
 * ends the members are in exactly the state `hideGroupRows` produces.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { DragGroup, HookRefs } from './types'
import type { IndexMap } from './useShiftTransforms'
import { GRAB_FOLD_MS } from './drag/constants'
import { prefersReducedMotion } from './drag/dom'
import { InlineStyleStash } from './drag/inlineStyleStash'

/** A member mid-fold: the element that moves and what to put back afterwards. */
interface FoldingRow {
  inner: HTMLElement
  outer: HTMLElement
  /** The row's screen top when the fold started, before any scrolling. */
  startTop: number
  /** The outer's inline z-index before the fold (virtual rows position their outer). */
  outerZIndex: string
}

const useHiddenElements = (refs: HookRefs, rowIndexMapRef: React.RefObject<IndexMap>) => {
  const stashRef = useRef(new InlineStyleStash())
  const foldingRef = useRef<Map<HTMLElement, FoldingRow>>(new Map()) // keyed by inner
  const foldRafRef = useRef<number | null>(null)

  /** End the fold: keep the members hidden, put every temporary style back. */
  const settleFold = useCallback(() => {
    if (foldRafRef.current !== null) {
      cancelAnimationFrame(foldRafRef.current)
      foldRafRef.current = null
    }
    if (foldingRef.current.size === 0) return
    const done = Array.from(foldingRef.current.values())
    foldingRef.current = new Map()
    for (const row of done) {
      row.inner.style.transition = 'none' // a consumer transition must not animate the reset
      row.inner.style.transform = ''
      row.inner.style.position = ''
      row.inner.style.zIndex = ''
      row.inner.style.opacity = '0'
      // put the outer's z-index back only if it is still ours (a consumer re-render mid-fold wins)
      if (row.outer.style.zIndex === '1') row.outer.style.zIndex = row.outerZIndex
    }
    requestAnimationFrame(() => {
      for (const row of done)
        if (!foldingRef.current.has(row.inner) && row.inner.style.transition === 'none')
          row.inner.style.transition = ''
    })
  }, [])

  useEffect(() => () => settleFold(), [settleFold])

  /** Hide a row (it also stops taking the pointer). Safe to repeat. */
  const hide = useCallback((el: HTMLElement) => {
    stashRef.current.set(el, { opacity: '0', pointerEvents: 'none' })
  }, [])

  /** Hide a column drag's body cells. Opacity only: their pointer-events stay the consumer's.
   *  Safe to repeat, so a virtual table can pass newly mounted cells again. */
  const hideCells = useCallback((cells: HTMLElement[]) => {
    for (const cell of cells) stashRef.current.set(cell, { opacity: '0' })
  }, [])

  /** Hide every mounted member of the group. Safe to repeat: a virtual table remounts rows on
   *  scroll, so this runs again after every map rebuild. Members mid-fold are left to the fold. */
  const hideGroupRows = useCallback(
    (group: DragGroup) => {
      for (const idx of group.indices) {
        const entry = rowIndexMapRef.current?.get(idx)
        if (entry && !foldingRef.current.has(entry.inner)) hide(entry.inner)
      }
    },
    [hide, rowIndexMapRef],
  )

  /**
   * Hide the other members with a fold: each slides into the card (wherever the pointer has
   * taken it by now) and fades during the second half of the travel, then stays hidden.
   * `cardTop` returns the card's current screen top. Use once, at drag start; re-hides after a
   * virtual remount use `hideGroupRows`. Under reduced motion this is `hideGroupRows`.
   */
  const foldGroupRows = useCallback(
    (group: DragGroup, cardTop: () => number) => {
      const map = rowIndexMapRef.current
      const body = refs.bodyRef?.current
      if (!map || !body || group.count <= 1 || prefersReducedMotion()) {
        hideGroupRows(group)
        return
      }
      settleFold()

      // measure first, write after: one layout pass instead of one per member
      const rows: FoldingRow[] = []
      for (const idx of group.indices) {
        if (idx === group.grabbed) continue
        const entry = map.get(idx)
        if (!entry || entry.inner.style.opacity === '0') continue
        rows.push({
          inner: entry.inner,
          outer: entry.outer,
          startTop: entry.outer.getBoundingClientRect().top,
          outerZIndex: entry.outer.style.zIndex,
        })
      }
      if (rows.length === 0) return
      const scrollTop0 = body.scrollTop

      for (const row of rows) {
        row.inner.style.transition = 'none'
        // paint above the rows sliding to close the holes: the inner is static, so it needs a
        // position; a virtual row's outer is its own stacking context, so the outer is raised too
        row.inner.style.position = 'relative'
        row.inner.style.zIndex = '1'
        row.outer.style.zIndex = '1'
        // the frame loop fades it; the stash remembers its opacity from before the drag
        stashRef.current.set(row.inner, { opacity: '1', pointerEvents: 'none' })
        foldingRef.current.set(row.inner, row)
      }

      const t0 = performance.now()
      const easeOut = (t: number) => 1 - (1 - t) ** 3
      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / GRAB_FOLD_MS)
        const travel = easeOut(t)
        const target = cardTop() // the card moves with the pointer: chase it
        const scrolled = body.scrollTop - scrollTop0 // the rows moved with the body: allow for it
        for (const row of rows) {
          const naturalTop = row.startTop - scrolled
          row.inner.style.transform = `translateY(${(target - naturalTop) * travel}px)`
          row.inner.style.opacity = t < 0.5 ? '1' : String(1 - (t - 0.5) * 2)
        }
        if (t < 1) foldRafRef.current = requestAnimationFrame(frame)
        else {
          foldRafRef.current = null
          settleFold()
        }
      }
      foldRafRef.current = requestAnimationFrame(frame)
    },
    [rowIndexMapRef, refs.bodyRef, hideGroupRows, settleFold],
  )

  /** Lock the table against touch scrolling and take the grabbed item off screen. */
  const grab = useCallback(
    (draggableEl: HTMLElement) => {
      const tableEl = refs.tableRef?.current
      if (tableEl) stashRef.current.set(tableEl, { touchAction: 'none' })
      const inner = draggableEl.firstElementChild as HTMLElement | null
      if (inner)
        stashRef.current.set(inner, {
          zIndex: '2',
          cursor: '-webkit-grabbing',
          opacity: '0',
          pointerEvents: 'none',
        })
    },
    [refs.tableRef],
  )

  /** Show everything again, with the inline styles each element had before the drag. */
  const restore = useCallback(() => {
    settleFold() // a drop or cancel within the fold must not leave a transform behind
    stashRef.current.restoreAll()
  }, [settleFold])

  return useMemo(
    () => ({
      hideGroupRows,
      foldGroupRows,
      settleFold,
      hideCells,
      grab,
      restore,
    }),
    [hideGroupRows, foldGroupRows, settleFold, hideCells, grab, restore],
  )
}

export default useHiddenElements
