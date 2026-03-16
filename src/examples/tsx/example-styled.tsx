/**
 * Example: Fully custom-styled table — dark theme, rounded rows, colored status badges.
 * Shows that every visual aspect is consumer-controlled.
 */
import React, { useCallback, useState, useMemo } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  type DragEndResult,
} from 'flexitablesort'
import { generateRows, arrayMove, Row } from './helpers'

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 170 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 120 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'location', title: 'Location', width: 120 },
  { id: 'score', title: 'Score', width: 90 },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#064e3b', color: '#6ee7b7' },
  Inactive: { bg: '#7f1d1d', color: '#fca5a5' },
  'On Leave': { bg: '#78350f', color: '#fcd34d' },
  Pending: { bg: '#1e3a5f', color: '#93c5fd' },
  Terminated: { bg: '#4c1d95', color: '#c4b5fd' },
}

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 44,
  padding: '0 16px',
  fontSize: 11,
  fontWeight: 700,
  color: '#9ca3af',
  background: '#111827',
  borderBottom: '1px solid #374151',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td: React.CSSProperties = {
  height: 44,
  padding: '0 16px',
  fontSize: 13,
  color: '#e5e7eb',
  background: '#1f2937',
  borderBottom: '1px solid #374151',
  display: 'flex',
  alignItems: 'center',
}

const tdEven: React.CSSProperties = { ...td, background: '#111827' }

const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_COLORS[status] ?? { bg: '#374151', color: '#9ca3af' }
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
      }}
    >
      {status}
    </span>
  )
}

const ScoreBar = ({ score }: { score: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#374151', overflow: 'hidden' }}>
      <div
        style={{
          width: `${score}%`,
          height: '100%',
          borderRadius: 3,
          background: score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444',
        }}
      />
    </div>
    <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 24 }}>{score}</span>
  </div>
)

const CustomStyledExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.sourceIndex === r.targetIndex) return
    if (r.dragType === 'row') setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
    else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  const renderCell = (row: Row, colId: string) => {
    if (colId === 'status') return <StatusBadge status={row.status} />
    if (colId === 'score') return <ScoreBar score={row.score} />
    return row[colId]
  }

  return (
    <div style={{ width: '100%', background: '#0f172a', borderRadius: 12, padding: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
        Dark Theme — {data.length} rows
      </h3>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#1e293b',
              border: '2px dashed #6366f1',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#818cf8',
              fontWeight: 600,
            }}
          >
            Drop here
          </div>
        )}
        style={{ height: 420, border: '1px solid #374151', borderRadius: 8, overflow: 'hidden' }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={th}>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri}>
              {cols.map((col, ci) => (
                <RowCell key={col.id} index={ci} style={ri % 2 === 0 ? td : tdEven}>
                  {renderCell(row, col.id)}
                </RowCell>
              ))}
            </BodyRow>
          ))}
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default CustomStyledExample
