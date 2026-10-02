// Small DOM lookups the drag hooks share. Nothing here holds state.
import { INTERACTIVE_SELECTOR } from './constants'

export interface FoundDraggable {
  /** The row's / column's outer element: `[data-rtdnd="draggable"]` with data-id / data-index. */
  element: HTMLElement
  /** True when the press landed inside a `<DragHandle>`. */
  foundHandle: boolean
}

/** Walk up from the pressed element to its draggable row/column. Locked rows return null. */
export function findDraggable(target: EventTarget): FoundDraggable | null {
  let el = target as HTMLElement | null
  let foundHandle = false
  while (el) {
    if (el.dataset?.dragHandle === 'true') foundHandle = true
    if (el.dataset?.contextid) return null
    if (el.dataset?.disabled === 'true') return null
    if (el.dataset?.rtdnd === 'draggable') return { element: el, foundHandle }
    el = el.parentNode as HTMLElement | null
  }
  return null
}

/** Controls where a press means "edit text / pick a value", never "drag this row". */
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/** True when the press landed on a text field, select or editable area inside the row (a
 *  `<SelectHandle>`'s own checkbox does not count: the handle owns that press). */
export function isTextEntryTarget(target: EventTarget, row: HTMLElement): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return false
  if (el.closest('[data-select-handle]')) return false
  const hit = el.closest(TEXT_ENTRY_SELECTOR)
  return !!hit && row.contains(hit) && hit !== row
}

/** True when the press landed on a control inside the row (a button, input, link …). */
export function isInteractiveTarget(target: EventTarget, row: HTMLElement): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return false
  if (el.closest('[data-select-handle]')) return false // the handle owns the click
  const hit = el.closest(INTERACTIVE_SELECTOR)
  return !!hit && row.contains(hit) && hit !== row
}

/** The `<SelectHandle>` element the press landed in, if it belongs to this row. */
export function selectHandleOf(target: EventTarget, row: HTMLElement): HTMLElement | null {
  const el = (target as HTMLElement | null)?.closest?.('[data-select-handle]') ?? null
  return el && row.contains(el) ? (el as HTMLElement) : null
}

export const rowHasSelectHandle = (row: HTMLElement): boolean =>
  !!row.querySelector('[data-select-handle]')

/** Mounted rows in DOM order — the only place index ↔ id is known. */
export function mountedRows(body: HTMLElement | null): HTMLElement[] {
  if (!body) return []
  return Array.from(body.querySelectorAll<HTMLElement>('[data-rtdnd="draggable"][data-type="row"]'))
}

/** A selection as an array: mounted rows first in table order, then anything not on screen. */
export function orderIds(ids: ReadonlySet<string>, body: HTMLElement | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const row of mountedRows(body)) {
    const id = row.dataset.id
    if (id !== undefined && ids.has(id) && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  for (const id of ids) if (!seen.has(id)) out.push(id)
  return out
}

/** Ids of mounted, unlocked rows whose index is within [lo, hi]. Used for Shift ranges. */
export function idsInIndexRange(body: HTMLElement | null, lo: number, hi: number): string[] {
  const out: string[] = []
  for (const r of mountedRows(body)) {
    const i = +r.dataset.index!
    if (i >= lo && i <= hi && r.dataset.disabled !== 'true' && r.dataset.id !== undefined)
      out.push(r.dataset.id)
  }
  return out
}

/** Index of the mounted row with this id, or null when it is not on screen. */
export function indexOfRowId(body: HTMLElement | null, id: string): number | null {
  const row = mountedRows(body).find((r) => r.dataset.id === id)
  return row ? +row.dataset.index! : null
}

/** First non-transparent background walking from `first` through the fallbacks. */
export function sampleBackground(candidates: (Element | null | undefined)[]): string | null {
  for (const el of candidates) {
    if (!el) continue
    const c = getComputedStyle(el).backgroundColor
    if (c && c !== 'transparent' && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(c)) return c
  }
  return null
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
