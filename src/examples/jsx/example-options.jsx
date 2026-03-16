import React, { useCallback, useState, useMemo } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from 'flexitablesort'

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

const LOCKED_COLS = 1
const LOCKED_ROWS_START = 2
const LOCKED_ROWS_END = 5

const INIT_COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 120 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 120 },
  { id: 'location', title: 'Location', width: 120 },
  { id: 'salary', title: 'Salary', width: 90 },
  { id: 'score', title: 'Score', width: 80 },
]

export default function OptionsExample() {
  const [data, setData] = useState(() => generateRows(100))
  const [cols, setCols] = useState(INIT_COLS)

  const options = useMemo(
    () => ({
      columnDragRange: { start: LOCKED_COLS },
      rowDragRange: { start: LOCKED_ROWS_START, end: data.length - LOCKED_ROWS_END },
    }),
    [data.length],
  )

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  const isLocked = (ri) => ri < LOCKED_ROWS_START || ri >= data.length - LOCKED_ROWS_END

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      style={{ height: 400, border: '1px solid #3b2d6e', borderRadius: 8 }}
    >
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell
            key={col.id}
            id={col.id}
            index={i}
            width={col.width}
            style={{
              background: i < LOCKED_COLS ? '#1a1230' : '#141020',
              color: '#a78bfa',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: 12,
            }}
          >
            {i < LOCKED_COLS ? `🔒 ${col.title}` : col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell
                key={col.id}
                index={ci}
                style={{
                  height: 36,
                  padding: '0 12px',
                  fontSize: 13,
                  background: isLocked(ri) ? '#140f26' : '#110e1c',
                  color: isLocked(ri) ? '#a78bfa' : '#d4d0e8',
                  fontStyle: isLocked(ri) ? 'italic' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                }}
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
