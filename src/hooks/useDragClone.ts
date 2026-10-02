/* eslint-disable react-hooks/immutability -- writes DOM styles through refs; same as useShiftTransforms */
/**
 * useDragClone — the element that follows the pointer.
 *
 * Built once per drag from the grabbed row (a compact card with ghosts and a badge when the
 * group has more than one row) or the grabbed column (its header over a strip of its cells).
 * Moved with a transform on every frame, kept scroll-aligned with the body, snapped into the
 * slot on release and emptied after React renders the drag as over.
 */
import { useCallback, useMemo, useRef } from 'react'
import { DROP_SNAP_MS } from './drag/constants'
import {
  buildColumnStrip,
  buildRowCard,
  topUpColumnStrip,
  type StripProgress,
} from './drag/cloneBuilders'
import { prefersReducedMotion } from './drag/dom'
import type { DragGroup, DragType, HookRefs } from './types'
import useIsomorphicLayoutEffect from './useIsomorphicLayoutEffect'

export interface CloneBuildInput {
  dtype: DragType | null
  draggableEl: HTMLElement
  group: DragGroup
  body: HTMLElement | null
  isVirtual: boolean
  showBadge: boolean
  /** Horizontal grab point inside the row (the badge hugs the cursor). */
  grabX: number
  /** Where the grabbed item sits on screen, in clone coordinates. */
  x: number
  y: number
}

const useDragClone = (cloneRef: HookRefs['cloneRef'], isDragging: boolean) => {
  const dtypeRef = useRef<DragType | null>(null)
  const rowScrollerRef = useRef<HTMLElement | null>(null) // group card: keeps scrollLeft in sync
  const columnStripRef = useRef<HTMLElement | null>(null) // column clone: keeps scrollTop in sync
  const stripProgressRef = useRef<StripProgress | null>(null) // column clone: what it holds so far

  /** Fill the clone for this drag. A column drag returns the body cells to hide in the table. */
  const build = useCallback(
    (input: CloneBuildInput): HTMLElement[] => {
      dtypeRef.current = input.dtype
      rowScrollerRef.current = null
      columnStripRef.current = null
      stripProgressRef.current = null
      const cloneEl = cloneRef?.current
      if (!cloneEl) return []
      cloneEl.innerHTML = ''
      cloneEl.style.transform = `translate(${input.x}px, ${input.y}px)`
      cloneEl.style.visibility = 'visible' // before React renders isDragging: no blank frame

      const content = input.draggableEl.firstElementChild?.firstElementChild ?? null // the tr div
      if (input.dtype === 'row' && content) {
        const card = buildRowCard(cloneEl, content, input.group, {
          showBadge: input.showBadge,
          grabX: input.grabX,
          colourSources: [content.querySelector('[data-rtdnd="td"]'), content, input.body],
        })
        rowScrollerRef.current = card.scroller
        return []
      }
      if (input.dtype === 'column' && input.body) {
        const strip = buildColumnStrip(
          cloneEl,
          input.draggableEl,
          input.body,
          input.group.grabbed,
          input.isVirtual,
        )
        columnStripRef.current = strip.bodyStrip
        stripProgressRef.current = strip.progress
        return strip.cells
      }
      return []
    },
    [cloneRef],
  )

  const follow = useCallback(
    (x: number, y: number) => {
      const cloneEl = cloneRef?.current
      if (cloneEl) cloneEl.style.transform = `translate(${x}px, ${y}px)`
    },
    [cloneRef],
  )

  /** Column drag in a virtual table: add the rows mounted since the drag started to the strip.
   *  Returns the column's mounted body cells, to hide in the table. */
  const topUpStrip = useCallback((body: HTMLElement): HTMLElement[] => {
    const progress = stripProgressRef.current
    return progress ? topUpColumnStrip(progress, body) : []
  }, [])

  /** Keep the clone's content aligned with the body's scroll position. */
  const syncScroll = useCallback(
    (bodyScrollLeft: number, bodyScrollTop: number) => {
      const cloneEl = cloneRef?.current
      if (!cloneEl) return
      if (dtypeRef.current === 'row') {
        cloneEl.scrollLeft = bodyScrollLeft
        if (rowScrollerRef.current) rowScrollerRef.current.scrollLeft = bodyScrollLeft
      } else if (columnStripRef.current) columnStripRef.current.scrollTop = bodyScrollTop
    },
    [cloneRef],
  )

  /** Animate the clone into the slot. Returns false when there is nothing to animate (no clone,
   *  or reduced motion), so the caller finalizes the drop at once. */
  const snapTo = useCallback(
    (x: number, y: number): boolean => {
      const cloneEl = cloneRef?.current
      if (!cloneEl || prefersReducedMotion()) return false
      cloneEl.style.transition = `transform ${DROP_SNAP_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      cloneEl.style.transform = `translate(${x}px, ${y}px)`
      return true
    },
    [cloneRef],
  )

  const hide = useCallback(() => {
    const cloneEl = cloneRef?.current
    if (cloneEl) cloneEl.style.visibility = 'hidden'
  }, [cloneRef])

  // empty the clone after React renders isDragging: false
  useIsomorphicLayoutEffect(() => {
    if (isDragging) return
    const cloneEl = cloneRef?.current
    if (!cloneEl) return
    cloneEl.style.transition = ''
    cloneEl.style.transform = 'translate(0px, 0px)'
    cloneEl.style.visibility = 'hidden' // idle: never paint an empty clone (or its scrollbars)
    cloneEl.scrollLeft = 0
    cloneEl.innerHTML = ''
    delete cloneEl.dataset.groupSize
  }, [isDragging, cloneRef])

  return useMemo(
    () => ({ build, follow, syncScroll, topUpStrip, snapTo, hide }),
    [build, follow, syncScroll, topUpStrip, snapTo, hide],
  )
}

export default useDragClone
