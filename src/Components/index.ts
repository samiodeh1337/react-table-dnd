import TableContainer from './TableContainer'
import TableHeader from './TableHeader'
import ColumnCell from './ColumnCell'
import TableBody from './TableBody'
import BodyRow from './BodyRow'
import RowCell from './RowCell'
import DragHandle from './DragHandle'
import useMultiSelect from '../hooks/useMultiSelect'
export { useTable, useTableStore, useTableDispatch } from './TableContainer/useTable'
export {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  DragHandle,
  useMultiSelect,
}

// Re-export public types for consumers
export type { DragEndResult, DragRange, DragType } from '../hooks/types'
export type { DraggableProps } from './Draggable'
export type { MultiSelectResult } from '../hooks/useMultiSelect'
