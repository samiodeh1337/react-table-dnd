/* eslint-disable react-hooks/immutability */
// CSS transform shifts during drag — all DOM writes, no React state, ~60fps
import { useCallback, useRef } from 'react'
import type { HookRefs, DragType } from './types'

const TRANSITION_STYLE = 'transform 450ms cubic-bezier(0.2, 0, 0, 1)'

export type IndexMap = Map<number, { outer: HTMLElement; inner: HTMLElement }>

interface ShiftTransformsResult {
  applyShiftTransforms: (
    sourceIndex: number | null,
    targetIndex: number | null,
    dtype: DragType | null,
  ) => void
  clearShiftTransforms: () => void
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
      const forward = (sourceIdx ?? 0) < (targetIdx ?? 0)

      ph.style.display = 'block'
      if (dtype === 'row') {
        ph.style.top = `${forward ? rect.top + rect.height - size.height : rect.top}px`
        ph.style.left = `${tableRect?.left ?? rect.left}px`
        ph.style.width = `${tableRect?.width ?? rect.width}px`
        ph.style.height = `${size.height}px`
      } else {
        ph.style.top = `${tableRect?.top ?? rect.top}px`
        ph.style.left = `${forward ? rect.left + rect.width - size.width : rect.left}px`
        ph.style.width = `${size.width}px`
        ph.style.height = `${tableRect?.height ?? rect.height}px`
      }
    },
    [refs.placeholderRef, refs.tableRef],
  )

  const applyShiftTransforms = useCallback(
    (sourceIndex: number | null, targetIndex: number | null, dtype: DragType | null) => {
      if (sourceIndex === null || targetIndex === null) return
      const size = draggedSizeRef.current
      const prevTarget = prevTargetIndexRef.current

      // only update the affected range instead of all elements
      const needsFullPass = prevTarget === null
      const rangeMin = needsFullPass
        ? -Infinity
        : Math.min(prevTarget!, targetIndex, sourceIndex) - 1
      const rangeMax = needsFullPass
        ? Infinity
        : Math.max(prevTarget!, targetIndex, sourceIndex) + 1

      // read before any writes to avoid layout thrashing
      let targetEl: HTMLElement | null = null
      const map = dtype === 'row' ? rowIndexMapRef.current : colIndexMapRef.current
      const entry = map.get(targetIndex)
      if (entry) targetEl = entry.outer

      positionPlaceholder(targetEl, sourceIndex, targetIndex, dtype)

      const applyShift = (idxMap: IndexMap, axis: 'Y' | 'X', amount: number) => {
        const doEntry = (idx: number, outer: HTMLElement, inner: HTMLElement) => {
          let shift = ''
          if (idx > sourceIndex && idx <= targetIndex) shift = `translate${axis}(-${amount}px)`
          else if (idx < sourceIndex && idx >= targetIndex) shift = `translate${axis}(${amount}px)`
          inner.style.transform = shift
          inner.style.transition = idx === sourceIndex ? 'none' : TRANSITION_STYLE
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
            if (firstPass) cell.style.transition = TRANSITION_STYLE
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
    [positionPlaceholder, rowIndexMapRef, colIndexMapRef, cellIndexMapRef],
  )

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current
    if (ph) ph.style.display = 'none'

    for (const inner of shiftedElementsRef.current) {
      inner.style.transition = 'none'
      inner.style.transform = ''
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

    prevTargetIndexRef.current = null
  }, [refs.placeholderRef])

  return {
    applyShiftTransforms,
    clearShiftTransforms,
    prevTargetIndexRef,
    draggedSizeRef,
  }
}

export default useShiftTransforms
