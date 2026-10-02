/**
 * useSelectionGestures — turns presses, releases and taps into selection changes.
 *
 * The decisions live in `drag/selectionRules.ts` (pure). This hook supplies what those rules
 * cannot know: the current store state, the DOM (mounted rows, handles, interactive targets)
 * and the two pieces of memory a gesture needs between mousedown and mouseup: the press record
 * and whether the pointer has moved.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { HookRefs, TableState } from './types'
import { CLICK_MOVE_TOLERANCE } from './drag/constants'
import {
  findDraggable,
  idsInIndexRange,
  indexOfRowId,
  isInteractiveTarget,
  orderIds,
  rowHasSelectHandle,
  selectHandleOf,
  type FoundDraggable,
} from './drag/dom'
import {
  pressRule,
  releaseRule,
  selectHandlePressRule,
  tapRule,
  type PressOutcome,
  type PressRecord,
} from './drag/selectionRules'

export type CommitSelection = (
  ids: string[],
  anchorIndex?: number | null,
  anchorId?: string | null,
) => void

export interface PressResult {
  /** The selection now in effect, or null when the press did not involve the selection. */
  selection: ReadonlySet<string> | null
  /** The press was fully decided now; no drag can follow it. */
  clickNow: boolean
}

interface PressPoint extends PressRecord {
  x: number
  y: number
}

export interface SelectionGestures {
  enabled: () => boolean
  /** Mousedown / long-press on a row. Runs the press half of the rule. */
  press: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    found: FoundDraggable,
    clientX: number,
    clientY: number,
    /** The element actually pressed; defaults to `e.target` (differs after a flushed drop). */
    target?: EventTarget,
  ) => PressResult
  /** Mouseup without a drag: the release half of the rule. */
  release: () => void
  /** Touch tap on a row. */
  tap: (target: EventTarget) => void
  /** Press on empty body space: clears the selection when appropriate. */
  clearOnEmptyPress: (e: React.MouseEvent<HTMLDivElement>) => void
  /** Called with pointer positions during a drag; flips `moved` past the click tolerance. */
  noteMove: (clientX: number, clientY: number) => void
  /** Reset at press; set when a deferred drag activates so the release rule stays off. */
  setMoved: (moved: boolean) => void
  /** Drop the press record (pointercancel, Escape, drag cancel): no release rule will run. */
  forgetPress: () => void
}

