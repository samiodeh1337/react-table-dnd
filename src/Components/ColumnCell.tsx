import Draggable from './Draggable'
import type { DraggableProps } from './Draggable'
import { useTableStore } from './TableContainer/useTable'
import React, { useMemo, memo } from 'react'
import type { ReactNode } from 'react'

interface ColumnCellProps {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [propName: string]: any
}

const ColumnCell: React.FC<ColumnCellProps> = memo(({ children, style, className, ...props }) => {
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
    <Draggable {...(props as DraggableProps)} styles={draggableStyles} type={'column'}>
      <div
        data-rtdnd="th"
        className={className}
        data-width={colCellWidth}
        style={{ width: '100%', ...contentStyle, boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </Draggable>
  )
})

ColumnCell.displayName = 'ColumnCell'
export default ColumnCell
