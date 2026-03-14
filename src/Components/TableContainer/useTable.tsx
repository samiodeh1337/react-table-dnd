import { createContext, useContext } from "react";
import type { Dispatch, ReactElement } from "react";

interface DraggedState {
  initial: { x: number; y: number };
  translate: { x: number; y: number };
  isDragging: boolean;
  draggedID: string | null;
  targetIndex: number | null;
  sourceIndex: number | null;
}

interface RectState {
  draggedItemWidth: number;
  draggedItemHeight: number;
}

interface TableDimensions {
  height: number;
  width: number;
}

interface Refs {
  tableRef: HTMLDivElement | null;
  bodyRef: HTMLDivElement | null;
  headerRef: HTMLDivElement | null;
  cloneRef: HTMLDivElement | null;
  placeholderRef: HTMLDivElement | null;
}

interface DragRange {
  start?: number | undefined;
  end?: number | undefined;
}

interface Options {
  columnDragRange: DragRange;
  rowDragRange: DragRange;
  defaultSizing: number;
}

interface TableState {
  clone: ReactElement | null;
  dragged: DraggedState;
  dragType: string | null;
  rect: RectState;
  tableDimensions: TableDimensions;
  refs: Refs;
  bodyScrollBarWidth: number;
  options: Options;
  widths: number[];
  columnIds: string[];
}

type TableAction =
  | { type: "setClone"; value: ReactElement | null }
  | { type: "setDragged"; value: Partial<DraggedState> }
  | { type: "setDragType"; value: string | null }
  | { type: "setRect"; value: Partial<RectState> }
  | { type: "setTableDimensions"; value: TableDimensions }
  | { type: "setRefs"; value: Partial<Refs> }
  | { type: "setBodyScrollBarWidth"; value: number }
  | { type: "setOptions"; value: Partial<Options> }
  | { type: "setWidths"; value: number[] }
  | { type: "setColumnIds"; value: string[] };

interface TableContextType {
  state: TableState;
  dispatch: Dispatch<TableAction>;
}

export const TableContext = createContext<TableContextType | undefined>(
  undefined
);

export const useTable = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
};
