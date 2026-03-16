/**
 * Example: Style overrides — inline styles and CSS className on every component.
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
import { generateRows, arrayMove } from './helpers'

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'location', title: 'City', width: 120 },
  { id: 'score', title: 'Score', width: 90 },
]

const StylingExample = () => {
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
      {/* Inline <style> injected for className demo */}
      <style>{`
        .my-table   { border-radius: 10px; overflow: hidden; border: 2px solid #f59e0b44; }
        .my-header  { background: #1c1a10; }
        .my-col     { display: flex; align-items: center; height: 42px; padding: 0 14px;
                      font-size: 11px; font-weight: 800; letter-spacing: .06em;
                      text-transform: uppercase; color: #fbbf24;
                      border-bottom: 2px solid #f59e0b44; cursor: grab; }
        .my-col:hover { background: #221f0e; }
        .my-body    {}
        .my-row     { display: flex; }
        .my-row:hover .my-cell { background: #1a1810 !important; }
        .my-cell    { display: flex; align-items: center; height: 38px;
                      padding: 0 14px; font-size: 13px; color: #d6c896;
                      border-bottom: 1px solid #2a2510; cursor: grab; }
        .my-cell-alt { background: #111008 !important; }
      `}</style>

      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px', color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>
          Styling with{' '}
          <code
            style={{
              background: '#1c1a10',
              color: '#fbbf24',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            className
          </code>
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#8b8b94' }}>
          Every component accepts{' '}
          <code
            style={{
              background: '#1c1a10',
              color: '#d6c896',
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            className
          </code>{' '}
          and{' '}
          <code
            style={{
              background: '#1c1a10',
              color: '#d6c896',
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            style
          </code>{' '}
          — full visual control, no overrides needed.
        </p>
      </div>

      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        className="my-table"
        // inline style can coexist with className
        style={{ height: 420, background: '#0f0e09' }}
      >
        <TableHeader className="my-header">
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} width={col.width} className="my-col">
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody className="my-body">
          {data.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri} className="my-row">
              {cols.map((col, ci) => (
                <RowCell
                  key={col.id}
                  index={ci}
                  // mix: base className + conditional alt + inline width
                  className={`my-cell${ri % 2 !== 0 ? ' my-cell-alt' : ''}`}
                  style={{ width: col.width }}
                >
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

export default StylingExample
