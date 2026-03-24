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

  const outerRef = useRef<HTMLDivElement>(null)
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
    if (!innerRef.current || !outerRef.current) return
    const hasDragHandle = !!innerRef.current.querySelector('[data-drag-handle]')
    if (hasDragHandle) {
      innerRef.current.style.cursor = 'auto'
      // With a drag handle, only the handle should block touch — keep outer scrollable
    } else if (!disableDrag) {
      // No drag handle: whole cell is the drag target, block touch-scroll on it
      outerRef.current.style.touchAction = 'none'
    }
  }, [children, disableDrag])

  return (
    <div
      ref={outerRef}
      data-rtdnd="draggable"
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
