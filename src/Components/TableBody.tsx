import React, {
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

interface TableBodyProps {
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
  ({ children, style, className }, ref) => {
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

    useEffect(() => {
      if (localRef.current) {
        const clientWidth = localRef.current.clientWidth
        const offsetWidth = localRef.current.offsetWidth
        const scrollbarWidth = offsetWidth - clientWidth
        dispatch({ type: 'setBodyScrollBarWidth', value: scrollbarWidth })
      }
    }, [dispatch, localRef])

    return (
      <div className={`body ${className ?? ''}`} style={BODY_STYLES}>
        <div
          className="ibody"
          style={InnerBodyDefaultStyles}
          data-droppableid={'body'}
          onScroll={BodyScrollHandle}
          ref={localRef}
        >
          {children}
        </div>
      </div>
    )
  },
)

export default TableBody
