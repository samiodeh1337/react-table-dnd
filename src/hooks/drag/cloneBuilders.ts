// Builds the element that follows the pointer. Plain DOM, no React, no hooks.
import type { DragGroup } from '../types'
import { sampleBackground } from './dom'

export interface RowCardOptions {
  showBadge: boolean
  /** Horizontal grab point inside the row, so the badge hugs the cursor. */
  grabX: number
  /** Elements to sample the card colour from, in priority order. */
  colourSources: (Element | null | undefined)[]
}

export interface RowCard {
  /** The clipped scroller around the row (only for a group): keep its scrollLeft in sync. */
  scroller: HTMLElement | null
}

/**
 * Row clone. A single row is a plain copy of the row's content. A group is a compact card:
 * the grabbed row inside a clipped scroller (so the clone itself can overflow), two ghost
 * cards peeking out underneath tinted from the row's background, and a count badge.
 */
export function buildRowCard(
  cloneEl: HTMLElement,
  rowContent: Element,
  group: DragGroup,
  opts: RowCardOptions,
): RowCard {
  if (group.count <= 1) {
    cloneEl.appendChild(rowContent.cloneNode(true))
    return { scroller: null }
  }

  const scroller = document.createElement('div')
  scroller.dataset.rtdnd = 'clone-row-scroller'
  scroller.appendChild(rowContent.cloneNode(true))
  cloneEl.appendChild(scroller)

  cloneEl.style.setProperty('--rtdnd-card-bg', sampleBackground(opts.colourSources) ?? '#fff')

  for (const i of [2, 1]) {
    const ghost = document.createElement('div')
    ghost.dataset.rtdnd = 'drag-stack'
    ghost.style.setProperty('--i', String(i))
    cloneEl.appendChild(ghost)
  }

  if (opts.showBadge) {
    const badge = document.createElement('div')
    badge.dataset.rtdnd = 'drag-count'
    badge.textContent = String(group.count)
    badge.style.left = `${Math.max(16, opts.grabX + 14)}px`
    cloneEl.appendChild(badge)
  }
  cloneEl.dataset.groupSize = String(group.count)
  return { scroller }
}

export interface ColumnStrip {
  /** The scrollable body part of the strip: keep its scrollTop in sync with the body. */
  bodyStrip: HTMLElement
  /** Rows copied so far: a virtual list mounts more while you drag. */
  progress: StripProgress
  /** The column's body cells now in the strip: hide them in the table. */
  cells: HTMLElement[]
}

/** What a column strip already holds, so it can be topped up after rows mount. */
export interface StripProgress {
  rowsEl: HTMLElement
  columnIndex: string
  isVirtual: boolean
  copiedRowIds: Set<string>
}

/**
 * Column clone: the header cell on top of a strip made of that column's cell from every row.
 */
export function buildColumnStrip(
  cloneEl: HTMLElement,
  draggableEl: HTMLElement,
  body: HTMLElement,
  columnIndex: number,
  isVirtual: boolean,
): ColumnStrip {
  const thEl = draggableEl.querySelector('[data-rtdnd="th"]')
  if (thEl) {
    const headerWrapper = document.createElement('div')
    headerWrapper.style.flexShrink = '0'
    headerWrapper.style.order = '-1'
    headerWrapper.appendChild(thEl.cloneNode(true))
    cloneEl.appendChild(headerWrapper)
  }

  const bodyStrip = document.createElement('div')
  bodyStrip.style.flex = '1'

  const rowsEl = document.createElement('div')
  rowsEl.dataset.rtdnd = 'rbody'
  rowsEl.style.height = `${body.scrollHeight}px`
  rowsEl.style.position = 'relative'
  bodyStrip.appendChild(rowsEl)

  if (isVirtual) {
    bodyStrip.style.overflow = 'auto' // lets scrollTop work; scrollbar hidden via style.css
    bodyStrip.style.scrollbarWidth = 'none'
    bodyStrip.dataset.rtdnd = 'clone-body-strip'
  } else {
    bodyStrip.style.overflow = 'hidden'
  }
  cloneEl.appendChild(bodyStrip)

  const progress: StripProgress = {
    rowsEl,
    columnIndex: String(columnIndex),
    isVirtual,
    copiedRowIds: new Set(),
  }
  return { bodyStrip, progress, cells: topUpColumnStrip(progress, body) }
}

/**
 * Copy the column's cell of every mounted row the strip does not have yet. Runs when the drag
 * starts, and again after a scroll mounted new rows. Returns the column's mounted body cells,
 * for the caller to hide (after this copy, so the strip shows them at full opacity).
 */
export function topUpColumnStrip(progress: StripProgress, body: HTMLElement): HTMLElement[] {
  const { rowsEl, columnIndex, isVirtual, copiedRowIds } = progress
  body.querySelectorAll<HTMLElement>('[data-rtdnd="draggable"][data-type="row"]').forEach((row) => {
    const id = row.dataset.id ?? ''
    if (copiedRowIds.has(id)) return
    copiedRowIds.add(id)
    const rowClone = row.cloneNode(true) as HTMLElement
    if (isVirtual) {
      // Virtual rows carry spacer divs next to the cells: keep only the target cell.
      const trEl = rowClone.querySelector('[data-rtdnd="tr"]')
      if (trEl) {
        const targetCell = trEl.querySelector(`[data-col-index="${columnIndex}"]`)
        while (trEl.firstChild) trEl.removeChild(trEl.firstChild)
        if (targetCell) trEl.appendChild(targetCell)
      }
    } else {
      rowClone.querySelectorAll('[data-col-index]').forEach((cell) => {
        if (cell.getAttribute('data-col-index') !== columnIndex) cell.remove()
      })
    }
    rowsEl.appendChild(rowClone)
  })

  return Array.from(body.querySelectorAll<HTMLElement>(`[data-col-index="${columnIndex}"]`))
}
