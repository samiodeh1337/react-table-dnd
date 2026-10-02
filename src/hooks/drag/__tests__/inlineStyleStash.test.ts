import { describe, expect, it } from 'vitest'
import { InlineStyleStash } from '../inlineStyleStash'

const el = (style: Record<string, string> = {}) => ({
  style: { cursor: '', opacity: '', pointerEvents: '', touchAction: '', zIndex: '', ...style },
})

describe('InlineStyleStash', () => {
  it('writes the drag values and puts back what was there before', () => {
    const stash = new InlineStyleStash<ReturnType<typeof el>>()
    const row = el({ cursor: '-webkit-grab', opacity: '0.5' })
    stash.set(row, { cursor: '-webkit-grabbing', opacity: '0' })
    expect(row.style).toMatchObject({ cursor: '-webkit-grabbing', opacity: '0' })
    stash.restoreAll()
    expect(row.style).toMatchObject({ cursor: '-webkit-grab', opacity: '0.5' })
  })

  it('keeps the first saved value when a property is written twice', () => {
    const stash = new InlineStyleStash<ReturnType<typeof el>>()
    const table = el({ touchAction: 'pan-y' })
    stash.set(table, { touchAction: 'none' })
    stash.set(table, { touchAction: 'none' }) // a second grab in the same drag
    stash.restoreAll()
    expect(table.style.touchAction).toBe('pan-y')
  })

  it('leaves properties it never wrote alone', () => {
    const stash = new InlineStyleStash<ReturnType<typeof el>>()
    const cell = el({ zIndex: '5' })
    stash.set(cell, { opacity: '0' })
    cell.style.zIndex = '7' // the consumer changed it meanwhile
    stash.restoreAll()
    expect(cell.style).toMatchObject({ opacity: '', zIndex: '7' })
  })

  it('forgets everything after a restore, so a restore without a drag does nothing', () => {
    const stash = new InlineStyleStash<ReturnType<typeof el>>()
    const row = el()
    stash.set(row, { opacity: '0' })
    stash.restoreAll()
    row.style.opacity = '0.3'
    stash.restoreAll()
    expect(row.style.opacity).toBe('0.3')
  })
})
