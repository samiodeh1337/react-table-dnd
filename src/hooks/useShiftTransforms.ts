/* eslint-disable react-hooks/immutability */
/**
 * useShiftTransforms — slides the other rows/columns out of the way during a drag.
 *
 * All DOM writes, no React state. The maths lives in `drag/shiftMath.ts`: every visible row
 * moves up by the hidden rows above it and, if it sits at or after the drop slot, down by one
 * card. A column drag moves one column: each column between the source and the target slides
 * by the dragged column's width.
 */
import { useCallback, useMemo, useRef } from 'react'
import type { HookRefs, DragType, DragGroup } from './types'
import { PLACEHOLDER_TRANSITION_STYLE, TRANSITION_STYLE } from './drag/constants'
import { prefersReducedMotion } from './drag/dom'
import { memberPrefixHeights } from './drag/dragGroup'
import { toInsertIndex } from './drag/dropMath'
import { affectedRange, placeholderSlot, shiftFor } from './drag/shiftMath'

export type IndexMap = Map<number, { outer: HTMLElement; inner: HTMLElement }>

interface ShiftTransformsResult {
  applyShiftTransforms: (targetIndex: number | null, dtype: DragType | null) => void
  clearShiftTransforms: () => void
  prevTargetIndexRef: React.RefObject<number | null> // reset on clear
  draggedSizeRef: React.RefObject<{ width: number; height: number }> // set by beginDrag
}

