/**
 * Example: Virtual + multi-select — 10k rows with @tanstack/react-virtual.
 * Click / Ctrl-Cmd+click / Shift+click to select, drag any selected row to move them all.
 * Selected rows that are scrolled out of view still move on drop (ids drive the move).
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
  moveRowsById,
} from '../Components'
import { arrayMove } from './example-data'
import type { DragEndResult } from '../Components'

const COLUMN_DEFS = [
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'company', title: 'Company' },
  { key: 'department', title: 'Department' },
  { key: 'city', title: 'City' },
  { key: 'status', title: 'Status' },
  { key: 'score', title: 'Score' },
]

const STATUSES = ['Active', 'Inactive', 'Pending', 'On Leave', 'Terminated']
const DEPTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Legal', 'Support', 'Product']

type VRow = Record<string, string | number> & { id: string }

function generateData(count: number): VRow[] {
  const rows: VRow[] = new Array(count)
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: `row-${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@company.com`,
      company: `Company ${i % 500}`,
      department: DEPTS[i % DEPTS.length],
      city: `City ${i % 80}`,
      status: STATUSES[i % STATUSES.length],
      score: i % 101,
    }
  }
  return rows
}

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
const tdSelected: React.CSSProperties = { ...tdStyle, background: '#24224a', color: '#ede9fe' }

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#1a1a2e',
  border: '2px dashed #6366f1',
  borderRadius: 4,
  boxSizing: 'border-box',
}

const COL_WIDTH = 150

const VirtualSelectExample = () => {
  const [data, setData] = useState(() => generateData(10_000))
  const [cols, setCols] = useState(() =>
    COLUMN_DEFS.map((def, i) => ({ ...def, id: `col-${i}`, width: COL_WIDTH })),
  )
  const [selected, setSelected] = useState<string[]>([])
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const bodyRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  const handleDragEnd = useCallback((r: DragEndResult) => {
    if (r.dragType === 'row') {
      // ids, not indices: selected rows that are scrolled out of view move too
      setData((prev) => moveRowsById(prev, r.selectedIds!, r.insertIndex!))
      return
    }
    if (r.sourceIndex !== r.targetIndex)
      setCols((prev) => arrayMove(prev, r.sourceIndex, r.targetIndex))
  }, [])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e4e4e7', fontSize: 14 }}>
          Virtual + multi-select — {data.length.toLocaleString()} rows
        </h3>
        <span style={{ fontSize: 12, color: '#a78bfa' }}>{selected.length} selected</span>
        <span style={{ fontSize: 12, color: '#71717a' }}>
          Select rows, scroll some out of view, drag a selected row: they all move.
        </span>
      </div>
      <TableContainer
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => <div style={placeholderStyle} />}
        style={{ height: 420, border: '1px solid #2e2e36', borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} style={{ ...thStyle, width: col.width }}>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody ref={bodyRef}>
          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualItems.map((vRow) => {
              const row = data[vRow.index]
              const isSelected = selectedSet.has(row.id)
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
                    <RowCell key={col.id} index={ci} style={isSelected ? tdSelected : tdStyle}>
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
  )
}

export default VirtualSelectExample