const useSelectionGestures = (
  refs: HookRefs,
  selectable: boolean,
  isDragging: boolean,
  getState: (() => TableState) | undefined,
  commitSelection: CommitSelection | undefined,
): SelectionGestures => {
  const pressRef = useRef<PressPoint | null>(null)
  const movedRef = useRef(false)
  const pointerInsideRef = useRef(false)

  const enabled = useCallback(
    () => selectable && !!getState && !!commitSelection,
    [selectable, getState, commitSelection],
  )

  // Apply a rule's outcome: order the ids like the table and hand them to the container.
  const commitOutcome = useCallback(
    (outcome: PressOutcome, id: string): ReadonlySet<string> => {
      const body = refs.bodyRef?.current ?? null
      const cur = getState!().selection.ids
      if (!outcome.next) return cur
      commitSelection!(
        orderIds(outcome.next, body),
        outcome.anchor?.index,
        outcome.anchor === undefined ? undefined : id,
      )
      return outcome.next
    },
    [refs.bodyRef, getState, commitSelection],
  )

  /** Where a Shift range starts: the anchor row's current index, or null when there is none. */
  const resolvedAnchorIndex = useCallback((): number | null => {
    const { anchorId, anchorIndex, ids } = getState!().selection
    if (anchorId !== null) {
      const live = indexOfRowId(refs.bodyRef?.current ?? null, anchorId)
      if (live !== null) return live
      // Not on screen. While the row is still selected, a virtual table scrolled it away and its
      // index still holds. Once it is no longer selected (the selection was cleared or replaced,
      // e.g. when a filter hid it), that index points at some other row: no anchor.
      if (!ids.has(anchorId)) return null
    }
    return anchorIndex
  }, [getState, refs.bodyRef])

  const press = useCallback<SelectionGestures['press']>(
    (e, found, clientX, clientY, target = e.target) => {
      const { element: row, foundHandle } = found
      pressRef.current = null
      if (row.dataset.type !== 'row' || !enabled() || isInteractiveTarget(target, row))
        return { selection: null, clickNow: false }

      const id = row.dataset.id!
      const index = +row.dataset.index!
      const body = refs.bodyRef?.current ?? null
      const idsInRange = (lo: number, hi: number) => idsInIndexRange(body, lo, hi)
      const isTouch = e.type.startsWith('touch')
      const me = e as React.MouseEvent<HTMLDivElement>
      const shift = !isTouch && me.shiftKey
      if (shift) e.preventDefault() // no native text-range selection

      // <SelectHandle> rows: only the handle changes the selection, and it is decided now.
      if (rowHasSelectHandle(row)) {
        if (!selectHandleOf(target, row)) return { selection: null, clickNow: false }
        const outcome = selectHandlePressRule(
          getState!().selection.ids,
          resolvedAnchorIndex(),
          id,
          index,
          shift,
          idsInRange,
        )
        return { selection: commitOutcome(outcome, id), clickNow: true }
      }

      const hasGrip = !!row.querySelector('[data-drag-handle]')
      const clickNow = hasGrip && !foundHandle // off the grip nothing can drag: decide now
      // touch has no modifiers; a touch press that is decided now toggles, like a tap
      const ctrl = isTouch ? clickNow : me.ctrlKey || me.metaKey || me.altKey
      const outcome = pressRule(
        getState!().selection.ids,
        resolvedAnchorIndex(),
        { id, index, ctrl, shift, clickNow },
        idsInRange,
      )
      const selection = commitOutcome(outcome, id)
      if (!clickNow)
        pressRef.current = {
          id,
          index,
          x: clientX,
          y: clientY,
          ctrl,
          shift,
          wasSelected: outcome.wasSelected,
          touch: isTouch,
        }
      return { selection, clickNow }
    },
    [enabled, refs.bodyRef, getState, resolvedAnchorIndex, commitOutcome],
  )

  const release = useCallback(() => {
    const press = pressRef.current
    pressRef.current = null
    if (!press || movedRef.current || !enabled()) return
    const outcome = releaseRule(getState!().selection.ids, press)
    if (outcome.next)
      commitSelection!(orderIds(outcome.next, refs.bodyRef?.current ?? null), press.index, press.id)
  }, [enabled, getState, commitSelection, refs.bodyRef])

  const tap = useCallback(
    (target: EventTarget) => {
      if (!enabled()) return
      const found = findDraggable(target)
      if (!found || found.element.dataset.type !== 'row') return
      const row = found.element
      if (isInteractiveTarget(target, row)) return
      if (rowHasSelectHandle(row) && !selectHandleOf(target, row)) return
      const id = row.dataset.id!
      const next = tapRule(getState!().selection.ids, id)
      commitSelection!(orderIds(next, refs.bodyRef?.current ?? null), +row.dataset.index!, id)
    },
    [enabled, getState, commitSelection, refs.bodyRef],
  )

  const clearOnEmptyPress = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const body = refs.bodyRef?.current
      if (!enabled() || !body) return
      const target = e.target as Element
      if (target.closest?.('[data-rtdnd="draggable"]')) return // a locked row is not empty space
      if (body.querySelector('[data-select-handle]')) return // checkbox-style tables keep their ticks
      if (!body.contains(target)) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      if (getState!().selection.ids.size > 0) commitSelection!([], null, null)
    },
    [enabled, refs.bodyRef, getState, commitSelection],
  )

  const noteMove = useCallback((clientX: number, clientY: number) => {
    if (movedRef.current) return
    const p = pressRef.current
    if (
      !p ||
      Math.abs(clientX - p.x) > CLICK_MOVE_TOLERANCE ||
      Math.abs(clientY - p.y) > CLICK_MOVE_TOLERANCE
    )
      movedRef.current = true
  }, [])

  // Escape with nothing being dragged clears the selection — only when the last press was inside
  // this table, keyboard focus has not left it, and nothing else already handled the key.
  useEffect(() => {
    if (!selectable || !getState || !commitSelection) return
    const tableContains = (t: EventTarget | null) => {
      const tableEl = refs.tableRef?.current
      return !!tableEl && !!t && tableEl.contains(t as Node)
    }
    const onPointerDown = (e: PointerEvent) => {
      pointerInsideRef.current = tableContains(e.target)
    }
    const onFocusIn = (e: FocusEvent) => {
      const tableEl = refs.tableRef?.current
      if (!tableEl || tableContains(e.target)) return
      // A click on plain content inside the table focuses its nearest focusable ancestor (a
      // dialog, a <main tabIndex={-1}>). That ancestor contains the table: focus has not left it.
      if (e.target instanceof Node && e.target.contains(tableEl)) return
      pointerInsideRef.current = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || isDragging || !pointerInsideRef.current)
        return
      if (getState().selection.ids.size > 0) commitSelection([], null, null)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [selectable, getState, commitSelection, isDragging, refs.tableRef])

  const setMoved = useCallback((moved: boolean) => {
    movedRef.current = moved
  }, [])
  const forgetPress = useCallback(() => {
    pressRef.current = null
  }, [])

  return useMemo(
    () => ({ enabled, press, release, tap, clearOnEmptyPress, noteMove, setMoved, forgetPress }),
    [enabled, press, release, tap, clearOnEmptyPress, noteMove, setMoved, forgetPress],
  )
}

export default useSelectionGestures
