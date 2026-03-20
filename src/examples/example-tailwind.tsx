/**
 * Example: Tailwind CSS — style with className using utility classes.
 * npm install tailwindcss @tailwindcss/vite
 *
 * Note: This demo uses inline styles that mirror Tailwind classes since
 * Tailwind isn't installed in the docs app. The "View code" shows real
 * Tailwind className usage.
 */
import React, { useCallback, useState, useMemo } from 'react'
import { TableContainer, TableHeader, ColumnCell, TableBody, BodyRow, RowCell } from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

// Inline styles mirroring the Tailwind classes shown in "View code"
const thStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 42,
  padding: '0 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#9ca3af',
  background: '#111827',
  borderBottom: '1px solid #374151',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const tdStyle = (ri: number): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 16px',
  fontSize: 13,
  color: '#d1d5db',
  background: ri % 2 === 0 ? '#111827' : '#1f2937',
  borderBottom: '1px solid #1f2937',
})

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'email', title: 'Email', width: 200 },
]

const TailwindExample = () => {
  const [data, setData] = useState(() => generateRows(60))
  const [cols, setCols] = useState(INIT_COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.sourceIndex === r.targetIndex) return
    if (r.dragType === 'row') setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
    else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <p style={{ margin: '0 0 12px', color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
        Tailwind CSS — use className on every component
      </p>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        style={{
          height: 420,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #374151',
          background: '#111827',
        }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} style={{ ...thStyle, width: col.width }}>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri}>
              {cols.map((col, ci) => (
                <RowCell key={col.id} index={ci} width={col.width} style={tdStyle(ri)}>
                  {row[col.id]}
                </RowCell>
              ))}
            </BodyRow>
          ))}
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default TailwindExample
