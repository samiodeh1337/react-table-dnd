import { describe, expect, it } from 'vitest'
import { pressRule, releaseRule, selectHandlePressRule, tapRule } from '../selectionRules'

const sel = (...ids: string[]) => new Set(ids)
const sorted = (s: ReadonlySet<string> | null) => (s ? [...s].sort() : null)
// rows 0..9 named r0..r9, none locked
const idsInRange = (lo: number, hi: number) => {
  const out: string[] = []
  for (let i = lo; i <= hi; i++) out.push('r' + i)
  return out
}
const press = (
  id: string,
  index: number,
  o: Partial<{ ctrl: boolean; shift: boolean; clickNow: boolean }> = {},
) => ({
  id,
  index,
  ctrl: o.ctrl ?? false,
  shift: o.shift ?? false,
  clickNow: o.clickNow ?? false,
})

describe('pressRule (mousedown half)', () => {
  it('plain on an unselected row selects just that row and anchors on it', () => {
    const r = pressRule(sel('r1', 'r2'), 1, press('r5', 5), idsInRange)
    expect(sorted(r.next)).toEqual(['r5'])
    expect(r.anchor).toEqual({ index: 5, id: 'r5' })
    expect(r.wasSelected).toBe(false)
  })
  it('plain on a selected row changes nothing at press (the group may be dragged)', () => {
    const r = pressRule(sel('r1', 'r2'), 1, press('r2', 2), idsInRange)
    expect(r.next).toBeNull()
    expect(r.wasSelected).toBe(true)
  })
  it('ctrl on an unselected row adds it', () => {
    const r = pressRule(sel('r1'), 1, press('r4', 4, { ctrl: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r1', 'r4'])
    expect(r.anchor).toEqual({ index: 4, id: 'r4' })
  })
  it('ctrl on a selected row waits for release', () => {
    const r = pressRule(sel('r1', 'r4'), 4, press('r4', 4, { ctrl: true }), idsInRange)
    expect(r.next).toBeNull()
  })
  it('ctrl on a selected row removes it when the click is decided now', () => {
    const r = pressRule(
      sel('r1', 'r4'),
      4,
      press('r4', 4, { ctrl: true, clickNow: true }),
      idsInRange,
    )
    expect(sorted(r.next)).toEqual(['r1'])
  })
  it('shift selects the range from the anchor and keeps the anchor', () => {
    const r = pressRule(sel('r9'), 2, press('r5', 5, { shift: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r2', 'r3', 'r4', 'r5'])
    expect(r.anchor).toBeUndefined()
  })
  it('shift with no anchor ranges from the row itself', () => {
    const r = pressRule(sel(), null, press('r5', 5, { shift: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r5'])
  })
  it('shift ranges upward too', () => {
    const r = pressRule(sel(), 7, press('r5', 5, { shift: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r5', 'r6', 'r7'])
  })
  it('ctrl+shift adds the range to the current selection', () => {
    const r = pressRule(sel('r0'), 2, press('r3', 3, { ctrl: true, shift: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r0', 'r2', 'r3'])
  })
  it('plain, decided now, on the only selected row unselects it', () => {
    const r = pressRule(sel('r3'), 3, press('r3', 3, { clickNow: true }), idsInRange)
    expect(sorted(r.next)).toEqual([])
  })
  it('plain, decided now, on a selected row among others collapses to it', () => {
    const r = pressRule(sel('r1', 'r3'), 3, press('r3', 3, { clickNow: true }), idsInRange)
    expect(sorted(r.next)).toEqual(['r3'])
  })
  it('locked rows are excluded from a range by the range provider', () => {
    const skipR3 = (lo: number, hi: number) => idsInRange(lo, hi).filter((id) => id !== 'r3')
    const r = pressRule(sel(), 2, press('r4', 4, { shift: true }), skipR3)
    expect(sorted(r.next)).toEqual(['r2', 'r4'])
  })
})

describe('releaseRule (mouseup without movement)', () => {
  const rec = (
    id: string,
    index: number,
    o: Partial<{ ctrl: boolean; shift: boolean; wasSelected: boolean; touch: boolean }> = {},
  ) => ({
    id,
    index,
    ctrl: o.ctrl ?? false,
    shift: o.shift ?? false,
    wasSelected: o.wasSelected ?? false,
    touch: o.touch ?? false,
  })
  it('plain release on a row selected among others collapses to it', () => {
    const r = releaseRule(sel('r1', 'r2', 'r3'), rec('r2', 2, { wasSelected: true }))
    expect(sorted(r.next)).toEqual(['r2'])
  })
  it('plain release on the only selected row unselects it', () => {
    const r = releaseRule(sel('r2'), rec('r2', 2, { wasSelected: true }))
    expect(sorted(r.next)).toEqual([])
  })
  it('plain release on a row the press just selected does nothing more', () => {
    // press selected it (wasSelected false), store now holds exactly it
    const r = releaseRule(sel('r2'), rec('r2', 2, { wasSelected: false }))
    expect(r.next).toBeNull()
  })
  it('ctrl release on a row that was selected removes it', () => {
    const r = releaseRule(sel('r1', 'r2'), rec('r2', 2, { ctrl: true, wasSelected: true }))
    expect(sorted(r.next)).toEqual(['r1'])
  })
  it('ctrl release on a row the press just added keeps it', () => {
    const r = releaseRule(sel('r1', 'r2'), rec('r2', 2, { ctrl: true, wasSelected: false }))
    expect(r.next).toBeNull()
  })
  it('shift release does nothing', () => {
    const r = releaseRule(sel('r1', 'r2'), rec('r2', 2, { shift: true, wasSelected: true }))
    expect(r.next).toBeNull()
  })
  it('never applies to touch presses', () => {
    const r = releaseRule(sel('r2'), rec('r2', 2, { wasSelected: true, touch: true }))
    expect(r.next).toBeNull()
  })
})

describe('tapRule and selectHandlePressRule', () => {
  it('tap toggles', () => {
    expect(sorted(tapRule(sel('r1'), 'r2'))).toEqual(['r1', 'r2'])
    expect(sorted(tapRule(sel('r1', 'r2'), 'r2'))).toEqual(['r1'])
  })
  it('select-handle click toggles and is decided now', () => {
    expect(sorted(selectHandlePressRule(sel('r1'), 2, 'r2', 2, false, idsInRange).next)).toEqual([
      'r1',
      'r2',
    ])
    expect(
      sorted(selectHandlePressRule(sel('r1', 'r2'), 2, 'r2', 2, false, idsInRange).next),
    ).toEqual(['r1'])
  })
  it('select-handle shift-click ADDS the range to the ticks', () => {
    const r = selectHandlePressRule(sel('r0'), 2, 'r4', 4, true, idsInRange)
    expect(sorted(r.next)).toEqual(['r0', 'r2', 'r3', 'r4'])
  })
})
