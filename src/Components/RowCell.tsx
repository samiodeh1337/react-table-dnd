import React, { useMemo, memo } from 'react'
import { useTableStore } from './TableContainer/useTable'

interface RowCellProps {
  children?: React.ReactNode
  width?: number
  index: number
  isClone?: true
  style?: React.CSSProperties
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}

const RowCell: React.FC<RowCellProps> = memo(
  ({ children, style, className, isClone, ...props }) => {
    const { index } = props
    const columnIds = useTableStore((s) => s.columnIds)
    const widths = useTableStore((s) => s.widths)
    const defaultSizing = useTableStore((s) => s.options.defaultSizing)
    const draggedID = useTableStore((s) => s.dragged.draggedID)

    const columnId = useMemo(() => columnIds[index] ?? '', [columnIds, index])
    const rowCellWidth = useMemo(
      () => widths[index] ?? defaultSizing,
      [widths, index, defaultSizing],
    )

    const isDragging = useMemo(
      () => (isClone ? false : columnId === draggedID),
      [isClone, columnId, draggedID],
    )

    const styles = useMemo(
      () => ({
        display: 'inline-flex',
        opacity: isDragging ? 0 : 1,
        width: `${rowCellWidth}px`,
        flex: `${rowCellWidth} 0 auto`,
        ...style,
      }),
      [isDragging, rowCellWidth, style],
    )

    return (
      <div className={`td ${className ?? ''}`} style={styles} data-col-index={index}>
        {children}
      </div>
    )
  },
)

RowCell.displayName = 'RowCell'
export default RowCell
