import React, { useCallback, useState, useMemo } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from 'react-table-dnd'

function generateRows(count) {
  const ROLES = ['Engineer', 'Designer', 'PM', 'QA', 'DevOps', 'Analyst', 'Lead', 'Manager']
  const STATUSES = ['Active', 'Inactive', 'On Leave', 'Pending', 'Terminated']
  const DEPTS = [
    'Engineering',
    'Design',
    'Product',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Support',
  ]
  const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Paris']
  const FIRST = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
  const LAST = [
    'Johnson',
    'Smith',
    'White',
    'Brown',
    'Davis',
    'Lee',
    'Kim',
    'Miller',
    'Chen',
    'Park',
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    email: `${FIRST[i % FIRST.length].toLowerCase()}${i}@company.com`,
    department: DEPTS[i % DEPTS.length],
    location: CITIES[i % CITIES.length],
    salary: `$${40 + (i % 160)}k`,
    joined: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}`,
    score: i % 101,
  }))
}

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// ── CSS (styling.css) ──────────────────────────────────
//
// .my-table        { border-radius: 10px; overflow: hidden;
//                    border: 2px solid #f59e0b44; }
// .my-col          { display: flex; align-items: center; height: 42px;
//                    padding: 0 14px; font-size: 11px; font-weight: 800;
//                    color: #fbbf24; border-bottom: 2px solid #f59e0b44;
//                    text-transform: uppercase; cursor: grab; }
// .my-col:hover    { background: #221f0e; }
// .my-row:hover
//   .my-cell       { background: #1a1810 !important; }
// .my-cell         { display: flex; align-items: center; height: 38px;
//                    padding: 0 14px; font-size: 13px; color: #d6c896;
//                    border-bottom: 1px solid #2a2510; cursor: grab; }
// .my-cell-alt     { background: #111008 !important; }

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'location', title: 'City', width: 120 },
  { id: 'score', title: 'Score', width: 90 },
]

export default function StylingExample() {
  const [data, setData] = useState(() => generateRows(60))
  const [cols, setCols] = useState(INIT_COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      className="my-table"
      style={{ height: 420, background: '#0f0e09' }}
    >
      <TableHeader className="my-header">
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} style={{ width: col.width }} className="my-col">
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri} className="my-row">
            {cols.map((col, ci) => (
              <RowCell
                key={col.id}
                index={ci}
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
  )
}
