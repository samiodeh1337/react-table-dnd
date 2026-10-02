/**
 * Example: Custom row heights — 100 rows with varying heights, visible cell borders.
 * Multi-select through a locked checkbox column (<SelectHandle>); dragging a ticked row
 * moves every ticked row, each keeping its own height.
 */
import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  SelectHandle,
  moveRowsById,
} from '../Components'
import { generateRows, arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

const INIT_COLS = [
  { id: '_select', title: '', width: 48 },
  { id: 'name', title: 'Name', width: 170 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'department', title: 'Department', width: 140 },
  { id: 'email', title: 'Email', width: 210 },
  { id: 'location', title: 'Location', width: 130 },
]

const ROW_HEIGHTS = [40, 56, 72, 44, 88, 48, 64, 40, 96, 52]

const th: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 44,
  padding: '0 14px',
  fontSize: 11,
  fontWeight: 800,
  color: '#6ee7b7',
  background: '#0d1f17',
  borderBottom: '2px solid #134e33',
  borderRight: '1px solid #1a3a28',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const makeTd = (h: number, isEven: boolean, isLast: boolean): React.CSSProperties => ({
  height: h,
  padding: '8px 14px',
  fontSize: 13,
  color: '#cbd5e1',
  background: isEven ? '#111a14' : '#0d1510',
  borderBottom: '1px solid #1a2e20',
  borderRight: isLast ? 'none' : '1px solid #1a2420',
  display: 'flex',
  alignItems: 'flex-start',
  whiteSpace: 'pre-wrap',
  lineHeight: '1.5',
  overflow: 'hidden',
})

const checkbox: React.CSSProperties = {
  width: 15,
  height: 15,
  margin: 0,
  accentColor: '#22c55e',
  cursor: 'pointer',
}

// header checkbox: checked when every row is selected, indeterminate when only some are
const HeaderCheckbox = ({
  total,
  selected,
  onChange,
}: {
  total: number
  selected: number
  onChange: (all: boolean) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selected > 0 && selected < total
  }, [selected, total])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all rows"
      style={checkbox}
      checked={total > 0 && selected === total}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}

const heightLabel: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  color: '#6ee7b7',
  background: '#064e3b',
  borderRadius: 3,
  padding: '1px 5px',
  marginLeft: 6,
  verticalAlign: 'middle',
}

const CustomRowHeightsExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)
  // the checkbox column is locked in place
  const options = useMemo(() => ({ columnDragRange: { start: 1 }, rowDragRange: {} }), [])
  const [selected, setSelected] = useState<string[]>([])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Stable heights keyed by row id — survives reorder
  const [heightMap] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>()
    generateRows(100).forEach((row, i) => m.set(row.id, ROW_HEIGHTS[i % ROW_HEIGHTS.length]))
    return m
  })

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.dragType === 'row') {
      setData((p) => moveRowsById(p, r.selectedIds!, r.insertIndex!))
      return
    }
    if (r.sourceIndex !== r.targetIndex) setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 4px', color: '#6ee7b7', fontSize: 14 }}>
        Custom Row Heights — {data.length} rows (each row different size)
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b8f7a' }}>
        {selected.length > 0
          ? `${selected.length} selected — drag one of them to move them all`
          : 'Tick rows to select (⇧-click a box for a range), then drag a ticked row'}
      </p>
      <TableContainer
        options={options}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                'repeating-linear-gradient(45deg, #0d2818, #0d2818 4px, #0f1f14 4px, #0f1f14 8px)',
              border: '2px dashed #22c55e',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#22c55e',
              fontWeight: 700,
            }}
          >
            Drop here
          </div>
        )}
        style={{
          height: 420,
          border: '2px solid #134e33',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#0d1510',
        }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell
              key={col.id}
              id={col.id}
              index={i}
              style={{ ...th, width: col.width, ...(i === 0 ? { justifyContent: 'center' } : {}) }}
            >
              {col.id === '_select' ? (
                <HeaderCheckbox
                  total={data.length}
                  selected={selected.length}
                  onChange={(all) => setSelected(all ? data.map((r) => r.id) : [])}
                />
              ) : (
                col.title
              )}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => {
            const h = heightMap.get(row.id) ?? 40
            const isEven = ri % 2 === 0
            const isSelected = selectedSet.has(row.id)
            return (
              <BodyRow key={row.id} id={row.id} index={ri} style={{ minHeight: h }}>
                {cols.map((col, ci) => (
                  <RowCell
                    key={col.id}
                    index={ci}
                    style={{
                      ...makeTd(h, isEven, ci === cols.length - 1),
                      ...(isSelected ? { background: '#0f2a1c', color: '#d1fae5' } : {}),
                      ...(col.id === '_select'
                        ? { justifyContent: 'center', alignItems: 'center', padding: 0 }
                        : {}),
                    }}
                  >
                    {col.id === '_select' ? (
                      // only the handle changes the selection; the checkbox just reflects it
                      <SelectHandle>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          style={{ ...checkbox, pointerEvents: 'none' }}
                          checked={isSelected}
                          readOnly
                          tabIndex={-1}
                        />
                      </SelectHandle>
                    ) : ci === 1 ? (
                      <span>
                        {row[col.id]}
                        <span style={heightLabel}>{h}px</span>
                      </span>
                    ) : (
                      row[col.id]
                    )}
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

export default CustomRowHeightsExample
