/**
 * Example: Multi-select — click, Ctrl/Cmd+click, Shift+click to select rows,
 * then drag any selected row to move the whole group.
 * Selection is controlled (selectedIds + onSelectionChange); moveRowsById applies the drop.
 */
import React, { useCallback, useState } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  moveRowsById,
} from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 120 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'location', title: 'Location', width: 120 },
]

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 700,
  background: '#141020',
  color: '#c4b5fd',
  borderBottom: '2px solid #3b2d6e',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const td: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  background: '#110e1c',
  color: '#d4d0e8',
  borderBottom: '1px solid #1e1836',
}
const tdSelected: React.CSSProperties = {
  ...td,
  background: '#241a4a',
  color: '#ede9fe',
}
const tdSelectedFirst = { ...tdSelected, boxShadow: 'inset 3px 0 0 #a78bfa' }

const btn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #3b2d6e',
  background: '#1a1230',
  color: '#c4b5fd',
  cursor: 'pointer',
}

const MultiSelectExample = () => {
  const [data, setData] = useState(() => generateRows(60))
  const [cols, setCols] = useState(INIT_COLS)
  const [selected, setSelected] = useState<string[]>([])

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.dragType === 'column') {
      if (r.sourceIndex !== r.targetIndex)
        setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
      return
    }
    // r.selectedIds holds every row that moved (one id for a plain drag), r.insertIndex the gap
    setData((p) => moveRowsById(p, r.selectedIds!, r.insertIndex!))
  }, [])

  const selectedSet = new Set(selected)

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 4px', color: '#e4e4e7', fontSize: 14 }}>Multi-select rows</h3>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#8b8b94' }}>
        Click to select, <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+click to toggle, <kbd>Shift</kbd>+click for a
        range. Drag any selected row to move the whole group. Tap toggles on touch.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#a78bfa', minWidth: 90 }}>
          {selected.length} selected
        </span>
        <button style={btn} onClick={() => setSelected(data.slice(0, 5).map((r) => r.id))}>
          Select first 5
        </button>
        <button style={btn} onClick={() => setSelected([])} disabled={selected.length === 0}>
          Clear
        </button>
      </div>
      <TableContainer
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1230',
              border: '2px dashed #a78bfa',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
        )}
        style={{ height: 400, border: '1px solid #3b2d6e', borderRadius: 8 }}
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
            const isSelected = selectedSet.has(row.id)
            return (
              <BodyRow key={row.id} id={row.id} index={ri}>
                {cols.map((col, ci) => (
                  <RowCell
                    key={col.id}
                    index={ci}
                    style={isSelected ? (ci === 0 ? tdSelectedFirst : tdSelected) : td}
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

export default MultiSelectExample