const useShiftTransforms = (
  refs: HookRefs,
  rowIndexMapRef: React.RefObject<IndexMap>,
  colIndexMapRef: React.RefObject<IndexMap>,
  cellIndexMapRef: React.RefObject<Map<number, HTMLElement[]>>,
  groupRef: React.RefObject<DragGroup | null>,
): ShiftTransformsResult => {
  const draggedSizeRef = useRef({ width: 0, height: 0 })
  const prevTargetIndexRef = useRef<number | null>(null)

  // elements that received a transform, so cleanup needs no querySelectorAll
  const shiftedElementsRef = useRef<Set<HTMLElement>>(new Set())
  // body cells (RowCell) carry the consumer's `style`: keep what they had, to put it back after
  const cellStyleBeforeDragRef = useRef<
    Map<HTMLElement, { transform: string; transition: string }>
  >(new Map())
  // the one element carrying data-drop-target (the index maps can be rebuilt mid-drag)
  const dropTargetElRef = useRef<HTMLElement | null>(null)
  const cellShiftCacheRef = useRef<Map<HTMLElement, string>>(new Map())

  // per-drag caches for the row path (rebuilt on every full pass)
  const rowCacheRef = useRef<{ group: DragGroup; prefix: number[]; free: number[] } | null>(null)
  const rowCache = useCallback(
    (group: DragGroup) => {
      const cached = rowCacheRef.current
      if (cached && cached.group === group) return cached
      const free: number[] = []
      for (const idx of rowIndexMapRef.current.keys()) if (!group.indexSet.has(idx)) free.push(idx)
      free.sort((a, b) => a - b)
      const next = { group, prefix: memberPrefixHeights(group), free }
      rowCacheRef.current = next
      return next
    },
    [rowIndexMapRef],
  )

  /** Show the placeholder over `targetEl`'s column (or at an explicit row slot). */
  const positionPlaceholder = useCallback(
    (
      targetEl: HTMLElement | null,
      box: { top: number; height: number } | { left: number; width: number },
    ) => {
      const ph = refs.placeholderRef?.current
      if (!ph || !targetEl) {
        if (ph) ph.style.display = 'none'
        return
      }
      const rect = targetEl.getBoundingClientRect()
      const tableRect = refs.tableRef?.current?.getBoundingClientRect()
      const body = refs.bodyRef?.current
      const scrollbarW = body ? body.offsetWidth - body.clientWidth : 0
      const scrollbarH = body ? body.offsetHeight - body.clientHeight : 0

      const isFirstShow = ph.style.display === 'none'
      const prevTop = parseFloat(ph.style.top) || 0
      const prevLeft = parseFloat(ph.style.left) || 0

      ph.style.transition = ''
      ph.style.transform = ''
      ph.style.display = 'block'

      if ('top' in box) {
        ph.style.top = `${box.top}px`
        ph.style.height = `${box.height}px`
        ph.style.left = `${tableRect?.left ?? rect.left}px`
        ph.style.width = `${(tableRect?.width ?? rect.width) - scrollbarW}px`
      } else {
        ph.style.top = `${tableRect?.top ?? rect.top}px`
        ph.style.left = `${box.left}px`
        ph.style.width = `${box.width}px`
        ph.style.height = `${(tableRect?.height ?? rect.height) - scrollbarH}px`
      }

      // glide from the previous slot
      if (!isFirstShow && !prefersReducedMotion()) {
        const deltaX = prevLeft - (parseFloat(ph.style.left) || 0)
        const deltaY = prevTop - (parseFloat(ph.style.top) || 0)
        if (deltaX !== 0 || deltaY !== 0) {
          ph.style.transform = `translate(${deltaX}px, ${deltaY}px)`
          void ph.offsetHeight // flush so the browser sees the inverted position
          ph.style.transition = PLACEHOLDER_TRANSITION_STYLE
          ph.style.transform = 'translate(0, 0)'
        }
      }
    },
    [refs.placeholderRef, refs.tableRef, refs.bodyRef],
  )

  /** Write one row's transform; a row only gets a transition if it moves or was moving. */
  const writeShift = useCallback((inner: HTMLElement, shift: string, instant: boolean) => {
    const wasShifted = shiftedElementsRef.current.has(inner)
    inner.style.transform = shift
    if (shift || wasShifted)
      inner.style.transition = instant || prefersReducedMotion() ? 'none' : TRANSITION_STYLE
    if (shift) shiftedElementsRef.current.add(inner)
  }, [])

  const markDropTarget = useCallback((map: IndexMap, targetIndex: number) => {
    const el = map.get(targetIndex)?.outer ?? null
    if (el === dropTargetElRef.current) return
    dropTargetElRef.current?.removeAttribute('data-drop-target')
    el?.setAttribute('data-drop-target', 'true')
    dropTargetElRef.current = el
  }, [])

  const applyRowShift = useCallback(
    (group: DragGroup, targetIndex: number) => {
      const prevTarget = prevTargetIndexRef.current
      const prevGap = prevTarget === null ? null : toInsertIndex(group.grabbed, prevTarget)
      if (prevGap === null) rowCacheRef.current = null // full pass: the row map may have been rebuilt
      const { prefix, free } = rowCache(group)
      const gap = toInsertIndex(group.grabbed, targetIndex)
      const map = rowIndexMapRef.current

      const slot = placeholderSlot(group, gap, free, prefix)
      const anchor = slot ? map.get(slot.anchorIndex)?.outer : undefined
      if (slot && anchor) {
        const r = anchor.getBoundingClientRect()
        positionPlaceholder(anchor, {
          top: r.top + slot.offsetFromAnchorTop(r.height),
          height: slot.height,
        })
      } else positionPlaceholder(null, { top: 0, height: 0 })

      const range = affectedRange(prevGap, gap)
      const write = (idx: number, inner: HTMLElement) => {
        if (group.indexSet.has(idx)) return // hidden (or mid-fold): never shifted, never touched
        const shift = shiftFor(group, gap, idx, prefix)
        writeShift(inner, shift ? `translateY(${shift}px)` : '', false)
      }
      if (!range) for (const [idx, { inner }] of map) write(idx, inner)
      else
        for (let idx = range.min; idx <= range.max; idx++) {
          const e = map.get(idx)
          if (e) write(idx, e.inner)
        }
      markDropTarget(map, targetIndex)
      prevTargetIndexRef.current = targetIndex
    },
    [rowCache, rowIndexMapRef, positionPlaceholder, writeShift, markDropTarget],
  )

  const applyColumnShift = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      const width = draggedSizeRef.current.width
      const prevTarget = prevTargetIndexRef.current
      const needsFullPass = prevTarget === null
      const rangeMin = needsFullPass
        ? -Infinity
        : Math.min(prevTarget!, targetIndex, sourceIndex) - 1
      const rangeMax = needsFullPass
        ? Infinity
        : Math.max(prevTarget!, targetIndex, sourceIndex) + 1
      const map = colIndexMapRef.current

      const targetEl = map.get(targetIndex)?.outer ?? null
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect()
        const forward = sourceIndex < targetIndex
        positionPlaceholder(targetEl, {
          left: forward ? rect.left + rect.width - width : rect.left,
          width,
        })
      } else positionPlaceholder(null, { left: 0, width: 0 })

      const shiftOf = (idx: number) => {
        if (idx > sourceIndex && idx <= targetIndex) return `translateX(-${width}px)`
        if (idx < sourceIndex && idx >= targetIndex) return `translateX(${width}px)`
        return ''
      }
      const writeHeader = (idx: number, inner: HTMLElement) =>
        writeShift(inner, shiftOf(idx), idx === sourceIndex)
      if (needsFullPass) for (const [idx, { inner }] of map) writeHeader(idx, inner)
      else
        for (let idx = rangeMin; idx <= rangeMax; idx++) {
          const e = map.get(idx)
          if (e) writeHeader(idx, e.inner)
        }
      markDropTarget(map, targetIndex)

      // body cells of every row, with a cache to skip redundant writes
      const cellMap = cellIndexMapRef.current
      const cache = cellShiftCacheRef.current
      const writeCells = (idx: number, cells: HTMLElement[]) => {
        const shift = shiftOf(idx)
        for (const cell of cells) {
          if (cache.get(cell) === shift) continue
          const touched = cellStyleBeforeDragRef.current
          if (!touched.has(cell))
            touched.set(cell, {
              transform: cell.style.transform,
              transition: cell.style.transition,
            })
          cell.style.transform = shift
          if (needsFullPass)
            cell.style.transition = prefersReducedMotion() ? 'none' : TRANSITION_STYLE
          cache.set(cell, shift)
        }
      }
      if (needsFullPass) for (const [idx, cells] of cellMap) writeCells(idx, cells)
      else
        for (let idx = rangeMin; idx <= rangeMax; idx++) {
          const cells = cellMap.get(idx)
          if (cells) writeCells(idx, cells)
        }
      prevTargetIndexRef.current = targetIndex
    },
    [colIndexMapRef, cellIndexMapRef, positionPlaceholder, writeShift, markDropTarget],
  )

  const applyShiftTransforms = useCallback(
    (targetIndex: number | null, dtype: DragType | null) => {
      const group = groupRef.current
      if (targetIndex === null || !group) return
      if (dtype === 'row') applyRowShift(group, targetIndex)
      else if (dtype === 'column') applyColumnShift(group.grabbed, targetIndex)
    },
    [groupRef, applyRowShift, applyColumnShift],
  )

  const clearShiftTransforms = useCallback(() => {
    const ph = refs.placeholderRef?.current
    if (ph) ph.style.display = 'none'

    // Reset instantly with `transition: none` (it beats any stylesheet transition), then a frame
    // later put back the transition each element ends on: '' for rows and headers, the
    // consumer's own for body cells. A drop settle animation that starts right after this sets
    // its own transition, so the frame leaves it alone.
    const reset: Array<[HTMLElement, string]> = []
    for (const inner of shiftedElementsRef.current) {
      inner.style.transition = 'none'
      inner.style.transform = ''
      reset.push([inner, ''])
    }
    shiftedElementsRef.current.clear()
    for (const [cell, before] of cellStyleBeforeDragRef.current) {
      cell.style.transition = 'none'
      cell.style.transform = before.transform
      reset.push([cell, before.transition])
    }
    cellStyleBeforeDragRef.current.clear()
    cellShiftCacheRef.current.clear()
    if (reset.length && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        for (const [el, transition] of reset)
          if (el.style.transition === 'none') el.style.transition = transition
      })
    }
    dropTargetElRef.current?.removeAttribute('data-drop-target')
    dropTargetElRef.current = null
    rowCacheRef.current = null
    prevTargetIndexRef.current = null
  }, [refs.placeholderRef])

  return useMemo(
    () => ({ applyShiftTransforms, clearShiftTransforms, prevTargetIndexRef, draggedSizeRef }),
    [applyShiftTransforms, clearShiftTransforms],
  )
}

export default useShiftTransforms
