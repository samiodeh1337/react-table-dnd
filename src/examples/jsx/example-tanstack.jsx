/**
 * Example: TanStack Table — TanStack Table owns the rows, the filter and the column order;
 * react-table-dnd renders them and drags them. Tick a few rows and drag one to move them all.
 * Type in the search box, drag a row, then clear the search: the rows the filter hid are still
 * where they were.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  columnFilteringFeature,
  columnOrderingFeature,
  createColumnHelper,
  createFilteredRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  SelectHandle,
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

const features = tableFeatures({
  columnOrderingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
})

const helper = createColumnHelper()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('role', { header: 'Role' }),
  helper.accessor('status', { header: 'Status' }),
  helper.accessor('department', { header: 'Dept' }),
  helper.accessor('location', { header: 'Location' }),
])

const COLUMN_IDS = ['name', 'role', 'status', 'department', 'location']
const WIDTHS = {
  name: 160,
  role: 120,
  status: 110,
  department: 130,
  location: 120,
}

const th = {
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

const td = {
  height: 36,
  padding: '0 12px',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  background: '#110e1c',
  color: '#d4d0e8',
  borderBottom: '1px solid #1e1836',
}

const tdSelected = { ...td, background: '#241a4a', color: '#ede9fe' }
const checkCol = { width: 44, flex: '0 0 44px', justifyContent: 'center' }
const checkbox = { accentColor: '#a78bfa', pointerEvents: 'none' } // the handle owns the click
const input = {
  width: 220,
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid #3b2d6e',
  background: '#110e1c',
  color: '#ede9fe',
}

const chip = {
  padding: '4px 10px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #3b2d6e',
  background: '#1a1230',
  color: '#c4b5fd',
  cursor: 'pointer',
}

const chipOff = { ...chip, opacity: 0.4, cursor: 'default' }
const TanStackExample = () => {
  const [data, setData] = useState(() => generateRows(40))
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnOrder, setColumnOrder] = useState(COLUMN_IDS)
  const [selected, setSelected] = useState([]) // the table's selection, not TanStack's
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    globalFilterFn: 'includesString',
    state: { globalFilter, columnOrder },
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
  })
  const rows = table.getRowModel().rows // after the filter: what is on screen
  const search = (value) => {
    setGlobalFilter(value)
    // moveRowsById moves every selected id, rows the filter hides included: clear the selection so
    // a drag only moves rows you can see
    setSelected([])
  }
  const visibleIds = rows.map((row) => row.id)
  const tickedCount = visibleIds.filter((id) => selected.includes(id)).length
  const allTicked = visibleIds.length > 0 && tickedCount === visibleIds.length
  const headerBox = useRef(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = tickedCount > 0 && !allTicked
  }, [tickedCount, allTicked])
  const handleDragEnd = (r) => {
    if (r.dragType === 'column') {
      // column 0 is the checkbox column, so TanStack's columns start at index 1
      const order = table.getAllLeafColumns().map((c) => c.id)
      const [moved] = order.splice(r.sourceIndex - 1, 1)
      order.splice(r.targetIndex - 1, 0, moved)
      table.setColumnOrder(order)
      return
    }
    // insertIndex is a gap between the rows on screen. In the full data, insert in front of the
    // row after that gap (it may be one of the dragged rows; moveRowsById handles that), or right
    // after the last row on screen when the gap is at the end.
    const after = rows[r.insertIndex]?.original.id
    const last = rows[rows.length - 1].original.id
    setData((prev) => {
      const at = after
        ? prev.findIndex((row) => row.id === after)
        : prev.findIndex((row) => row.id === last) + 1
      return moveRowsById(prev, r.selectedIds, at)
    })
  }
  const selectedSet = new Set(selected)
  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 4px', color: '#e4e4e7', fontSize: 14 }}>TanStack Table</h3>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#8b8b94' }}>
        Tick rows and drag one to move them all. Filter, drag, then clear the filter: the rows it
        hid kept their places.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <input
          style={input}
          placeholder="Filter rows…"
          value={globalFilter}
          onChange={(e) => search(e.target.value)}
          aria-label="Filter rows"
        />
        {['Engineer', 'London', 'Pending'].map((word) => (
          <button key={word} style={chip} onClick={() => search(word)}>
            {word}
          </button>
        ))}
        <button
          style={globalFilter ? chip : chipOff}
          onClick={() => search('')}
          disabled={!globalFilter}
        >
          Clear
        </button>
        <span style={{ fontSize: 12, color: '#a78bfa' }}>
          {rows.length} of {data.length} rows · {selected.length} selected
        </span>
      </div>
      <TableContainer
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={handleDragEnd}
        options={{ columnDragRange: { start: 1 } }} // the checkbox column stays first
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
          <ColumnCell id="select" index={0} style={{ ...th, ...checkCol }}>
            <input
              ref={headerBox}
              type="checkbox"
              aria-label="Select all rows shown"
              disabled={rows.length === 0}
              checked={allTicked}
              onChange={() => setSelected(allTicked ? [] : visibleIds)}
              style={{ accentColor: '#a78bfa' }}
            />
          </ColumnCell>
          {table.getHeaderGroups()[0].headers.map((header, i) => (
            <ColumnCell
              key={header.id}
              id={header.column.id}
              index={i + 1}
              style={{ ...th, width: WIDTHS[header.column.id] }}
            >
              <table.FlexRender header={header} />
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <p style={{ margin: 0, padding: 16, fontSize: 13, color: '#8b8b94' }}>No rows match.</p>
          )}
          {rows.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri}>
              <RowCell
                index={0}
                style={{ ...(selectedSet.has(row.id) ? tdSelected : td), ...checkCol }}
              >
                <SelectHandle>
                  <input
                    type="checkbox"
                    readOnly
                    checked={selectedSet.has(row.id)}
                    aria-label={`Select ${row.original.name}`}
                    style={checkbox}
                  />
                </SelectHandle>
              </RowCell>
              {row.getAllCells().map((cell, ci) => (
                <RowCell
                  key={cell.id}
                  index={ci + 1}
                  style={selectedSet.has(row.id) ? tdSelected : td}
                >
                  <table.FlexRender cell={cell} />
                </RowCell>
              ))}
            </BodyRow>
          ))}
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default TanStackExample
