import React, { useImperativeHandle, useMemo, forwardRef, useLayoutEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Styles } from './styles'
import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { StoreContext } from './useTable'
import { createTableStore } from './store'
import useDragContextEvents from '../../hooks/useDragContextEvents'
import type { TableAction, TableState, DragEndResult, DragRange } from '../../hooks/types'

interface TableProviderProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onDragEnd?: (result: DragEndResult) => void
  renderPlaceholder?: () => ReactNode
  options?: {
    columnDragRange: DragRange
    rowDragRange: DragRange
  }
}

const DEFAULT_OPTIONS = {
  columnDragRange: { start: undefined, end: undefined },
  rowDragRange: { start: undefined, end: undefined },
  defaultSizing: 50,
}

function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'setClone':
      return { ...state, clone: action.value }
    case 'setDragged':
      return { ...state, dragged: { ...state.dragged, ...action.value } }
    case 'setDragType':
      return { ...state, dragType: action.value }
    case 'setTableDimensions':
      return { ...state, tableDimensions: action.value }
    case 'setRef':
      return {
        ...state,
        refs: {
          ...state.refs,
          [action.refName]: action.value,
        },
      }
    case 'setBodyScrollBarWidth':
      return { ...state, bodyScrollBarWidth: action.value }
    case 'setWidths':
      return { ...state, widths: action.value }
    case 'setColumnIds':
      return { ...state, columnIds: action.value }
    case 'setOptions':
      return {
        ...state,
        options: {
          ...state.options,
          ...action.value,
        },
      }

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
      throw new Error('Unhandled action')
  }
}

const INITIAL_STATE: TableState = {
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
  refs: {
    tableRef: { current: null },
    bodyRef: { current: null },
    headerRef: { current: null },
    cloneRef: { current: null },
    placeholderRef: { current: null },
  },
  bodyScrollBarWidth: 0,
  options: DEFAULT_OPTIONS,
  widths: [],
  columnIds: [],
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

    const [store] = useState(() => createTableStore(tableReducer, INITIAL_STATE))
    const state = useSyncExternalStore(store.subscribe, store.getState)
    const dispatch = store.dispatch

    useEffect(() => {
      dispatch({ type: 'setRef', refName: 'tableRef', value: localRef })
      dispatch({ type: 'setRef', refName: 'cloneRef', value: cloneRef })
      dispatch({
        type: 'setRef',
        refName: 'placeholderRef',
        value: placeholderRef,
      })
    }, [localRef, dispatch])

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
    }, [localRef, dispatch])

    useEffect(() => {
      if (options) {
        dispatch({ type: 'setOptions', value: options })
      }
    }, [options, dispatch])

    const { dragStart, touchStart } = useDragContextEvents(
      state.refs,
      state.dragged,
      dispatch,
      state.dragType,
      state.options,
      onDragEnd,
    )

    useLayoutEffect(() => {
      if (state.clone && state.dragType === 'row') {
        const cloneEl = cloneRef.current as HTMLElement | null
        const bodyEl = state.refs.bodyRef?.current as HTMLElement | null
        if (cloneEl && bodyEl) {
          cloneEl.scrollLeft = bodyEl.scrollLeft
        }
      }
    }, [state.clone, state.dragType, state.refs.bodyRef])

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
        overflow: 'scroll',
        scrollbarWidth: 'none' as const,
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
      <StoreContext.Provider value={store}>
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
          <div ref={placeholderRef} style={PLACEHOLDER_STYLES}>
            {renderPlaceholder ? (
              renderPlaceholder()
            ) : (
              <div style={{ width: '100%', height: '100%' }} />
            )}
          </div>
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
      </StoreContext.Provider>
    )
  },
)

TableProvider.displayName = 'TableProvider'
export default TableProvider
