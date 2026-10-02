import Draggable from './Draggable'
import { useTableStore } from './TableContainer/useTable'
import * as React from 'react'
import { useMemo, memo } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

/** Props of `ColumnCell`. Other HTML attributes (`aria-*`, `data-*`, `title`, …) go on the
 *  header cell's `[data-rtdnd="th"]` element. */
export interface ColumnCellProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'id' | 'children' | 'style' | 'className'
> {
  /** Header content. Optional: a checkbox or grip column can have an empty header. */
  children?: ReactNode
  /** Stable column id. */
  id: string | number
  /** The column's position in your columns array. */
  index: number
  style?: React.CSSProperties
  className?: string
  /** This column cannot be picked up. Other columns can still be dropped around it. */
  disabled?: boolean
}

const ColumnCell: React.FC<ColumnCellProps> = memo(
  ({ children, id, index, disabled, style, className, ...rest }) => {
    const defaultSizing = useTableStore((s) => s.options.defaultSizing)

    const { width: styleWidth, flex: styleFlex, ...contentStyle } = style ?? {}

    const colCellWidth = useMemo(() => {
      if (styleWidth === undefined) return defaultSizing
      return typeof styleWidth === 'number'
        ? styleWidth
        : parseFloat(String(styleWidth)) || defaultSizing
    }, [styleWidth, defaultSizing])

    const draggableStyles = useMemo(
      () => ({
        width: `${colCellWidth}px`,
        flex: styleFlex !== undefined ? styleFlex : `${colCellWidth} 0 auto`,
        boxSizing: 'border-box' as const,
      }),
      [colCellWidth, styleFlex],
    )

    return (
      <Draggable id={id} index={index} disabled={disabled} styles={draggableStyles} type="column">
        <div
          {...rest}
          data-rtdnd="th"
          className={className}
          data-width={colCellWidth}
          style={{ width: '100%', ...contentStyle, boxSizing: 'border-box' }}
        >
          {children}
        </div>
      </Draggable>
    )
  },
)

ColumnCell.displayName = 'ColumnCell'
export default ColumnCell
