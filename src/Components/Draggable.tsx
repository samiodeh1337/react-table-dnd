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
  const draggedID = useTableStore((s) => s.dragged.draggedID)
  const isDraggingState = useTableStore((s) => s.dragged.isDragging)
  const rowDragRange = useTableStore((s) => s.options.rowDragRange)
  const columnDragRange = useTableStore((s) => s.options.columnDragRange)

  const isDragging = useMemo(
    () => String(id) === String(draggedID) && isDraggingState,
    [id, draggedID, isDraggingState],
  )

  const disableDrag = useMemo(
    () =>
      type === 'row'
        ? isIndexOutOfRange(index, rowDragRange.start, rowDragRange.end)
        : isIndexOutOfRange(index, columnDragRange.start, columnDragRange.end),
    [index, columnDragRange.end, columnDragRange.start, rowDragRange.end, rowDragRange.start, type],
  )

  // Detect if this draggable contains a DragHandle — cached once after mount
  const innerRef = useRef<HTMLDivElement>(null)

  // Transform is applied directly via DOM in useDragContextEvents
  const draggableInnerStyles: CSSProperties = useMemo(
    () => ({
      cursor: isDragging ? '-webkit-grabbing' : disableDrag ? 'auto' : '-webkit-grab',
      zIndex: isDragging ? 2 : 1,
      opacity: isDragging ? 0 : 1,
      pointerEvents: isDragging ? 'none' : 'auto',
      display: 'flex',
    }),
    [disableDrag, isDragging],
  )

  useEffect(() => {
    if (innerRef.current && innerRef.current.querySelector('[data-drag-handle]')) {
      innerRef.current.style.cursor = 'auto'
    }
  }, [children, disableDrag, isDragging])

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
