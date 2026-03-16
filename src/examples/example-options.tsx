/**
 * Example: Table options — drag ranges, locked first/last rows & columns.
 * Demonstrates columnDragRange and rowDragRange options.
 */
import React, { useCallback, useState, useMemo } from 'react'
import { TableContainer, TableHeader, ColumnCell, TableBody, BodyRow, RowCell } from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 120 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 120 },
  { id: 'location', title: 'Location', width: 120 },
  { id: 'salary', title: 'Salary', width: 90 },
  { id: 'score', title: 'Score', width: 80 },
]

const LOCKED_COLS = 1
const LOCKED_ROWS_START = 2
const LOCKED_ROWS_END = 5

const thBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 700,
  borderBottom: '2px solid #3b2d6e',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}
const thLocked: React.CSSProperties = { ...thBase, background: '#1a1230', color: '#a78bfa' }
const thNormal: React.CSSProperties = { ...thBase, background: '#141020', color: '#c4b5fd' }

const tdBase: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 13,
  borderBottom: '1px solid #1e1836',
  display: 'flex',
  alignItems: 'center',
}
const tdLocked: React.CSSProperties = {
  ...tdBase,
  background: '#140f26',
  color: '#a78bfa',
  fontStyle: 'italic',
}
const tdNormal: React.CSSProperties = { ...tdBase, background: '#110e1c', color: '#d4d0e8' }

const OptionsExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)

  const options = useMemo(
    () => ({
      columnDragRange: { start: LOCKED_COLS },
      rowDragRange: { start: LOCKED_ROWS_START, end: data.length - LOCKED_ROWS_END },
    }),
    [data.length],
  )

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.sourceIndex === r.targetIndex) return
    if (r.dragType === 'row') setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
    else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  const isRowLocked = (i: number) => i < LOCKED_ROWS_START || i >= data.length - LOCKED_ROWS_END
  const isColLocked = (i: number) => i < LOCKED_COLS

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 4px', color: '#e4e4e7', fontSize: 14 }}>Options — Drag Ranges</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8b8b94' }}>
        First {LOCKED_COLS} col locked | First {LOCKED_ROWS_START} rows &amp; last {LOCKED_ROWS_END}{' '}
        rows locked (italic/purple = locked)
      </p>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1230',
              border: '2px dashed #a78bfa',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#a78bfa',
              fontWeight: 600,
            }}
          >
            Drop here
          </div>
        )}
        style={{ height: 400, border: '1px solid #3b2d6e', borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell
              key={col.id}
              id={col.id}
              index={i}
              width={col.width}
              style={isColLocked(i) ? thLocked : thNormal}
            >
              {isColLocked(i) ? `🔒 ${col.title}` : col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => {
            const locked = isRowLocked(ri)
            return (
              <BodyRow key={row.id} id={row.id} index={ri}>
                {cols.map((col, ci) => (
                  <RowCell
                    key={col.id}
                    index={ci}
                    style={locked || isColLocked(ci) ? tdLocked : tdNormal}
                  >
                    {row[col.id]}
                  </RowCell>
                ))}
              </BodyRow>
            )
          })}
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default OptionsExample
