import * as React from 'react'
import { useImperativeHandle, useMemo, forwardRef, useState, useCallback } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Styles } from './styles'
import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { StoreContext } from './useTable'
import { createTableStore } from './store'
import useDragContextEvents from '../../hooks/useDragContextEvents'
import type {
  TableAction,
  TableState,
  DragCancelInfo,
  DragEndResult,
  DragRange,
  DragStartInfo,
} from '../../hooks/types'
import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect'

/** Props of `TableContainer`. Other HTML attributes (`role`, `aria-*`, `data-*`, …) go on the table
 *  element (`[data-rtdnd="table"]`). Its mouse-down and touch-start handlers start drags, so they
 *  are the library's; the drag callbacks below replace HTML's native drag events. */
export interface TableContainerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | 'children'
  | 'className'
  | 'style'
  | 'onDragStart'
  | 'onDragOver'
  | 'onDragEnd'
  | 'onMouseDown'
  | 'onTouchStart'
> {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** A drop: apply it to your data (see `moveRowsById`). */
  onDragEnd?: (result: DragEndResult) => void
  /** A row or column was picked up. */
  onDragStart?: (info: DragStartInfo) => void
  /** The drop slot changed: `result` is what a drop there would give. */
  onDragOver?: (result: DragEndResult) => void
  /** The drag ended without a drop (Escape, the window lost focus, or the pointer never moved). */
  onDragCancel?: (info: DragCancelInfo) => void
  renderPlaceholder?: () => ReactNode
  options?: {
    columnDragRange?: DragRange
    rowDragRange?: DragRange
  }
  /** Enable click / Ctrl+click / Shift+click row selection and group drag. Off by default. */
  selectable?: boolean
  /** Controlled selection. Omit to let the table keep the selection internally. */
  selectedIds?: ReadonlyArray<string | number>
  /** Initial selection for the uncontrolled mode. */
  defaultSelectedIds?: ReadonlyArray<string | number>
  /** Fires with the full selection (ids as strings, in table order) whenever it changes. */
  onSelectionChange?: (ids: string[]) => void
  /** Show the row-count badge on the drag card when several rows move together. Default true. */
  showDragCount?: boolean
}

const DEFAULT_OPTIONS = {
  columnDragRange: { start: undefined, end: undefined },
  rowDragRange: { start: undefined, end: undefined },
  defaultSizing: 50,
  selectable: false,
  showDragCount: true,
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set()

function sameIdSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'setDragged':
      return { ...state, dragged: { ...state.dragged, ...action.value } }
    case 'setSelection': {
      const anchorIndex =
        action.value.anchorIndex === undefined
          ? state.selection.anchorIndex
          : action.value.anchorIndex
      const anchorId =
        action.value.anchorId === undefined ? state.selection.anchorId : action.value.anchorId
      if (
        sameIdSet(state.selection.ids, action.value.ids) &&
        anchorIndex === state.selection.anchorIndex &&
        anchorId === state.selection.anchorId
      )
        return state
      return { ...state, selection: { ids: action.value.ids, anchorIndex, anchorId } }
    }
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
        tableDimensions: action.value.tableDimensions,
      }
    case 'dragEnd':
      return {
        ...state,
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
  selection: { ids: EMPTY_SELECTION, anchorIndex: null, anchorId: null },
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

const TableProvider = forwardRef<HTMLDivElement, TableContainerProps>(
  (
    {
      children,
      className,
      style,
      options,
      onDragEnd,
      onDragStart,
      onDragOver,
      onDragCancel,
      renderPlaceholder,
      selectable = false,
      selectedIds,
      defaultSelectedIds,
      onSelectionChange,
      showDragCount = true,
      ...rest
    },
    ref,
  ) => {
    const localRef = useRef<HTMLDivElement>(null)
    const cloneRef = useRef(null)
    const placeholderRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => localRef.current!, [])

    const [store] = useState(() => {
      const seed = selectedIds ?? defaultSelectedIds
      const initial: TableState = seed
        ? {
            ...INITIAL_STATE,
            selection: { ids: new Set(seed.map(String)), anchorIndex: null, anchorId: null },
          }
        : INITIAL_STATE
      return createTableStore(tableReducer, initial)
    })
    const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
    const dispatch = store.dispatch

    // --- Selection: controlled (selectedIds given) or uncontrolled ---
    const isControlled = selectedIds !== undefined
    const isControlledRef = useRef(isControlled)
    const onSelectionChangeRef = useRef(onSelectionChange)
    useIsomorphicLayoutEffect(() => {
      isControlledRef.current = isControlled
      onSelectionChangeRef.current = onSelectionChange
    })

    useEffect(() => {
      if (!isControlled) return
      dispatch({ type: 'setSelection', value: { ids: new Set(selectedIds!.map(String)) } })
    }, [isControlled, selectedIds, dispatch])

    // Stable identity so it never churns the drag callbacks.
    const commitSelection = useCallback(
      (ids: string[], anchorIndex?: number | null, anchorId?: string | null) => {
        if (anchorIndex === null && anchorId === undefined) anchorId = null // clearing the anchor
        const next = new Set(ids)
        const changed = !sameIdSet(store.getState().selection.ids, next)
        if (isControlledRef.current) {
          // Ids come back through the `selectedIds` prop; only the anchor is library-internal.
          if (anchorIndex !== undefined)
            dispatch({
              type: 'setSelection',
              value: { ids: store.getState().selection.ids, anchorIndex, anchorId },
            })
        } else {
          dispatch({ type: 'setSelection', value: { ids: next, anchorIndex, anchorId } })
        }
        if (changed) onSelectionChangeRef.current?.(ids)
      },
      [dispatch, store],
    )

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
      // a range left out (or passed as undefined) keeps the default "no restriction"
      dispatch({
        type: 'setOptions',
        value: {
          ...(options ?? {}), // anything else a JS consumer passes keeps flowing through, as in 2.x
          rowDragRange: options?.rowDragRange ?? DEFAULT_OPTIONS.rowDragRange,
          columnDragRange: options?.columnDragRange ?? DEFAULT_OPTIONS.columnDragRange,
          selectable,
          showDragCount,
        },
      })
    }, [options, selectable, showDragCount, dispatch])

    const { dragStart, touchStart } = useDragContextEvents(
      state.refs,
      state.dragged,
      dispatch,
      state.dragType,
      state.options,
      { onDragStart, onDragOver, onDragEnd, onDragCancel },
      store.getState,
      commitSelection,
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
            data-rtdnd="clone"
            style={{
              ...cloneStyles,
              visibility: state.dragged.isDragging ? 'visible' : 'hidden',
            }}
            ref={cloneRef}
          />
          <div ref={placeholderRef} style={PLACEHOLDER_STYLES}>
            {renderPlaceholder ? (
              renderPlaceholder()
            ) : (
              <div style={{ width: '100%', height: '100%' }} />
            )}
          </div>
          <div
            {...rest}
            data-contextid="context"
            ref={localRef}
            onMouseDown={dragStart}
            onTouchStart={touchStart}
            style={{ ...TABLE_DEFAULT_STYLES, ...style }}
            data-rtdnd="table"
            className={className}
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
