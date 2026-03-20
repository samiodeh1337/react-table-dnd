/**
 * Example: Virtual 2D — 10k rows × 100 columns.
 * Uses @tanstack/react-virtual for both row AND column virtualization.
 *
 * Row virtualizer  → vertical scroll, renders only visible rows
 * Column virtualizer → horizontal scroll, renders only visible columns (header + body)
 * Column drag works for visible columns; off-screen columns are replaced by spacers.
 */

import React, { useCallback, useRef, useState, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TableContainer, TableHeader, ColumnCell, TableBody, BodyRow, RowCell } from '../Components'

// ── Config ────────────────────────────────────────────

const ROW_HEIGHT = 36
const COL_WIDTH = 120
const ROW_COUNT = 10_000
const COL_COUNT = 100

// ── Data ──────────────────────────────────────────────

type DataRow = { id: string } & Record<string, string>

const INIT_COLS = Array.from({ length: COL_COUNT }, (_, i) => ({
  id: `col-${i}`,
  key: `c${i}`,
  title: `Col ${i + 1}`,
}))

function generateData(count: number): DataRow[] {
  const rows = new Array<DataRow>(count)
  for (let r = 0; r < count; r++) {
    const row: DataRow = { id: `row-${r}` }
    for (let c = 0; c < COL_COUNT; c++) row[`c${c}`] = `${r}·${c}`
    rows[r] = row
  }
  return rows
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// ── Styles ────────────────────────────────────────────

const thStyle: React.CSSProperties = {
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

const tdStyle: React.CSSProperties = {
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
  // flex: none — prevents cells from stretching in the virtual row flex container
  flex: 'none',
}

// ── Component ─────────────────────────────────────────

const Virtual2DExample = () => {
  const [data, setData] = useState<DataRow[]>(() => generateData(ROW_COUNT))
  const [cols, setCols] = useState(INIT_COLS)
  const bodyRef = useRef<HTMLDivElement>(null)

  const options = useMemo(() => ({ columnDragRange: { start: 0 }, rowDragRange: { start: 0 } }), [])

  const handleDragEnd = useCallback(
    (result: { sourceIndex: number; targetIndex: number; dragType: 'row' | 'column' }) => {
      if (result.sourceIndex === result.targetIndex) return
      if (result.dragType === 'row') {
        setData((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
      } else if (result.dragType === 'column') {
        setCols((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
      }
    },
    [],
  )

  // Row virtualizer — vertical
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 1,
  })

  // Column virtualizer — horizontal, same scroll element
   
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

  // Spacer widths — fill space for off-screen columns
  const leftSpacer = colVirtualItems[0]?.start ?? 0
  const rightSpacer =
    colVirtualItems.length > 0
      ? Math.max(0, totalColWidth - colVirtualItems[colVirtualItems.length - 1].end)
      : totalColWidth

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 12px', color: '#e4e4e7', fontSize: 14 }}>
        Virtual 2D — <span style={{ color: '#818cf8' }}>{data.length.toLocaleString()} rows</span>
        {' × '}
        <span style={{ color: '#34d399' }}>{cols.length} cols</span>
        {'  ·  '}
        <span style={{ color: '#475569', fontWeight: 400, fontSize: 12 }}>
          rendering {rowVirtualItems.length} × {colVirtualItems.length} cells
        </span>
      </h3>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#0c1222',
              border: '2px dashed #6366f1',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#818cf8',
            }}
          >
            Drop here
          </div>
        )}
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
          {/*
            Container sized to total virtual dimensions.
            Rows are absolutely positioned via translateY.
            Width = totalColWidth so horizontal scroll range matches header.
          */}
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
                  {/* Left spacer fills space for off-screen columns on the left */}
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

                  {/* Right spacer fills space for off-screen columns on the right */}
                  {rightSpacer > 0 && (
                    <div style={{ width: rightSpacer, height: ROW_HEIGHT, flexShrink: 0 }} />
                  )}
                </BodyRow>
              )
            })}
          </div>
        </TableBody>
      </TableContainer>
    </div>
  )
}

export default Virtual2DExample
