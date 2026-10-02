// The selection gestures as pure functions. No DOM, no refs: (selection, press) → next.
//
// A gesture is decided at two moments, because a drag starts on mousedown and the press that
// starts dragging a group must not deselect it:
//   - the PRESS half runs on mousedown (`pressRule`)
//   - the RELEASE half runs on mouseup only if the pointer never moved (`releaseRule`)
// Touch taps use `tapRule`. Rows with a <SelectHandle> use `selectHandlePressRule`.

export interface PressInput {
  id: string
  index: number
  /** Ctrl, Cmd or Alt held. */
  ctrl: boolean
  shift: boolean
  /** No drag can follow this press (e.g. a DragHandle row pressed off its grip), so the whole
   *  click is decided now. */
  clickNow: boolean
}

export interface PressOutcome {
  /** The new selection, or null when the press changes nothing. */
  next: ReadonlySet<string> | null
  /** New anchor for Shift ranges, or undefined to keep the current one. */
  anchor: { index: number; id: string } | undefined
  /** Was the row selected before this press? Needed by the release rule. */
  wasSelected: boolean
  /** Human-readable name of the rule that fired (for docs, tests and debugging). */
  reason: string
}

/** What the release rule needs to remember from the press. */
export interface PressRecord {
  id: string
  index: number
  ctrl: boolean
  shift: boolean
  wasSelected: boolean
  touch: boolean
}

export interface ReleaseOutcome {
  next: ReadonlySet<string> | null
  reason: string
}

/**
 * Mousedown half.
 * `anchorIndex` is the resolved index of the anchor row (the caller resolves the anchor's id
 * against the DOM first); `idsInRange(lo, hi)` returns the ids of mounted, unlocked rows.
 */
export function pressRule(
  selection: ReadonlySet<string>,
  anchorIndex: number | null,
  press: PressInput,
  idsInRange: (lo: number, hi: number) => string[],
): PressOutcome {
  const { id, index, ctrl, shift, clickNow } = press
  const wasSelected = selection.has(id)
  const anchor = { index, id }

  if (shift) {
    const from = anchorIndex ?? index
    const lo = Math.min(from, index)
    const hi = Math.max(from, index)
    const next = new Set(ctrl ? selection : [])
    for (const rid of idsInRange(lo, hi)) next.add(rid)
    return {
      next,
      anchor: undefined,
      wasSelected,
      reason: ctrl ? 'shift+ctrl: add range to selection' : 'shift: select range from anchor',
    }
  }

  if (ctrl) {
    if (!wasSelected) {
      const next = new Set(selection)
      next.add(id)
      return { next, anchor, wasSelected, reason: 'ctrl on unselected: add' }
    }
    if (clickNow) {
      const next = new Set(selection)
      next.delete(id)
      return { next, anchor, wasSelected, reason: 'ctrl on selected (click resolved now): remove' }
    }
    return {
      next: null,
      anchor: undefined,
      wasSelected,
      reason: 'ctrl on selected: wait for release',
    }
  }

  if (clickNow && wasSelected && selection.size === 1) {
    return {
      next: new Set(),
      anchor,
      wasSelected,
      reason: 'plain on the only selected row: unselect',
    }
  }
  if (!wasSelected || clickNow) {
    return {
      next: new Set([id]),
      anchor,
      wasSelected,
      reason: wasSelected
        ? 'plain (click resolved now): select just this row'
        : 'plain on unselected: select just this row',
    }
  }
  return {
    next: null,
    anchor: undefined,
    wasSelected,
    reason: 'plain on selected: keep (group may be dragged)',
  }
}

/** Mouseup half; only when the pointer never moved and the press was a mouse press. */
export function releaseRule(selection: ReadonlySet<string>, press: PressRecord): ReleaseOutcome {
  if (press.touch) return { next: null, reason: 'touch: release rule does not apply' }
  if (!press.ctrl && !press.shift) {
    if (press.wasSelected && selection.size === 1 && selection.has(press.id))
      return { next: new Set(), reason: 'plain release on the only selected row: unselect' }
    if (selection.size !== 1 || !selection.has(press.id))
      return { next: new Set([press.id]), reason: 'plain release: collapse to this row' }
    return { next: null, reason: 'plain release: already exactly this row' }
  }
  if (press.ctrl && !press.shift && press.wasSelected) {
    const next = new Set(selection)
    next.delete(press.id)
    return { next, reason: 'ctrl release on a row that was selected: remove' }
  }
  return { next: null, reason: 'modifier release: nothing more to do' }
}

/** A touch tap toggles the row. */
export function tapRule(selection: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(selection)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** A press on a `<SelectHandle>`: click toggles, Shift adds the range. Always resolved now. */
export function selectHandlePressRule(
  selection: ReadonlySet<string>,
  anchorIndex: number | null,
  id: string,
  index: number,
  shift: boolean,
  idsInRange: (lo: number, hi: number) => string[],
): PressOutcome {
  return pressRule(
    selection,
    anchorIndex,
    { id, index, ctrl: true, shift, clickNow: true },
    idsInRange,
  )
}
