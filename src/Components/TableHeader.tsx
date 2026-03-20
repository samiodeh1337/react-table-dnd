import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  forwardRef,
  type ReactNode,
  useCallback,
} from 'react'
import { useTableStore, useTableDispatch } from './TableContainer/useTable'
import useAutoScroll from '../hooks/useAutoScroll'

interface TableHeaderProps {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

const TableHeader = forwardRef<HTMLDivElement, TableHeaderProps>(
  ({ children, style, className }, ref) => {
    const localRef = useRef(null)
    const resolvedRef = ref || localRef

    const bodyScrollBarWidth = useTableStore((s) => s.bodyScrollBarWidth)
    const isDragging = useTableStore((s) => s.dragged.isDragging)
    const refs = useTableStore((s) => s.refs)
    const dispatch = useTableDispatch()

    const getRefCurrent = useCallback((ref: typeof resolvedRef): HTMLDivElement | null => {
      if ('current' in ref) return ref.current
      return null // callback refs don't have .current
    }, [])

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

    useLayoutEffect(() => {
      const el = getRefCurrent(resolvedRef)
      if (el) {
        const widths: number[] = Array.from(el.querySelectorAll<HTMLElement>('.th')).map((th) => {
          const w = th.getAttribute('data-width')
          return w ? parseInt(w, 10) : 0
        })
        dispatch({ type: 'setWidths', value: widths })
      }
    }, [children, dispatch, getRefCurrent, resolvedRef])

    useLayoutEffect(() => {
      const el = getRefCurrent(resolvedRef)
      if (el) {
        const ids: string[] = Array.from(el.querySelectorAll<HTMLElement>('.draggable')).map(
          (d) => d.getAttribute('data-id') || '',
        )
        dispatch({ type: 'setColumnIds', value: ids })
      }
    }, [children, dispatch, getRefCurrent, resolvedRef])

    return (
      <div className={`header ${className ?? ''}`}>
        <div
          className="thead"
          style={theadDefaultStyles}
          data-droppableid={'header'}
          onScroll={HeaderScrollHandle}
          ref={resolvedRef}
        >
          <div style={defaultStyles} className="tr">
            {children}
          </div>
        </div>
      </div>
    )
  },
)

TableHeader.displayName = 'TableHeader'
export default TableHeader
