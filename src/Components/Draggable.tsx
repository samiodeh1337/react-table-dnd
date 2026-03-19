import React, { useMemo, memo, useRef, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTableStore } from './TableContainer/useTable'
import { isIndexOutOfRange } from './utils'
import type { DragType } from '../hooks/types'

export interface DraggableProps {
  children: ReactNode
  id: number | string
  index: number
  type: DragType
  styles: CSSProperties
  disabled?: boolean
}

const Draggable: React.FC<DraggableProps> = memo(({ children, id, index, type, styles = {} }) => {
  const rowDragRange = useTableStore((s) => s.options.rowDragRange)
  const columnDragRange = useTableStore((s) => s.options.columnDragRange)

  const disableDrag = useMemo(
    () =>
      type === 'row'
        ? isIndexOutOfRange(index, rowDragRange.start, rowDragRange.end)
        : isIndexOutOfRange(index, columnDragRange.start, columnDragRange.end),
    [index, columnDragRange.end, columnDragRange.start, rowDragRange.end, rowDragRange.start, type],
  )

  const innerRef = useRef<HTMLDivElement>(null)

  // opacity, zIndex, pointerEvents, and grabbing cursor are applied directly via DOM
  // in useDragContextEvents.beginDrag/finalizeDrop — not through React state.
  // This prevents ALL Draggable instances from re-rendering on drag start/end.
  const draggableInnerStyles: CSSProperties = useMemo(
    () => ({
      cursor: disableDrag ? 'auto' : '-webkit-grab',
      display: 'flex',
    }),
    [disableDrag],
  )

  useEffect(() => {
    if (innerRef.current && innerRef.current.querySelector('[data-drag-handle]')) {
      innerRef.current.style.cursor = 'auto'
    }
  }, [children, disableDrag])

  return (
    <div
      className="draggable"
      data-id={id}
      data-index={index}
      data-type={type}
      data-disabled={disableDrag ? 'true' : 'false'}
      style={styles}
    >
      <div ref={innerRef} style={draggableInnerStyles}>
        {children}
      </div>
    </div>
  )
})

Draggable.displayName = 'Draggable'
export default Draggable
