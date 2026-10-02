/**
 * Example: Column width modes — demonstrates flex (proportional grow), fixed (strict px),
 * and mixed (some fixed, some flex) with a slider to resize the table container live.
 */
import React, { useCallback, useState, useMemo } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  moveRowsById,
} from 'react-table-dnd'

const ROLES = ['Engineer', 'Designer', 'PM', 'QA', 'DevOps', 'Analyst', 'Lead', 'Manager']
const STATUSES = ['Active', 'Inactive', 'On Leave', 'Pending', 'Terminated']
const DEPTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Support']
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Paris']
const FIRST = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const LAST = ['Johnson', 'Smith', 'White', 'Brown', 'Davis', 'Lee', 'Kim', 'Miller', 'Chen', 'Park']

function generateRows(count) {
  const rows = new Array(count)
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]
    rows[i] = {
      id: `row-${i}`,
      name: `${first} ${last}`,
      role: ROLES[i % ROLES.length],
      status: STATUSES[i % STATUSES.length],
      email: `${first.toLowerCase()}${i}@company.com`,
      department: DEPTS[i % DEPTS.length],
      location: CITIES[i % CITIES.length],
      salary: `$${40 + (i % 160)}k`,
      joined: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}`,
      score: i % 101,
    }
  }
  return rows
}

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

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
const MODE_LABELS = {
  flex: 'Flex — all grow proportionally',
  fixed: 'Fixed — all stay strict px',
  mixed: 'Mixed — Name, Status, Joined fixed · Role, Email, Dept grow',
}

const th = {
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

const thFixed = {
  ...th,
  color: '#6366f1',
  background: '#1a1a2e',
}

const td = {
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

// selected rows get an inset ring (an outline paints above the cells)

const SELECTED_ROW = { outline: '2px solid #6366f1', outlineOffset: -2 }
const WidthsExample = () => {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)
  const [selected, setSelected] = useState([])
  const [containerWidth, setContainerWidth] = useState(700)
  const [mode, setMode] = useState('flex')
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])
  const handleDragEnd = useCallback((r) => {
    if (r.dragType === 'row') {
      // r.selectedIds = every row that moved (one id for a plain drag), r.insertIndex = the gap
      setData((p) => moveRowsById(p, r.selectedIds, r.insertIndex))
      return
    }
    if (r.sourceIndex !== r.targetIndex) setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex))
  }, [])
  const isColFixed = (col) => mode === 'fixed' || (mode === 'mixed' && col.fixed)
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
            {['flex', 'fixed', 'mixed'].map((m) => (
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
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
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
              <BodyRow key={row.id} id={row.id} index={ri} selectedStyle={SELECTED_ROW}>
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
