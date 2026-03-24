/**
 * Example: Multi-select drag — normal (non-virtual) table.
 * Ctrl+click / Shift+click to select rows, then drag to reorder them all at once.
 */
import React, { useCallback, useState, useMemo } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  useMultiSelect,
} from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

function arrayMoveMulti<T>(arr: T[], fromIndices: number[], toIndex: number): T[] {
  const sortedFrom = [...fromIndices].sort((a, b) => a - b)
  const fromSet = new Set(sortedFrom)
  const items = sortedFrom.map((i) => arr[i])
  const rest: T[] = []

  let holesBefore = 0
  for (const idx of sortedFrom) {
    if (idx < toIndex) holesBefore++
  }
  const insertAt = toIndex - holesBefore

  for (let i = 0; i < arr.length; i++) {
    if (!fromSet.has(i)) rest.push(arr[i])
  }
  rest.splice(insertAt, 0, ...items)
  return rest
}

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 120 },
  { id: 'status', title: 'Status', width: 100 },
  { id: 'email', title: 'Email', width: 200 },
  { id: 'department', title: 'Dept', width: 120 },
  { id: 'joined', title: 'Joined', width: 100 },
]

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#94a3b8',
  background: '#1e1e24',
  borderBottom: '2px solid #2e2e36',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const td: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 13,
  color: '#cbd5e1',
  background: '#16161c',
  borderBottom: '1px solid #232329',
  display: 'flex',
  alignItems: 'center',
}

const selectedTd: React.CSSProperties = {
  ...td,
  background: '#1a1a2e',
}

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'repeating-linear-gradient(45deg,#1e1e2a,#1e1e2a 5px,#24242e 5px,#24242e 10px)',
  borderRadius: 4,
}

const MultiSelectExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const { selectedIndices, isSelected, onRowClick, clearSelection } = useMultiSelect(data.length)

  const handleDragEnd = useCallback(
    (r: DragEndResult) => {
      if (r.sourceIndex === r.targetIndex) return
      if (r.dragType === 'row') {
        if (r.sourceIndices && r.sourceIndices.length > 1) {
          setData((p) => arrayMoveMulti(p, r.sourceIndices!, r.targetIndex))
          clearSelection()
        } else {
          setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
        }
      } else {
        setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
      }
    },
    [clearSelection],
  )

  const handleTableClick = useCallback(
    (e: React.MouseEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return
      // Walk up to find the row element
      let el = e.target as HTMLElement | null
      while (el) {
        if (el.dataset?.type === 'row' && el.dataset?.index !== undefined) {
          onRowClick(+el.dataset.index, e)
          return
        }
        el = el.parentElement
      }
    },
    [onRowClick],
  )

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 8px', color: '#e4e4e7', fontSize: 14 }}>
        Multi-Select — {data.length} rows
      </h3>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {selectedIndices.length > 0
            ? `${selectedIndices.length} row${selectedIndices.length > 1 ? 's' : ''} selected`
            : 'Ctrl+click or Shift+click to select, then drag'}
        </span>
        {selectedIndices.length > 0 && (
          <button
            onClick={clearSelection}
            style={{
              background: '#2e2e36',
              color: '#94a3b8',
              border: '1px solid #3e3e46',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div onClick={handleTableClick}>
        <TableContainer
          options={options}
          onDragEnd={handleDragEnd}
          selectedIndices={selectedIndices}
          renderPlaceholder={() => <div style={placeholderStyle} />}
          style={{ height: 420, border: '1px solid #2e2e36', borderRadius: 8 }}
        >
          <TableHeader>
            {cols.map((col, i) => (
              <ColumnCell key={col.id} id={col.id} index={i} style={{ ...th, width: col.width }}>
                {col.title}
              </ColumnCell>
            ))}
          </TableHeader>
          <TableBody>
            {data.map((row, ri) => {
              const cellStyle = isSelected(ri) ? selectedTd : td
              return (
                <BodyRow key={row.id} id={row.id} index={ri}>
                  {cols.map((col, ci) => (
                    <RowCell key={col.id} index={ci} style={cellStyle}>
                      {row[col.id]}
                    </RowCell>
                  ))}
                </BodyRow>
              )
            })}
          </TableBody>
        </TableContainer>
      </div>
    </div>
  )
}

export default MultiSelectExample
