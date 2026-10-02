import type { MutableRefObject, RefObject } from 'react'

// --- Drag & Table types ---
export type DragType = 'row' | 'column'

interface DragEndBase {
  /** Id of the grabbed row or column, as a string. */
  id: string
  /** Index of the grabbed row/column. */
  sourceIndex: number
  /** Where the grabbed row/column lands: take the item out at `sourceIndex`, insert it at
   *  `targetIndex` (a one-item array move, as in 2.x). */
  targetIndex: number
}

/** A row drop. Every field is always set, for a single row as well as a group. */
export interface RowDragEndResult extends DragEndBase {
  dragType: 'row'
  /** Ids of every row that moved, as strings, in table order; in a virtual table the selected rows
   *  scrolled out of view come last. A single drag gives `[draggedId]`. */
  selectedIds: string[]
  /** Sorted indices of the moved rows as rendered (mounted rows only in virtual tables). */
  sourceIndices: number[]
  /** Gap in the *original* array where the rows are inserted. Feed to `moveRowsById` / `arrayMoveMultiple`. */
  insertIndex: number
}

/** A column drop. Columns move one at a time: take the column out at `sourceIndex` and insert it
 *  at `targetIndex`. */
export interface ColumnDragEndResult extends DragEndBase {
  dragType: 'column'
  selectedIds?: undefined
  sourceIndices?: undefined
  insertIndex?: undefined
}

/** What `onDragEnd` receives. Check `dragType` and TypeScript knows which fields are set. */
export type DragEndResult = RowDragEndResult | ColumnDragEndResult

/** What `onDragStart` receives: what was picked up. */
export type DragStartInfo =
  | {
      dragType: 'row'
      /** Id of the grabbed row, as a string. */
      id: string
      /** Index of the grabbed row. */
      sourceIndex: number
      /** Every row that moves, in table order (one id for a plain drag). */
      selectedIds: string[]
      /** Sorted indices of those rows as rendered (mounted rows only in virtual tables). */
      sourceIndices: number[]
    }
  | {
      dragType: 'column'
      /** Id of the grabbed column, as a string. */
      id: string
      /** Index of the grabbed column. */
      sourceIndex: number
    }

/** What `onDragCancel` receives: a drag that ended without a drop. */
export interface DragCancelInfo {
  dragType: DragType
  /** Id of the grabbed row or column, as a string. */
  id: string
  /** Index of the grabbed row or column. */
  sourceIndex: number
}

/** The drag lifecycle callbacks `TableContainer` passes to the engine. */
export interface DragCallbacks {
  onDragStart?: (info: DragStartInfo) => void
  onDragOver?: (result: DragEndResult) => void
  onDragEnd?: (result: DragEndResult) => void
  onDragCancel?: (info: DragCancelInfo) => void
}

export interface SelectionState {
  ids: ReadonlySet<string>
  /** Row last picked by a plain / Ctrl click — the start of a Shift+click range. The id is
   *  authoritative (rows may be reordered); the index is the fallback when it is not mounted. */
  anchorId: string | null
  anchorIndex: number | null
}

/**
 * What is being dragged, resolved at drag start. A single row is a group of one, so nothing
 * downstream needs a "single vs group" branch.
 */
export interface DragGroup {
  /** Every row that moves, in table order (off-screen selected rows appended). */
  ids: string[]
  /** Sorted indices of the mounted members. */
  indices: number[]
  indexSet: Set<number>
  /** Height per mounted member. */
  heights: Map<number, number>
  /** The row (or column) under the pointer. */
  grabbed: number
  grabbedId: string
  /** Height of the grabbed row: the size of the gap that opens during the drag. */
  cardHeight: number
  /** Number of rows that will move on drop (`ids.length`). */
  count: number
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
  selectable: boolean
  showDragCount: boolean
}

export interface HookRefs {
  tableRef: RefObject<HTMLDivElement | null>
  bodyRef: RefObject<HTMLDivElement | null>
  headerRef: RefObject<HTMLDivElement | null>
  cloneRef: RefObject<HTMLDivElement | null>
  placeholderRef: RefObject<HTMLDivElement | null>
}
export interface TableState {
  dragged: DraggedState
  dragType: DragType | null
  rect: RectState
  tableDimensions: TableDimensions
  refs: HookRefs
  bodyScrollBarWidth: number
  options: Options
  widths: number[]
  columnIds: string[]
  selection: SelectionState
}

// --- Actions ---
export type TableAction =
  | { type: 'setDragged'; value: Partial<DraggedState> }
  | {
      type: 'setSelection'
      value: { ids: ReadonlySet<string>; anchorIndex?: number | null; anchorId?: string | null }
    }
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
        tableDimensions: TableDimensions
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
