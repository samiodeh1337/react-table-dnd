import React, { useMemo, memo, useRef, useEffect, useLayoutEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTableStore } from './TableContainer/useTable'
import { isIndexOutOfRange } from './utils'
import type { DragType } from '../hooks/types'
import { dragShiftState } from '../hooks/dragShiftState'

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

  // Virtual-table safety net: when the virtualizer mounts or re-renders a row,
  // this fires synchronously after React commits, before the browser paints.
  // Reads the cheap dragShiftState singleton — no layout reads, no races.
  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return

    // When drag is inactive, clean up any stale inline styles from a previous drag.
    // Virtual slots persist across drags — without this, recycled slots could retain
    // transforms or opacity:'0' from a finished drag.
    if (!dragShiftState.active) {
      if (inner.style.transform || inner.style.opacity === '0') {
        inner.style.transform = ''
        inner.style.transition = ''
        inner.style.opacity = ''
      }
      return
    }

    if (dragShiftState.dragType !== type) return

    const { sourceIndex: src } = dragShiftState

    // ALWAYS manage opacity, even during auto-scroll:
    // - Non-source slots that inherited opacity:'0' from a recycled source must be restored
    // - New slots showing the source index must be hidden
    if (index !== src && inner.style.opacity === '0') {
      inner.style.opacity = ''
    } else if (index === src && inner.style.opacity !== '0') {
      inner.style.opacity = '0'
    }

    // Skip shift transforms during auto-scroll — positions are stale and will be
    // recomputed when scroll stops. But clear any existing shift so recycled slots
    // don't show transforms from their previous row.
    if (dragShiftState.autoScrolling) {
      if (inner.style.transform) {
        inner.style.transition = 'none'
        inner.style.transform = ''
      }
      return
    }

    const { targetIndex: tgt, height, width } = dragShiftState
    let shift = ''
    if (type === 'row') {
      if (index > src && index <= tgt) shift = `translateY(-${height}px)`
      else if (index < src && index >= tgt) shift = `translateY(${height}px)`
    } else {
      if (index > src && index <= tgt) shift = `translateX(-${width}px)`
      else if (index < src && index >= tgt) shift = `translateX(${width}px)`
    }
    if (inner.style.transform === shift) return
    inner.style.transition = 'none'
    inner.style.transform = shift
  })

  return (
    <div
      ref={outerRef}
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
