import * as React from 'react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { useTableStore, useTableDispatch } from './TableContainer/useTable'
import useAutoScroll from '../hooks/useAutoScroll'
import useIsomorphicLayoutEffect from '../hooks/useIsomorphicLayoutEffect'

/** Props of `TableBody`. */
export interface TableBodyProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'style'
> {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

const BODY_STYLES: CSSProperties = {
  display: 'flex',
  overflow: 'hidden',
  flex: 1,
}

const TableBody = forwardRef<HTMLDivElement, TableBodyProps>(
  ({ children, style, className, onScroll, ...rest }, ref) => {
    const localRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => localRef.current!, [])

    const isDragging = useTableStore((s) => s.dragged.isDragging)
    const refs = useTableStore((s) => s.refs)
    const dispatch = useTableDispatch()

    useEffect(() => {
      dispatch({ type: 'setRef', refName: 'bodyRef', value: localRef })
    }, [dispatch, localRef])

    const { BodyScrollHandle } = useAutoScroll(refs)

    const InnerBodyDefaultStyles = useMemo<CSSProperties>(
      () => ({
        overflowX: 'auto',
        overflowY: 'auto',
        flex: 1,
        userSelect: isDragging ? 'none' : 'auto',
        ...style,
      }),
      [isDragging, style],
    )

    useIsomorphicLayoutEffect(() => {
      if (localRef.current) {
        const clientWidth = localRef.current.clientWidth
        const offsetWidth = localRef.current.offsetWidth
        const scrollbarWidth = offsetWidth - clientWidth
        dispatch({ type: 'setBodyScrollBarWidth', value: scrollbarWidth })
      }
    }, [dispatch, localRef])

    return (
      <div {...rest} data-rtdnd="body" className={className} style={BODY_STYLES}>
        <div
          data-rtdnd="ibody"
          style={InnerBodyDefaultStyles}
          data-droppableid={'body'}
          onScroll={(e) => {
            BodyScrollHandle(e)
            onScroll?.(e) // the inner element scrolls, so a consumer's handler belongs here
          }}
          ref={localRef}
        >
          {children}
        </div>
      </div>
    )
  },
)

export default TableBody
