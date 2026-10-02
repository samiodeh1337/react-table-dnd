import * as React from 'react'
import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef, type ReactNode } from 'react'
import { useTableStore, useTableDispatch } from './TableContainer/useTable'
import useAutoScroll from '../hooks/useAutoScroll'
import useIsomorphicLayoutEffect from '../hooks/useIsomorphicLayoutEffect'

/** Props of `TableHeader`. */
export interface TableHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'style'
> {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

const TableHeader = forwardRef<HTMLDivElement, TableHeaderProps>(
  ({ children, style, className, onScroll, ...rest }, ref) => {
    // Always our own ref (the drag engine reads it); a consumer ref gets the same element.
    const localRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => localRef.current!, [])

    const bodyScrollBarWidth = useTableStore((s) => s.bodyScrollBarWidth)
    const isDragging = useTableStore((s) => s.dragged.isDragging)
    const refs = useTableStore((s) => s.refs)
    const dispatch = useTableDispatch()

    useEffect(() => {
      if (localRef.current) {
        dispatch({
          type: 'setRef',
          refName: 'headerRef',
          value: localRef,
        })
      }
    }, [dispatch])

    const { HeaderScrollHandle } = useAutoScroll(refs)

    const defaultStyles = {
      display: 'flex',
      flex: '1 0 auto',
    }

    const theadDefaultStyles: React.CSSProperties = useMemo(
      () => ({
        overflowX: 'scroll' as const,
        overflowY: 'clip' as const,
        scrollbarWidth: 'none' as const,
        display: 'flex',
        paddingRight: `${bodyScrollBarWidth}px`,
        userSelect: isDragging ? ('none' as const) : ('auto' as const),
        ...style,
      }),
      [bodyScrollBarWidth, isDragging, style],
    )

    useIsomorphicLayoutEffect(() => {
      const el = localRef.current
      if (el) {
        const widths: number[] = Array.from(
          el.querySelectorAll<HTMLElement>('[data-rtdnd="th"]'),
        ).map((th) => {
          const w = th.getAttribute('data-width')
          return w ? parseInt(w, 10) : 0
        })
        dispatch({ type: 'setWidths', value: widths })
      }
    }, [children, dispatch])

    useIsomorphicLayoutEffect(() => {
      const el = localRef.current
      if (el) {
        const ids: string[] = Array.from(
          el.querySelectorAll<HTMLElement>('[data-rtdnd="draggable"]'),
        ).map((d) => d.getAttribute('data-id') || '')
        dispatch({ type: 'setColumnIds', value: ids })
      }
    }, [children, dispatch])

    return (
      <div {...rest} data-rtdnd="header" className={className}>
        <div
          data-rtdnd="thead"
          style={theadDefaultStyles}
          data-droppableid={'header'}
          onScroll={(e) => {
            HeaderScrollHandle(e)
            onScroll?.(e) // the inner element scrolls, so a consumer's handler belongs here
          }}
          ref={localRef}
        >
          <div style={defaultStyles} data-rtdnd="tr">
            {children}
          </div>
        </div>
      </div>
    )
  },
)

TableHeader.displayName = 'TableHeader'
export default TableHeader
