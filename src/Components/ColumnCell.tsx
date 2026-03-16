import Draggable from './Draggable'
import type { DraggableProps } from './Draggable'
import { useTable } from './TableContainer/useTable'
import React, { useMemo, memo } from 'react'
import type { ReactNode } from 'react'

interface ColumnCellProps {
  children: ReactNode
  width?: number
  style?: React.CSSProperties
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}

const ColumnCell: React.FC<ColumnCellProps> = memo(
  ({ children, width, style, className, ...props }) => {
    const { state } = useTable()

    const colCellWidth = useMemo(
      () => width ?? state.options.defaultSizing,
      [width, state.options.defaultSizing],
    )

    const draggableStyles = useMemo(
      () => ({
        width: `${colCellWidth}px`,
        flex: `${colCellWidth} 0 auto`,
      }),
      [colCellWidth],
    )

    return (
      <Draggable {...(props as DraggableProps)} styles={draggableStyles} type={'column'}>
        <div
          className={`th ${className ?? ''}`}
          data-width={width}
          style={{ width: '100%', ...style }}
        >
          {children}
        </div>
      </Draggable>
    )
  },
)

ColumnCell.displayName = 'ColumnCell'
export default ColumnCell
