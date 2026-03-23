import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  startTransition,
  memo,
  type ReactNode,
} from 'react'

import TableBody from './TableBody'

// ── Style caches ────────────────────────────────────────────────────────────

// Slot WRAPPER style — position only, NO transform.
// transform is written directly to the DOM by the scroll handler so React
// never resets it (React only resets properties present in the JSX style
// object). This lets startTransition lag behind for content while positions
// are always kept in sync with scrollTop.
const _wrapperStyleCache = new Map<number, React.CSSProperties>()
function getWrapperStyle(rowHeight: number): React.CSSProperties {
  let s = _wrapperStyleCache.get(rowHeight)
  if (!s) {
    s = { position: 'absolute', top: 0, left: 0, width: '100%', height: rowHeight }
    _wrapperStyleCache.set(rowHeight, s)
  }
  return s
}

// Content style passed to renderRow — fills the wrapper, no absolute transform.
// Same shape as getWrapperStyle so the user's BodyRow fills the wrapper exactly.
const _contentStyleCache = new Map<number, React.CSSProperties>()
function getContentStyle(rowHeight: number): React.CSSProperties {
  let s = _contentStyleCache.get(rowHeight)
  if (!s) {
    s = { position: 'absolute', top: 0, left: 0, width: '100%', height: rowHeight }
    _contentStyleCache.set(rowHeight, s)
  }
  return s
}

// ── Slot component ──────────────────────────────────────────────────────────

interface VirtualBodyProps {
  rowCount: number
  rowHeight: number
  overscan?: number
  renderRow: (index: number, style: React.CSSProperties) => ReactNode
  style?: React.CSSProperties
  className?: string
}

const POOL_EXTRA = 60

interface SlotProps {
  rowIndex: number
  style: React.CSSProperties
  renderRow: (index: number, style: React.CSSProperties) => ReactNode
  renderVersion: number
}

// Custom comparator: only rowIndex, style (rowHeight change detection), and
// renderVersion (post-drop re-render) matter. renderRow identity is ignored so
// memo bails out on unchanged slots even if the parent recreates the function.
const Slot = memo(
  ({ rowIndex, style, renderRow }: SlotProps) => <>{renderRow(rowIndex, style)}</>,
  (prev, next) =>
    prev.rowIndex === next.rowIndex &&
    prev.style === next.style &&
    prev.renderVersion === next.renderVersion,
)
Slot.displayName = 'VirtualSlot'

// ── VirtualBody ─────────────────────────────────────────────────────────────

