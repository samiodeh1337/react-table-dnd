/* eslint-disable react-hooks/immutability */
// CSS transform shifts during drag — all DOM writes, no React state, ~60fps
import { useCallback, useRef } from 'react'
import type { HookRefs, DragType } from './types'

const TRANSITION_STYLE = 'transform 450ms cubic-bezier(0.2, 0, 0, 1)'
const PH_TRANSITION_STYLE = 'transform 150ms cubic-bezier(0.2, 0, 0, 1)'
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export type IndexMap = Map<number, { outer: HTMLElement; inner: HTMLElement }>

interface ShiftTransformsResult {
  applyShiftTransforms: (
    sourceIndex: number | null,
    targetIndex: number | null,
    dtype: DragType | null,
    selectedSet?: Set<number>,
  ) => void
  clearShiftTransforms: () => void
  repositionMultiDragPlaceholder: () => void
  prevTargetIndexRef: React.RefObject<number | null> // reset on clear
  draggedSizeRef: React.RefObject<{ width: number; height: number }> // set by beginDrag
}

const useShiftTransforms = (
  refs: HookRefs,
  rowIndexMapRef: React.RefObject<IndexMap>,
  colIndexMapRef: React.RefObject<IndexMap>,
  cellIndexMapRef: React.RefObject<Map<number, HTMLElement[]>>,
): ShiftTransformsResult => {
  const draggedSizeRef = useRef({ width: 0, height: 0 })
  const prevTargetIndexRef = useRef<number | null>(null)

  // track shifted elements so cleanup doesn't need querySelectorAll
  const shiftedElementsRef = useRef<Set<HTMLElement>>(new Set())
  const shiftedCellsRef = useRef<Set<HTMLElement>>(new Set())
  const cellShiftCache = useRef<Map<HTMLElement, string>>(new Map())

  // multi-drag placeholder: gap position in scroll-space so it survives body scroll
  const mdGapRef = useRef<{
    scrollSpaceTop: number // gap top relative to body content
    gapHeight: number
  } | null>(null)

  const positionPlaceholder = useCallback(
    (
      targetEl: HTMLElement | null,
      sourceIdx: number | null,
      targetIdx: number | null,
      dtype: DragType | null,
    ) => {
      const ph = refs.placeholderRef?.current
      if (!ph || !targetEl) {
        if (ph) ph.style.display = 'none'
        return
      }

      const size = draggedSizeRef.current
      const rect = targetEl.getBoundingClientRect()
      const tableRect = refs.tableRef?.current?.getBoundingClientRect()
      const body = refs.bodyRef?.current
      const scrollbarW = body ? body.offsetWidth - body.clientWidth : 0
      const scrollbarH = body ? body.offsetHeight - body.clientHeight : 0
      const forward = (sourceIdx ?? 0) < (targetIdx ?? 0)

      const isFirstShow = ph.style.display === 'none'
      const prevTop = parseFloat(ph.style.top) || 0
      const prevLeft = parseFloat(ph.style.left) || 0

      // Reset before writing new position
      ph.style.transition = ''
      ph.style.transform = ''
      ph.style.display = 'block'

      if (dtype === 'row') {
        ph.style.top = `${forward ? rect.top + rect.height - size.height : rect.top}px`
        ph.style.left = `${tableRect?.left ?? rect.left}px`
        ph.style.width = `${(tableRect?.width ?? rect.width) - scrollbarW}px`
        ph.style.height = `${size.height}px`
      } else {
        ph.style.top = `${tableRect?.top ?? rect.top}px`
        ph.style.left = `${forward ? rect.left + rect.width - size.width : rect.left}px`
        ph.style.width = `${size.width}px`
        ph.style.height = `${(tableRect?.height ?? rect.height) - scrollbarH}px`
      }

      if (!isFirstShow && !prefersReducedMotion()) {
        const deltaX = prevLeft - (parseFloat(ph.style.left) || 0)
        const deltaY = prevTop - (parseFloat(ph.style.top) || 0)
        if (deltaX !== 0 || deltaY !== 0) {
          ph.style.transform = `translate(${deltaX}px, ${deltaY}px)`
          void ph.offsetHeight // flush so browser sees the inverted position
          ph.style.transition = PH_TRANSITION_STYLE
          ph.style.transform = 'translate(0, 0)'
        }
      }
    },
    [refs.placeholderRef, refs.tableRef, refs.bodyRef],
  )

  // Lightweight helper: convert scroll-space gap position to viewport coords.
  // Called both from applyShiftTransforms and on every frame during multi-drag scroll.
  const positionMultiDragPh = useCallback(() => {
    const gap = mdGapRef.current
    const ph = refs.placeholderRef?.current
    if (!ph || !gap) return
    const body = refs.bodyRef?.current
    if (!body) return

    // Convert scroll-space → viewport: subtract scrollTop, add body's viewport top
    const bodyRect = body.getBoundingClientRect()
    const viewportTop = gap.scrollSpaceTop - body.scrollTop + bodyRect.top
    const tableRect = refs.tableRef?.current?.getBoundingClientRect()
    const scrollbarW = body.offsetWidth - body.clientWidth

    ph.style.display = 'block'
    ph.style.top = `${viewportTop}px`
    ph.style.left = `${tableRect?.left ?? bodyRect.left}px`
    ph.style.width = `${(tableRect?.width ?? bodyRect.width) - scrollbarW}px`
    ph.style.height = `${gap.gapHeight}px`
    ph.style.transition = prefersReducedMotion() ? '' : PH_TRANSITION_STYLE
    ph.style.transform = ''
  }, [refs.placeholderRef, refs.tableRef, refs.bodyRef])

  const applyShiftTransforms = useCallback(
    (
      sourceIndex: number | null,
      targetIndex: number | null,
      dtype: DragType | null,
      selectedSet?: Set<number>,
    ) => {
      if (sourceIndex === null || targetIndex === null) return
      const size = draggedSizeRef.current
      const prevTarget = prevTargetIndexRef.current

      // read before any writes to avoid layout thrashing
      let targetEl: HTMLElement | null = null
      const map = dtype === 'row' ? rowIndexMapRef.current : colIndexMapRef.current
      const entry = map.get(targetIndex)
      if (entry) targetEl = entry.outer

      // ── Multi-drag row path ──
      if (selectedSet && selectedSet.size > 1 && dtype === 'row') {
        const sortedSel = Array.from(selectedSet).sort((a, b) => a - b)
        const N = sortedSel.length

        // binary-search: count of selected indices < val
        const countBefore = (val: number) => {
          let lo = 0,
            hi = sortedSel.length
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (sortedSel[mid] < val) lo = mid + 1
            else hi = mid
          }
          return lo
        }

        const effectiveTarget = targetIndex - countBefore(targetIndex)

        // Track elements adjacent to the gap for placeholder positioning.
        // "after gap" = first non-selected item whose compacted position >= effectiveTarget
        // "before gap" = last non-selected item whose compacted position < effectiveTarget
        let afterEl: HTMLElement | null = null
        let afterDelta = 0
        let afterPosWithout = Infinity
        let beforeEl: HTMLElement | null = null
        let beforeDelta = 0
        let beforePosWithout = -1

        for (const [idx, { outer, inner }] of rowIndexMapRef.current) {
          if (selectedSet.has(idx)) {
            inner.style.opacity = '0'
            inner.style.transform = ''
            inner.style.transition = 'none'
            shiftedElementsRef.current.add(inner)
            outer.removeAttribute('data-drop-target')
            continue
          }
          const holesBefore = countBefore(idx)
          const posWithout = idx - holesBefore
          const finalPos = posWithout < effectiveTarget ? posWithout : posWithout + N
          const delta = finalPos - idx

          inner.style.transform = delta !== 0 ? `translateY(${delta * size.height}px)` : ''
          inner.style.transition = prefersReducedMotion() ? 'none' : TRANSITION_STYLE
          if (delta !== 0) shiftedElementsRef.current.add(inner)
          if (idx === targetIndex) outer.setAttribute('data-drop-target', 'true')
          else outer.removeAttribute('data-drop-target')

          // Track gap neighbours (outer element — its rect is stable, not mid-transition)
          if (posWithout >= effectiveTarget && posWithout < afterPosWithout) {
            afterEl = outer
            afterDelta = delta
            afterPosWithout = posWithout
          }
          if (posWithout < effectiveTarget && posWithout > beforePosWithout) {
            beforeEl = outer
            beforeDelta = delta
            beforePosWithout = posWithout
          }
        }

        // Compute gap position in scroll-space (survives body scroll)
        const refEl = afterEl ?? beforeEl
        if (refEl) {
          const body = refs.bodyRef?.current
          const bodyTop = body?.getBoundingClientRect().top ?? 0
          const scrollTop = body?.scrollTop ?? 0
          // Convert outer element's viewport position to scroll-space
          const refScrollTop = refEl.getBoundingClientRect().top - bodyTop + scrollTop
          let gapScrollTop: number
          if (afterEl) {
            // afterEl final scroll-space top = refScrollTop + afterDelta * height
            // gap sits N*height above it
            gapScrollTop = refScrollTop + (afterDelta - N) * size.height
          } else {
            // beforeEl final scroll-space bottom = refScrollTop + (beforeDelta+1) * height
            gapScrollTop = refScrollTop + (beforeDelta + 1) * size.height
          }
          mdGapRef.current = { scrollSpaceTop: gapScrollTop, gapHeight: N * size.height }
        } else {
          mdGapRef.current = null
        }
        positionMultiDragPh()

        prevTargetIndexRef.current = targetIndex
        return
      }

      // ── Single-drag: position placeholder ──
      positionPlaceholder(targetEl, sourceIndex, targetIndex, dtype)

      // ── Single-drag path ──
      // only update the affected range instead of all elements
      const needsFullPass = prevTarget === null
      const rangeMin = needsFullPass
        ? -Infinity
        : Math.min(prevTarget!, targetIndex, sourceIndex) - 1
      const rangeMax = needsFullPass
        ? Infinity
        : Math.max(prevTarget!, targetIndex, sourceIndex) + 1

      const applyShift = (idxMap: IndexMap, axis: 'Y' | 'X', amount: number) => {
        const doEntry = (idx: number, outer: HTMLElement, inner: HTMLElement) => {
          let shift = ''
          if (idx > sourceIndex && idx <= targetIndex) shift = `translate${axis}(-${amount}px)`
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translate${axis}(${amount}px)`
          inner.style.transform = shift
          inner.style.transition =
            idx === sourceIndex || prefersReducedMotion() ? 'none' : TRANSITION_STYLE
          if (shift) shiftedElementsRef.current.add(inner)
          if (idx === targetIndex) outer.setAttribute('data-drop-target', 'true')
          else outer.removeAttribute('data-drop-target')
        }

        if (needsFullPass) {
          for (const [idx, { outer, inner }] of idxMap) doEntry(idx, outer, inner)
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const e = idxMap.get(idx)
            if (e) doEntry(idx, e.outer, e.inner)
          }
        }
      }

      if (dtype === 'row') {
        applyShift(rowIndexMapRef.current, 'Y', size.height)
      } else if (dtype === 'column') {
        applyShift(colIndexMapRef.current, 'X', size.width)

        // skip redundant cell writes via cache
        const cellMap = cellIndexMapRef.current
        const cache = cellShiftCache.current
        const doCells = (idx: number, cells: HTMLElement[], firstPass: boolean) => {
          let shift = ''
          if (idx > sourceIndex && idx <= targetIndex) shift = `translateX(-${size.width}px)`
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translateX(${size.width}px)`
          for (const cell of cells) {
            if (cache.get(cell) === shift) continue
            cell.style.transform = shift
            if (firstPass)
              cell.style.transition = prefersReducedMotion() ? 'none' : TRANSITION_STYLE
            cache.set(cell, shift)
            if (shift) shiftedCellsRef.current.add(cell)
          }
        }
        if (needsFullPass) {
          for (const [idx, cells] of cellMap) doCells(idx, cells, true)
        } else {
          for (let idx = rangeMin; idx <= rangeMax; idx++) {
            const cells = cellMap.get(idx)
            if (cells) doCells(idx, cells, false)
          }
        }
      }

      prevTargetIndexRef.current = targetIndex
    },
    [
      positionPlaceholder,
      positionMultiDragPh,
      rowIndexMapRef,
      colIndexMapRef,
      cellIndexMapRef,
      refs.bodyRef,
    ],
  )

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current
    if (ph) ph.style.display = 'none'

    for (const inner of shiftedElementsRef.current) {
      inner.style.transition = 'none'
      inner.style.transform = ''
      inner.style.opacity = ''
      const parent = inner.parentElement
      if (parent) parent.removeAttribute('data-drop-target')
    }
    shiftedElementsRef.current.clear()

    for (const cell of shiftedCellsRef.current) {
      cell.style.transition = 'none'
      cell.style.transform = ''
    }
    shiftedCellsRef.current.clear()
    cellShiftCache.current.clear()

    mdGapRef.current = null
    prevTargetIndexRef.current = null
  }, [refs.placeholderRef])

  // Cheap reposition for multi-drag placeholder during scroll (no shift recalc)
  const repositionMultiDragPlaceholder = useCallback(() => {
    positionMultiDragPh()
  }, [positionMultiDragPh])

  return {
    applyShiftTransforms,
    clearShiftTransforms,
    repositionMultiDragPlaceholder,
    prevTargetIndexRef,
    draggedSizeRef,
  }
}

export default useShiftTransforms
