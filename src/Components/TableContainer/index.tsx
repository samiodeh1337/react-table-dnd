import React, { useImperativeHandle, useMemo, forwardRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Styles } from './styles'
import { useEffect, useRef, useReducer } from 'react'
import { TableContext } from './useTable'
import useDragContextEvents from '../../hooks/useDragContextEvents'

interface Range {
  start?: number
  end?: number
}

interface DragEndResult {
  sourceIndex: number
  targetIndex: number
  dragType: 'row' | 'column'
}

interface TableProviderProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onDragEnd?: (result: DragEndResult) => void
  renderPlaceholder?: () => ReactNode
  options?: {
    columnDragRange: Range
    rowDragRange: Range
  }
}

const DEFAULT_OPTIONS = {
  columnDragRange: { start: undefined, end: undefined },
  rowDragRange: { start: undefined, end: undefined },
  defaultSizing: 50,
}

function tableReducer(state: any, action: any) {
  switch (action.type) {
    case 'setClone':
      return { ...state, clone: action.value }
    case 'setDragged':
      return { ...state, dragged: { ...state.dragged, ...action.value } }
    case 'setDragType':
      return { ...state, dragType: action.value }
    case 'setRect':
      return { ...state, rect: action.value }
    case 'setTableDimensions':
      return { ...state, tableDimensions: action.value }
    case 'setTableRef':
      return { ...state, refs: { ...state.refs, tableRef: action.value } }
    case 'setBodyRef':
      return { ...state, refs: { ...state.refs, bodyRef: action.value } }
    case 'setHeaderRef':
      return { ...state, refs: { ...state.refs, headerRef: action.value } }
    case 'setCloneRef':
      return { ...state, refs: { ...state.refs, cloneRef: action.value } }
    case 'setPlaceholderRef':
      return { ...state, refs: { ...state.refs, placeholderRef: action.value } }
    case 'setBodyScrollBarWidth':
      return { ...state, bodyScrollBarWidth: action.value }
    case 'setWidths':
      return { ...state, widths: action.value }
    case 'setColumnIds':
      return { ...state, columnIds: action.value }
    case 'setOptions':
      return { ...state, options: action.value ?? DEFAULT_OPTIONS }

    // Batched actions
    case 'dragStart':
      return {
        ...state,
        rect: action.value.rect,
        dragged: { ...state.dragged, ...action.value.dragged },
        dragType: action.value.dragType,
      }
    case 'dragEnd':
      return {
        ...state,
        clone: null,
        dragged: {
          initial: { x: 0, y: 0 },
          translate: { x: 0, y: 0 },
          isDragging: false,
          draggedID: null,
          targetIndex: action.value?.targetIndex ?? null,
          sourceIndex: action.value?.sourceIndex ?? null,
        },
        dragType: null,
        rect: { draggedItemWidth: 0, draggedItemHeight: 0 },
      }

    default:
      throw new Error(`Unhandled action type: ${action.type}`)
  }
}

const INITIAL_STATE = {
  clone: null,
  dragged: {
    initial: { x: 0, y: 0 },
    translate: { x: 0, y: 0 },
    isDragging: false,
    draggedID: null,
    targetIndex: null,
    sourceIndex: null,
  },
  dragType: null,
  rect: { draggedItemWidth: 0, draggedItemHeight: 0 },
  tableDimensions: { height: 0, width: 0 },
  refs: { tableRef: null, bodyRef: null, headerRef: null, cloneRef: null, placeholderRef: null },
  bodyScrollBarWidth: 0,
  options: DEFAULT_OPTIONS,
  widths: [] as number[],
  columnIds: [] as string[],
}

const TABLE_DEFAULT_STYLES: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexFlow: 'column',
}

const PLACEHOLDER_STYLES: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 3,
  top: 0,
  left: 0,
  display: 'none',
}

const TableProvider = forwardRef<HTMLDivElement, TableProviderProps>(
  ({ children, className, style, options, onDragEnd, renderPlaceholder }, ref) => {
    const localRef = useRef<HTMLDivElement>(null)
    const cloneRef = useRef(null)
    const placeholderRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => localRef.current!, [])

    const [state, dispatch] = useReducer(tableReducer, INITIAL_STATE)
    const value = useMemo(() => ({ state, dispatch }), [state])

    useEffect(() => {
      dispatch({ type: 'setTableRef', value: localRef })
      dispatch({ type: 'setCloneRef', value: cloneRef })
      dispatch({ type: 'setPlaceholderRef', value: placeholderRef })
    }, [localRef])

    useEffect(() => {
      const updateTableDimensions = () => {
        if (localRef.current) {
          dispatch({
            type: 'setTableDimensions',
            value: {
              height: localRef.current.offsetHeight,
              width: localRef.current.offsetWidth,
            },
          })
        }
      }

      updateTableDimensions()
      window.addEventListener('resize', updateTableDimensions)

      return () => {
        window.removeEventListener('resize', updateTableDimensions)
      }
    }, [localRef])

    useEffect(() => {
      dispatch({ type: 'setOptions', value: options })
    }, [options])

    const { dragStart, touchStart } = useDragContextEvents(
      state.refs,
      state.dragged,
      dispatch,
      state.dragType,
      state.options,
      onDragEnd,
    )

    // transform is set directly via DOM in useDragContextEvents
    const cloneStyles = useMemo<CSSProperties>(
      () => ({
        position: 'fixed',
        zIndex: '5',
        pointerEvents: 'none',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        height:
          state.dragType === 'row'
            ? state.rect.draggedItemHeight
            : `${state.tableDimensions.height}px`,
        width:
          state.dragType === 'column'
            ? `${state.rect.draggedItemWidth}px`
            : `${state.tableDimensions.width}px`,
        overflow: 'hidden',
        boxShadow: state.dragged.isDragging ? '0 0 10px 0 rgba(0, 0, 0, 0.1)' : 'none',
      }),
      [
        state.dragType,
        state.dragged.isDragging,
        state.rect.draggedItemHeight,
        state.rect.draggedItemWidth,
        state.tableDimensions.height,
        state.tableDimensions.width,
      ],
    )

    return (
      <TableContext.Provider value={value}>
        <Styles className={state.dragged.isDragging ? 'is-dragging' : ''}>
          <div
            id="portalroot"
            style={{
              ...cloneStyles,
              visibility: state.dragged.isDragging ? 'visible' : 'hidden',
            }}
            ref={cloneRef}
          >
            <div style={{ flexShrink: 0, order: -1 }}>{state.clone}</div>
          </div>
          {renderPlaceholder && (
            <div ref={placeholderRef} style={PLACEHOLDER_STYLES}>
              {renderPlaceholder()}
            </div>
          )}
          <div
            data-contextid="context"
            ref={localRef}
            onMouseDown={dragStart}
            onTouchStart={touchStart}
            style={{ ...TABLE_DEFAULT_STYLES, ...style }}
            className={`table ${className ?? ''}`}
          >
            {children}
          </div>
        </Styles>
      </TableContext.Provider>
    )
  },
)

TableProvider.displayName = 'TableProvider'
export default TableProvider
