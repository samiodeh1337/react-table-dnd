import type { MutableRefObject } from 'react'

export interface DragEndResult {
  sourceIndex: number
  targetIndex: number
  dragType: 'row' | 'column'
}

export interface DraggedState {
  initial: { x: number; y: number }
  translate: { x: number; y: number }
  isDragging: boolean
  draggedID: string | null
  targetIndex: number | null
  sourceIndex: number | null
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
  tableRef: MutableRefObject<HTMLDivElement | null> | null
  bodyRef: MutableRefObject<HTMLDivElement | null> | null
  headerRef: MutableRefObject<HTMLDivElement | null> | null
  cloneRef: MutableRefObject<HTMLDivElement | null> | null
  placeholderRef: MutableRefObject<HTMLDivElement | null> | null
}

export type DragAction =
  | {
      type: 'dragStart'
      value: {
        rect: { draggedItemHeight: number; draggedItemWidth: number }
        dragged: {
          initial: { x: number; y: number }
          translate: { x: number; y: number }
          draggedID: string | undefined
          isDragging: boolean
          sourceIndex: number
        }
        dragType: string | undefined
      }
    }
  | {
      type: 'dragEnd'
      value: {
        targetIndex: number | null
        sourceIndex: number | null
      }
    }

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
  index: string | undefined
}

export interface Point {
  x: number
  y: number
}
