import * as React from 'react'
import { useMemo, memo } from 'react'
import { useTableStore } from './TableContainer/useTable'

/** Props of `RowCell`. Other HTML attributes (`aria-*`, `data-*`, `title`, …) go on the cell's
 *  `[data-rtdnd="td"]` element. */
export interface RowCellProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'style' | 'className'
> {
  children?: React.ReactNode
  /** The column's position: the cell takes that column's width. */
  index: number
  style?: React.CSSProperties
  className?: string
}

const RowCell: React.FC<RowCellProps> = memo(({ children, index, style, className, ...rest }) => {
  const widths = useTableStore((s) => s.widths)
  const defaultSizing = useTableStore((s) => s.options.defaultSizing)
  const rowCellWidth = useMemo(() => widths[index] ?? defaultSizing, [widths, index, defaultSizing])

  // a column drag hides and shifts this cell with direct DOM writes (useHiddenElements,
  // useShiftTransforms), so a drag start or end never re-renders it
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
    <div {...rest} data-rtdnd="td" className={className} style={styles} data-col-index={index}>
      {children}
    </div>
  )
})

RowCell.displayName = 'RowCell'
export default RowCell
