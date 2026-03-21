// npm install styled-components
import React, { useCallback, useState, useMemo } from 'react'
import styled from 'styled-components'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from 'react-table-dnd'

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

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

// styled() on each component — className goes to the inner element,
// so the clone during drag inherits the styles correctly.

const StyledTable = styled(TableContainer)`
  height: 420px;
  border: 1px solid #1e3a5f;
  border-radius: 10px;
  background: #0c1929;
`

const StyledCol = styled(ColumnCell)`
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #60a5fa;
  border-bottom: 2px solid #1e3a5f;
  background: #0f2440;
`

const StyledRow = styled(BodyRow)``

const StyledCell = styled(RowCell)`
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
  color: #93c5fd;
  background: #0c1929;
  border-bottom: 1px solid #1a2d45;
`

const StyledCellAlt = styled(StyledCell)`
  background: #0a1525;
`

const COLS = [
  { id: 'name', title: 'Name', width: 160 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 110 },
  { id: 'department', title: 'Dept', width: 130 },
  { id: 'location', title: 'City', width: 120 },
  { id: 'score', title: 'Score', width: 90 },
]

export default function StyledCompExample() {
  const [data, setData] = useState(() => generateRows(60))
  const [cols, setCols] = useState(COLS)
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), [])

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  return (
    <StyledTable options={options} onDragEnd={handleDragEnd}>
      <TableHeader>
        {cols.map((col, i) => (
          <StyledCol key={col.id} id={col.id} index={i} style={{ width: col.width }}>
            {col.title}
          </StyledCol>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <StyledRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => {
              const Cell = ri % 2 !== 0 ? StyledCellAlt : StyledCell
              return (
                <Cell key={col.id} index={ci}>
                  {row[col.id]}
                </Cell>
              )
            })}
          </StyledRow>
        ))}
      </TableBody>
    </StyledTable>
  )
}
