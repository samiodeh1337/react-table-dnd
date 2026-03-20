import React, { useMemo, memo } from 'react'
import { useTableStore } from './TableContainer/useTable'

interface RowCellProps {
  children?: React.ReactNode
  width?: number
  index: number
  style?: React.CSSProperties
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}

const RowCell: React.FC<RowCellProps> = memo(({ children, style, className, ...props }) => {
  const { index } = props
  const widths = useTableStore((s) => s.widths)
  const defaultSizing = useTableStore((s) => s.options.defaultSizing)
  const rowCellWidth = useMemo(() => widths[index] ?? defaultSizing, [widths, index, defaultSizing])

  // opacity is managed via direct DOM in useDragContextEvents.beginDrag/finalizeDrop
  // so RowCell no longer re-renders on column drag start/end.
  const styles = useMemo(
    () => ({
      display: 'inline-flex',
      width: `${rowCellWidth}px`,
      flex: `${rowCellWidth} 0 auto`,
      ...style,
      // Always enforce border-box so user padding doesn't expand the cell
      // beyond the declared width and misalign with the header column.
      boxSizing: 'border-box' as const,
    }),
    [rowCellWidth, style],
  )

  return (
    <div className={`td ${className ?? ''}`} style={styles} data-col-index={index}>
      {children}
    </div>
  )
})

RowCell.displayName = 'RowCell'
export default RowCell
