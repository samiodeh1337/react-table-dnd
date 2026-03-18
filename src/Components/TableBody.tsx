import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTableStore, useTableDispatch } from './TableContainer/useTable'
import useAutoScroll from '../hooks/useAutoScroll'

interface TableBodyProps {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

interface RowProps {
  id: string | number
  index: string | number
  children: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // allows extra props
}

interface CellProps {
  index: string | number
  isClone?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const BODY_STYLES: CSSProperties = {
  display: 'flex',
  overflow: 'hidden',
  flex: 1,
}

const TableBody = forwardRef<HTMLDivElement, TableBodyProps>(
  ({ children, style, className }, ref) => {
    const [bodyScrollHeight, setBodyScrollHeight] = useState(0)
    const localRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => localRef.current!, [])

    const sourceIndex = useTableStore((s) => s.dragged.sourceIndex)
    const dragType = useTableStore((s) => s.dragType)
    const isDragging = useTableStore((s) => s.dragged.isDragging)
    const refs = useTableStore((s) => s.refs)
    const dispatch = useTableDispatch()

    const clone = useMemo(() => {
      if (sourceIndex === null) return null

      const collectBodyRows = (node: ReactNode): ReactElement<RowProps>[] => {
        const rows: ReactElement<RowProps>[] = []
        React.Children.forEach(node, (child) => {
          if (!React.isValidElement<RowProps>(child)) return
          if (
            child.props.id !== undefined &&
            child.props.index !== undefined &&
            child.props.children
          ) {
            rows.push(child)
          } else if (child.props.children) {
            rows.push(...collectBodyRows(child.props.children))
          }
        })
        return rows
      }

      const bodyRows = collectBodyRows(children)

      return bodyRows.map((row) => {
        const filteredCells = React.Children.toArray(row.props.children)
          .filter(
            (cell): cell is ReactElement<CellProps> =>
              React.isValidElement<CellProps>(cell) &&
              String(cell.props.index) === String(sourceIndex),
          )
          .map((cell) => React.cloneElement(cell, { key: cell.props.index, isClone: true }))

        return React.cloneElement(row, {
          key: row.props.id,
          ...row.props,
          children: filteredCells,
        })
      })
    }, [children, sourceIndex])

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

    useLayoutEffect(() => {
      if (localRef.current) {
        setBodyScrollHeight(localRef.current.scrollHeight)
      }
    }, [localRef, children])
    return (
      <React.Fragment>
        {dragType === 'column' &&
          refs.cloneRef?.current &&
          createPortal(
            <div
              className="body clone-body"
              data-droppableid={'body'}
              style={{ overflow: 'hidden', flex: 1 }}
            >
              <div className="rbody" style={{ height: bodyScrollHeight, position: 'relative' }}>
                {clone && React.Children.toArray(clone)}
              </div>
            </div>,
            refs.cloneRef.current,
          )}
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
      </React.Fragment>
    )
  },
)

export default TableBody
