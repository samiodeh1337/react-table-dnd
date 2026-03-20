/**
 * Example: Column width modes — demonstrates flex (proportional grow), fixed (strict px),
 * and mixed (some fixed, some flex) with a slider to resize the table container live.
 */
import React, { useCallback, useState, useMemo } from 'react'
import { TableContainer, TableHeader, ColumnCell, TableBody, BodyRow, RowCell } from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

type WidthMode = 'flex' | 'fixed' | 'mixed'

// fixed: true = this column stays strict px in mixed mode
const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160, fixed: true },
  { id: 'role', title: 'Role', width: 120, fixed: false },
  { id: 'status', title: 'Status', width: 100, fixed: true },
  { id: 'email', title: 'Email', width: 200, fixed: false },
  { id: 'department', title: 'Dept', width: 120, fixed: false },
  { id: 'joined', title: 'Joined', width: 100, fixed: true },
]

const TOTAL_COL_WIDTH = INIT_COLS.reduce((s, c) => s + c.width, 0)

const MODE_LABELS: Record<WidthMode, string> = {
  flex: 'Flex — all grow proportionally',
  fixed: 'Fixed — all stay strict px',
  mixed: 'Mixed — Name, Status, Joined fixed · Role, Email, Dept grow',
}

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  background: '#1e1e24',
  borderBottom: '2px solid #2e2e36',
  borderRight: '1px solid #2e2e36',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}

const thFixed: React.CSSProperties = {
  ...th,
  color: '#6366f1',
  background: '#1a1a2e',
}

const td: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 13,
  color: '#cbd5e1',
  background: '#16161c',
  borderBottom: '1px solid #232329',
  borderRight: '1px solid #232329',
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}

const WidthsExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)
  const [containerWidth, setContainerWidth] = useState(700)
  const [mode, setMode] = useState<WidthMode>('flex')

  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.sourceIndex === r.targetIndex) return
    if (r.dragType === 'row') setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
    else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  const isColFixed = (col: (typeof INIT_COLS)[number]) =>
    mode === 'fixed' || (mode === 'mixed' && col.fixed)

  const isOverflow = containerWidth < TOTAL_COL_WIDTH

  return (
    <div style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#94a3b8', width: 90 }}>Width mode</span>
          <div
            style={{ display: 'flex', background: '#1e1e24', borderRadius: 6, padding: 2, gap: 2 }}
          >
            {(['flex', 'fixed', 'mixed'] as WidthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '4px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === m ? (m === 'mixed' ? '#0e7490' : '#6366f1') : 'transparent',
                  color: mode === m ? '#fff' : '#64748b',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#475569' }}>{MODE_LABELS[mode]}</span>
        </div>

        {/* Width slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#94a3b8', width: 90 }}>Table width</span>
          <input
            type="range"
            min={300}
            max={1100}
            value={containerWidth}
            onChange={(e) => setContainerWidth(Number(e.target.value))}
            style={{ flex: 1, maxWidth: 400, accentColor: '#6366f1' }}
          />
          <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#6366f1', minWidth: 60 }}>
            {containerWidth}px
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: isOverflow ? '#2a1215' : '#052e1f',
              color: isOverflow ? '#f87171' : '#34d399',
            }}
          >
            {isOverflow
              ? `scrolls (total = ${TOTAL_COL_WIDTH}px)`
              : `fills (extra = +${containerWidth - TOTAL_COL_WIDTH}px)`}
          </span>
        </div>
      </div>

      {/* Table wrapper — constrained to slider width */}
      <div style={{ width: containerWidth, maxWidth: '100%', transition: 'width 0.1s' }}>
        <TableContainer
          options={options}
          onDragEnd={handleDragEnd}
          style={{ height: 400, border: '1px solid #2e2e36', borderRadius: 8 }}
        >
          <TableHeader>
            {cols.map((col, i) => {
              const fixed = isColFixed(col)
              return (
                <ColumnCell
                  key={col.id}
                  id={col.id}
                  index={i}
                  style={{
                    ...(mode === 'mixed' && fixed ? thFixed : th),
                    width: col.width,
                    ...(fixed ? { flex: `0 0 ${col.width}px` } : {}),
                  }}
                >
                  {col.title}
                </ColumnCell>
              )
            })}
          </TableHeader>
          <TableBody>
            {data.map((row, ri) => (
              <BodyRow key={row.id} id={row.id} index={ri}>
                {cols.map((col, ci) => {
                  const fixed = isColFixed(col)
                  return (
                    <RowCell
                      key={col.id}
                      index={ci}
                      style={fixed ? { ...td, flex: `0 0 ${col.width}px` } : td}
                    >
                      {row[col.id]}
                    </RowCell>
                  )
                })}
              </BodyRow>
            ))}
          </TableBody>
        </TableContainer>
      </div>
    </div>
  )
}

export default WidthsExample
