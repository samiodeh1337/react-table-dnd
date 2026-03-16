import type { Dispatch, MutableRefObject, ReactElement, RefObject } from 'react'

// --- Drag & Table types ---
export type DragType = 'row' | 'column'

export interface DragEndResult {
  sourceIndex: number
  targetIndex: number
  dragType: DragType
}

export interface DraggedState {
  initial: { x: number; y: number }
  translate: { x: number; y: number }
  isDragging: boolean
  draggedID: string | null
  targetIndex: number | null
  sourceIndex: number | null
}

export interface RectState {
  draggedItemWidth: number
  draggedItemHeight: number
}

export interface TableDimensions {
  width: number
  height: number
}

export interface DragRange {
  start?: number
  end?: number
}

export interface Options {
  columnDragRange: DragRange
  rowDragRange: DragRange
  defaultSizing: number
}

export interface HookRefs {
  tableRef: RefObject<HTMLDivElement | null>
  bodyRef: RefObject<HTMLDivElement | null>
  headerRef: RefObject<HTMLDivElement | null>
  cloneRef: RefObject<HTMLDivElement | null>
  placeholderRef: RefObject<HTMLDivElement | null>
}
export interface TableState {
  clone: ReactElement | null
  dragged: DraggedState
  dragType: DragType | null
  rect: RectState
  tableDimensions: TableDimensions
  refs: HookRefs
  bodyScrollBarWidth: number
  options: Options
  widths: number[]
  columnIds: string[]
}

// --- Actions ---
export type TableAction =
  | { type: 'setClone'; value: ReactElement | null }
  | { type: 'setDragged'; value: Partial<DraggedState> }
  | { type: 'setDragType'; value: DragType | null }
  | { type: 'setTableDimensions'; value: TableDimensions }
  | {
      type: 'setRef'
      refName: keyof HookRefs
      value: MutableRefObject<HTMLDivElement | null> | null
    }
  | { type: 'setBodyScrollBarWidth'; value: number }
  | { type: 'setWidths'; value: number[] }
  | { type: 'setColumnIds'; value: string[] }
  | { type: 'setOptions'; value: Partial<Options> }
  | {
      type: 'dragStart'
      value: {
        rect: RectState
        dragged: {
          initial: { x: number; y: number }
          translate: { x: number; y: number }
          draggedID: string | null
          isDragging: boolean
          sourceIndex: number
        }
        dragType: DragType | null
      }
    }
  | {
      type: 'dragEnd'
      value: { targetIndex: number | null; sourceIndex: number | null }
    }

// --- Optional: Row / Column helper types ---
export interface RowItem {
  height: number
  itemTop: number
  itemBottom: number
  index: string
}

export interface ColumnItem {
  left: number
  width: number
  itemLeft: number
  itemRight: number
  index: string
}

export interface Point {
  x: number
  y: number
}

export interface TableContextType {
  state: TableState
  dispatch: Dispatch<TableAction>
}