const VirtualBody: React.FC<VirtualBodyProps> = ({
  rowCount,
  rowHeight,

  renderRow,
  style,
  className,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const shifterRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const outerDivRef = useRef<HTMLDivElement>(null)

  // One rAF handle for the deduped startTransition render.
  const renderRafRef = useRef<number | null>(null)

  // Container height — managed via direct DOM write to stickyRef.
  const containerHeightRef = useRef(0)

  // ── renderVersion ─────────────────────────────────────────────────────────
  // Bumps when renderRow identity changes (e.g. drop reorders rows) so Slot's
  // custom comparator forces all slots to re-render and pick up new data.
  // Uses React's "adjusting state when a prop changes" render-phase pattern.
  type RenderRowFn = (index: number, style: React.CSSProperties) => ReactNode
  const [prevRenderRow, setPrevRenderRow] = useState<RenderRowFn>(() => renderRow)
  const [renderVersion, setRenderVersion] = useState(0)
  if (prevRenderRow !== renderRow) {
    setPrevRenderRow(() => renderRow)
    setRenderVersion((v) => v + 1)
  }

  // ── Slot pool ──────────────────────────────────────────────────────────────
  const [slotRows, setSlotRows] = useState<number[]>([])

  // Ref mirror — written ONLY by the scroll handler and initPool.
  // Never synced back from React state: startTransition commits lag behind,
  // and a useLayoutEffect that resets this ref would corrupt headRef.
  const slotRowsRef = useRef<number[]>([])

  // Per-slot wrapper DOM elements — their transforms are written directly by
  // the scroll handler, decoupled from the (potentially stale) React state.
  const slotWrapperRefs = useRef<Array<HTMLElement | null>>([])

  const headRef = useRef(0)
  const lastViewStartRef = useRef(0)

  // ── Pool init / resize ─────────────────────────────────────────────────────

  const applyContainerHeight = useCallback((height: number) => {
    if (stickyRef.current) stickyRef.current.style.height = `${height}px`
    containerHeightRef.current = height
  }, [])

  const initPool = useCallback(
    (height: number) => {
      applyContainerHeight(height)
      if (height === 0) return

      const visCount = Math.ceil(height / rowHeight)
      const needed = Math.min(visCount + POOL_EXTRA * 2, rowCount)
      const current = slotRowsRef.current

      if (current.length === needed) return

      if (current.length === 0) {
        const initial = Array.from({ length: needed }, (_, i) => i)
        headRef.current = 0
        lastViewStartRef.current = 0
        slotRowsRef.current = initial
        setSlotRows(initial)
      } else if (needed > current.length) {
        const tailSlot = (headRef.current - 1 + current.length) % current.length
        const tailRow = current[tailSlot]
        const extra = needed - current.length
        const next = current.slice()
        for (let i = 0; i < extra; i++) {
          next.push(Math.min(tailRow + 1 + i, rowCount - 1))
        }
        slotRowsRef.current = next
        setSlotRows(next)
      }
    },
    [applyContainerHeight, rowHeight, rowCount],
  )

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    initPool(el.clientHeight)
    const ro = new ResizeObserver(() => initPool(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [initPool])

  // ── Initialize wrapper transforms on pool init / resize ────────────────────
  // Runs when pool size changes (not on scroll — scroll handler writes directly).
  // Reads slotRowsRef.current (always current) not slotRows (may be stale).
  const prevPoolSizeRef = useRef(0)
  useLayoutEffect(() => {
    const pSize = slotRows.length
    if (pSize === 0 || pSize === prevPoolSizeRef.current) return
    prevPoolSizeRef.current = pSize
    const rows = slotRowsRef.current
    for (let i = 0; i < pSize; i++) {
      const el = slotWrapperRefs.current[i]
      if (el) el.style.transform = `translateY(${rows[i] * rowHeight}px)`
    }
  }, [slotRows.length, rowHeight])

  // ── Scroll handler ─────────────────────────────────────────────────────────

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    const onScroll = () => {
      const top = el.scrollTop

      // 1. Shifter — compensates for scrollTop, zero React.
      if (shifterRef.current) {
        shifterRef.current.style.transform = `translateY(${-top}px)`
      }

      // 2. Slot recycling.
      const rows = slotRowsRef.current
      const pSize = rows.length
      if (pSize === 0) return

      const viewStart = Math.floor(top / rowHeight)
      const delta = viewStart - lastViewStartRef.current
      if (delta === 0) return
      lastViewStartRef.current = viewStart

      const next = rows.slice()
      const absDelta = Math.abs(delta)

      if (absDelta >= pSize) {
        const topRow = Math.max(0, viewStart - POOL_EXTRA)
        for (let i = 0; i < pSize; i++) next[i] = Math.min(topRow + i, rowCount - 1)
        headRef.current = 0
      } else if (delta > 0) {
        for (let i = 0; i < delta; i++) {
          const tailSlot = (headRef.current - 1 + pSize) % pSize
          const newRow = next[tailSlot] + 1
          if (newRow >= rowCount) break
          next[headRef.current] = newRow
          headRef.current = (headRef.current + 1) % pSize
        }
      } else {
        for (let i = 0; i < -delta; i++) {
          const newRow = next[headRef.current] - 1
          if (newRow < 0) break
          headRef.current = (headRef.current - 1 + pSize) % pSize
          next[headRef.current] = newRow
        }
      }

      slotRowsRef.current = next

      // 3. Write slot wrapper transforms directly — positions are always current
      //    even while startTransition's React render is still pending. This
      //    prevents the empty-table that occurs when stale slotRows values
      //    produce off-screen transforms during the deferred render window.
      const wrappers = slotWrapperRefs.current
      for (let i = 0; i < pSize; i++) {
        const w = wrappers[i]
        if (w) w.style.transform = `translateY(${next[i] * rowHeight}px)`
      }

      // 4. Deferred content render — startTransition keeps the main thread free.
      if (renderRafRef.current === null) {
        renderRafRef.current = requestAnimationFrame(() => {
          renderRafRef.current = null
          startTransition(() => setSlotRows(slotRowsRef.current))
        })
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [rowHeight, rowCount])

  // ── Horizontal scroll: measure row content width ──────────────────────────
  // Absolute-positioned slot wrappers don't contribute to parent scroll width.
  // After first render (and on column changes), measure the natural row width
  // and set min-width on the outer container so ibody shows a horizontal scrollbar.
  const measuredWidthRef = useRef(0)
  useLayoutEffect(() => {
    if (!shifterRef.current || !outerDivRef.current) return
    const tr = shifterRef.current.querySelector('.tr') as HTMLElement | null
    if (!tr) return
    const w = tr.scrollWidth
    if (w > 0 && w !== measuredWidthRef.current) {
      measuredWidthRef.current = w
      outerDivRef.current.style.minWidth = `${w}px`
    }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalHeight = rowCount * rowHeight
  const wrapperStyle = getWrapperStyle(rowHeight)
  const contentStyle = getContentStyle(rowHeight)

  return (
    <TableBody ref={bodyRef} style={style} className={className}>
      <div
        ref={outerDivRef}
        style={{ height: totalHeight, minWidth: '100%', position: 'relative' }}
      >
        <div
          ref={stickyRef}
          style={{
            position: 'sticky',
            top: 0,
            // height managed via stickyRef.current.style.height in initPool
            overflow: 'hidden',
            minWidth: '100%',
          }}
        >
          <div ref={shifterRef} style={{ willChange: 'transform' }}>
            {slotRows.map((rowIndex, slotId) => (
              <div
                key={slotId}
                ref={(el) => {
                  slotWrapperRefs.current[slotId] = el
                }}
                style={wrapperStyle}
                // transform is NOT in wrapperStyle — written by scroll handler
                // so React never resets it during startTransition re-renders.
              >
                {rowIndex >= 0 && rowIndex < rowCount ? (
                  <Slot
                    rowIndex={rowIndex}
                    style={contentStyle}
                    renderRow={renderRow}
                    renderVersion={renderVersion}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TableBody>
  )
}

VirtualBody.displayName = 'VirtualBody'
export default VirtualBody
