/**
 * Example: Virtual table — 10k rows, 20 columns, fixed column widths
 * Uses @tanstack/react-virtual for row virtualization.
 * Demonstrates multi-drag with ctrl+click / shift+click selection.
 */

import React, { useCallback, useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  useMultiSelect,
} from '../Components'
import type { DragEndResult } from '../Components'

// ── Data ──────────────────────────────────────────────

const COLUMN_DEFS = [
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Phone' },
  { key: 'company', title: 'Company' },
  { key: 'jobTitle', title: 'Job Title' },
  { key: 'department', title: 'Department' },
  { key: 'city', title: 'City' },
  { key: 'state', title: 'State' },
  { key: 'country', title: 'Country' },
  { key: 'zipCode', title: 'Zip Code' },
  { key: 'address', title: 'Address' },
  { key: 'age', title: 'Age' },
  { key: 'salary', title: 'Salary' },
  { key: 'startDate', title: 'Start Date' },
  { key: 'status', title: 'Status' },
  { key: 'score', title: 'Score' },
  { key: 'rating', title: 'Rating' },
  { key: 'category', title: 'Category' },
  { key: 'notes', title: 'Notes' },
]

const STATUSES = ['Active', 'Inactive', 'Pending', 'On Leave', 'Terminated']
const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'HR',
  'Finance',
  'Legal',
  'Support',
  'Product',
]

function generateData(count: number) {
  const rows = new Array(count)
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: `row-${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@company.com`,
      phone: `+1-${String(i).padStart(10, '0')}`,
      company: `Company ${i % 500}`,
      jobTitle: `Title ${i % 200}`,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      city: `City ${i % 80}`,
      state: `State ${i % 50}`,
      country: `Country ${i % 30}`,
      zipCode: String(10000 + (i % 90000)),
      address: `${i} Main St`,
      age: 18 + (i % 62),
      salary: `$${(30 + (i % 170)) * 1000}`,
      startDate: `2020-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      status: STATUSES[i % STATUSES.length],
      score: i % 101,
      rating: ((i % 50) / 10 + 0.5).toFixed(1),
      category: DEPARTMENTS[i % DEPARTMENTS.length],
      notes: `Note for row ${i}`,
    }
  }
  return rows
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

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

// ── Styles ────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 40,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 600,
  color: '#94a3b8',
  background: '#1e1e24',
  borderBottom: '2px solid #2e2e36',
  borderRight: '1px solid #2a2a32',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const tdStyle: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  fontSize: 13,
  color: '#cbd5e1',
  background: '#16161c',
  borderBottom: '1px solid #232329',
  borderRight: '1px solid #232329',
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const selectedTdStyle: React.CSSProperties = {
  ...tdStyle,
  background: '#1a1a2e',
}

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#1a1a2e',
  border: '2px dashed #6366f1',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: '#818cf8',
  fontWeight: 500,
}

// ── Component ─────────────────────────────────────────

const COL_WIDTH = 140

const VirtualExample = () => {
  const [data, setData] = useState(() => generateData(10_000))
  const [cols, setCols] = useState(() =>
    COLUMN_DEFS.map((def, i) => ({ ...def, id: `col-${i}`, width: COL_WIDTH })),
  )
  const bodyRef = useRef<HTMLDivElement>(null)

  const { selectedIndices, isSelected, onRowClick, clearSelection } = useMultiSelect(data.length)

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  const options = useMemo(
    () => ({
      columnDragRange: { start: 0 },
      rowDragRange: { start: 0 },
    }),
    [],
  )

  const handleDragEnd = useCallback(
    (result: DragEndResult) => {
      if (result.sourceIndex === result.targetIndex) return
      if (result.dragType === 'row') {
        if (result.sourceIndices && result.sourceIndices.length > 1) {
          // Multi-drag
          setData((prev) => arrayMoveMulti(prev, result.sourceIndices!, result.targetIndex))
          clearSelection()
        } else {
          setData((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
        }
      } else {
        setCols((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
      }
    },
    [clearSelection],
  )

  const handleTableClick = useCallback(
    (e: React.MouseEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return
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

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 8px', color: '#e4e4e7', fontSize: 14 }}>
        Virtual — {data.length.toLocaleString()} rows x {cols.length} cols
      </h3>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {selectedIndices.length > 0
            ? `${selectedIndices.length} row${selectedIndices.length > 1 ? 's' : ''} selected`
            : 'Ctrl+click or Shift+click to select rows for multi-drag'}
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
          renderPlaceholder={() => <div style={placeholderStyle}>Drop here</div>}
          style={{ height: 420, border: '1px solid #2e2e36', borderRadius: 8 }}
        >
          <TableHeader>
            {cols.map((col, i) => (
              <ColumnCell
                key={col.id}
                id={col.id}
                index={i}
                style={{ ...thStyle, width: col.width }}
              >
                {col.title}
              </ColumnCell>
            ))}
          </TableHeader>
          <TableBody ref={bodyRef}>
            <div
              style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}
            >
              {virtualItems.map((vRow) => {
                const row = data[vRow.index]
                const selected = isSelected(vRow.index)
                const cellStyle = selected ? selectedTdStyle : tdStyle
                return (
                  <BodyRow
                    key={row.id}
                    id={row.id}
                    index={vRow.index}
                    styles={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vRow.start}px)`,
                      height: `${vRow.size}px`,
                    }}
                  >
                    {cols.map((col, ci) => (
                      <RowCell key={col.id} index={ci} style={cellStyle}>
                        {row[col.key]}
                      </RowCell>
                    ))}
                  </BodyRow>
                )
              })}
            </div>
          </TableBody>
        </TableContainer>
      </div>
    </div>
  )
}

export default VirtualExample
