import React, { useCallback, useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from 'flexitablesort'

function generateData(count) {
  const STATUSES = ['Active', 'Inactive', 'Pending', 'On Leave', 'Terminated']
  const DEPTS = [
    'Engineering',
    'Sales',
    'Marketing',
    'HR',
    'Finance',
    'Legal',
    'Support',
    'Product',
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    email: `user${i}@company.com`,
    phone: `+1-${String(i).padStart(10, '0')}`,
    company: `Company ${i % 500}`,
    jobTitle: `Title ${i % 200}`,
    department: DEPTS[i % DEPTS.length],
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
    category: DEPTS[i % DEPTS.length],
    notes: `Note for row ${i}`,
  }))
}

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const COL_DEFS = [
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'company', title: 'Company' },
  { key: 'jobTitle', title: 'Job Title' },
  { key: 'department', title: 'Department' },
  { key: 'city', title: 'City' },
  { key: 'salary', title: 'Salary' },
  { key: 'status', title: 'Status' },
  { key: 'score', title: 'Score' },
]

export default function VirtualExample() {
  const [data, setData] = useState(() => generateData(100_000))
  const [cols, setCols] = useState(() =>
    COL_DEFS.map((d, i) => ({ ...d, id: `col-${i}`, width: 140 })),
  )
  const bodyRef = useRef(null)

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

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      style={{ height: 420, border: '1px solid #2e2e36', borderRadius: 8 }}
    >
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell
            key={col.id}
            id={col.id}
            index={i}
            width={col.width}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 40,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#94a3b8',
              background: '#1e1e24',
              borderBottom: '2px solid #2e2e36',
            }}
          >
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody ref={bodyRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vRow) => {
            const row = data[vRow.index]
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
                  <RowCell
                    key={col.id}
                    index={ci}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      fontSize: 13,
                      color: '#cbd5e1',
                      background: '#16161c',
                      borderBottom: '1px solid #232329',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {row[col.key]}
                  </RowCell>
                ))}
              </BodyRow>
            )
          })}
        </div>
      </TableBody>
    </TableContainer>
  )
}
