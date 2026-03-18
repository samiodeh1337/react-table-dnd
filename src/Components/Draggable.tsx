import React, { useMemo, memo, useRef, useEffect } from 'react'
import type { ReactElement, CSSProperties, ReactNode } from 'react'
import { useTableStore, useTableDispatch } from './TableContainer/useTable'
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
  const dispatch = useTableDispatch()

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
  const hasHandleRef = useRef(false)

  useEffect(() => {
    hasHandleRef.current = !!innerRef.current?.querySelector('[data-drag-handle]')
  }, [children])

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

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Skip real touch events — touch drag clone is set via long-press in beginDrag
    if (event.pointerType === 'touch') return
    if (disableDrag) return

    // Synthetic pointerdown from mobile long-press (pointerType: 'mouse' but isTrusted: false)
    // Always allow clone creation — the long-press already validated the drag intent
    const isSyntheticFromTouch = !event.isTrusted

    // If this draggable has a DragHandle and it's a real mouse click,
    // only set clone if the click originated from the handle
    if (hasHandleRef.current && !isSyntheticFromTouch) {
      const target = event.target as HTMLElement
      if (!target.closest('[data-drag-handle]')) return
    }

    dispatch({
      type: 'setClone',
      value: React.cloneElement(children as ReactElement),
    })
  }

  return (
    <div
      className="draggable"
      data-id={id}
      data-index={index}
      data-type={type}
      onPointerDown={onPointerDown}
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
