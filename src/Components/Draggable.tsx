import * as React from 'react'
import { useMemo, memo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTableStore } from './TableContainer/useTable'
import { isIndexOutOfRange } from './utils'
import type { DragType } from '../hooks/types'
import useIsomorphicLayoutEffect from '../hooks/useIsomorphicLayoutEffect'

/** Internal: BodyRow and ColumnCell render this; it is not part of the public API. */
export interface DraggableProps {
  children: ReactNode
  id: number | string
  index: number
  type: DragType
  styles?: CSSProperties
  /** This item cannot be picked up (it still moves aside for others). */
  disabled?: boolean
}

const NO_STYLES: CSSProperties = {}
const INNER_STYLES: CSSProperties = { display: 'flex' }

const Draggable: React.FC<DraggableProps> = memo(
  ({ children, id, index, type, styles = NO_STYLES, disabled = false }) => {
    const rowDragRange = useTableStore((s) => s.options.rowDragRange)
    const columnDragRange = useTableStore((s) => s.options.columnDragRange)

    const disableDrag = useMemo(
      () =>
        disabled ||
        (type === 'row'
          ? isIndexOutOfRange(index, rowDragRange.start, rowDragRange.end)
          : isIndexOutOfRange(index, columnDragRange.start, columnDragRange.end)),
      [
        disabled,
        index,
        columnDragRange.end,
        columnDragRange.start,
        rowDragRange.end,
        rowDragRange.start,
        type,
      ],
    )

    const outerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)

    // During a drag the engine writes opacity, z-index, pointer-events and the grabbing cursor
    // straight to the DOM (useHiddenElements), so no Draggable re-renders when a drag starts or
    // ends. The cursor and touch-action below are set only by the layout effect.

    // before paint, so the first frame already shows the right cursor
    useIsomorphicLayoutEffect(() => {
      if (!innerRef.current || !outerRef.current) return
      const hasDragHandle = !!innerRef.current.querySelector('[data-drag-handle]')
      // with a handle only the handle shows the grab cursor; without one (again) the row does
      innerRef.current.style.cursor = hasDragHandle || disableDrag ? 'auto' : '-webkit-grab'
      // No drag handle and not locked: the whole cell is the drag target, so block touch-scroll on
      // it. With a handle only the handle blocks touch; a locked row must stay scrollable. A
      // touch-action the consumer set through `styles` wins.
      outerRef.current.style.touchAction =
        styles.touchAction ?? (!hasDragHandle && !disableDrag ? 'none' : '')
    }, [children, disableDrag, styles.touchAction])

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
        <div ref={innerRef} style={INNER_STYLES}>
          {children}
        </div>
      </div>
    )
  },
)

Draggable.displayName = 'Draggable'
export default Draggable
