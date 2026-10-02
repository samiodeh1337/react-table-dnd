import React, { useCallback, useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from 'react-table-dnd'

const ROW_HEIGHT = 36
const COL_WIDTH = 120
const ROW_COUNT = 10_000
const COL_COUNT = 100

const INIT_COLS = Array.from({ length: COL_COUNT }, (_, i) => ({
  id: `col-${i}`,
  key: `c${i}`,
  title: `Col ${i + 1}`,
}))

function generateData(count) {
  const rows = new Array(count)
  for (let r = 0; r < count; r++) {
    const row = { id: `row-${r}` }
    for (let c = 0; c < COL_COUNT; c++) row[`c${c}`] = `${r}·${c}`
    rows[r] = row
  }
  return rows
}

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const thStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 38,
  padding: '0 10px',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  background: '#0f172a',
  borderBottom: '2px solid #1e293b',
  borderRight: '1px solid #1e293b',
  whiteSpace: 'nowrap',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const tdStyle = {
  height: ROW_HEIGHT,
  padding: '0 10px',
  fontSize: 12,
  color: '#475569',
  background: '#0c1222',
  borderBottom: '1px solid #1a2335',
  borderRight: '1px solid #1a2335',
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  flex: 'none',
}

export default function Virtual2DExample() {
  const [data, setData] = useState(() => generateData(ROW_COUNT))
  const [cols, setCols] = useState(INIT_COLS)
  const bodyRef = useRef(null)

  const options = useMemo(() => ({ columnDragRange: { start: 0 }, rowDragRange: { start: 0 } }), [])

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  const colVirtualizer = useVirtualizer({
    count: cols.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => COL_WIDTH,
    horizontal: true,
    overscan: 1,
  })

  const rowVirtualItems = rowVirtualizer.getVirtualItems()
  const colVirtualItems = colVirtualizer.getVirtualItems()
  const totalRowHeight = rowVirtualizer.getTotalSize()
  const totalColWidth = colVirtualizer.getTotalSize()

  const leftSpacer = colVirtualItems[0]?.start ?? 0
  const rightSpacer =
    colVirtualItems.length > 0
      ? Math.max(0, totalColWidth - colVirtualItems[colVirtualItems.length - 1].end)
      : totalColWidth

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      style={{
        height: 420,
        border: '1px solid #1e293b',
        borderRadius: 8,
        background: '#0c1222',
      }}
    >
      <TableHeader>
        {leftSpacer > 0 && <div style={{ width: leftSpacer, flexShrink: 0 }} />}
        {colVirtualItems.map((vCol) => (
          <ColumnCell
            key={cols[vCol.index].id}
            id={cols[vCol.index].id}
            index={vCol.index}
            style={{ ...thStyle, width: COL_WIDTH }}
          >
            {cols[vCol.index].title}
          </ColumnCell>
        ))}
        {rightSpacer > 0 && <div style={{ width: rightSpacer, flexShrink: 0 }} />}
      </TableHeader>

      <TableBody ref={bodyRef}>
        <div style={{ height: totalRowHeight, width: totalColWidth, position: 'relative' }}>
          {rowVirtualItems.map((vRow) => {
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
                  height: ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                {leftSpacer > 0 && (
                  <div style={{ width: leftSpacer, height: ROW_HEIGHT, flexShrink: 0 }} />
                )}
                {colVirtualItems.map((vCol) => (
                  <RowCell
                    key={vCol.key}
                    index={vCol.index}
                    style={{ ...tdStyle, width: COL_WIDTH }}
                  >
                    {row[cols[vCol.index].key]}
                  </RowCell>
                ))}
                {rightSpacer > 0 && (
                  <div style={{ width: rightSpacer, height: ROW_HEIGHT, flexShrink: 0 }} />
                )}
              </BodyRow>
            )
          })}
        </div>
      </TableBody>
    </TableContainer>
  )
}
