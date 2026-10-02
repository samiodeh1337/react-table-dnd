import TableContainer from './TableContainer'
import TableHeader from './TableHeader'
import ColumnCell from './ColumnCell'
import TableBody from './TableBody'
import BodyRow from './BodyRow'
import RowCell from './RowCell'
import DragHandle from './DragHandle'
import SelectHandle from './SelectHandle'
// Advanced: read or drive the table's internal store. Experimental: the state shape may change
// in a minor release (see README, "Advanced: the table store").
export { useTable, useTableStore, useTableDispatch } from './TableContainer/useTable'
export { arrayMoveMultiple, moveRowsById } from './utils'
export {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  DragHandle,
  SelectHandle,
}

// Re-export public types for consumers
export type {
  DragEndResult,
  RowDragEndResult,
  ColumnDragEndResult,
  DragStartInfo,
  DragCancelInfo,
  DragRange,
  DragType,
  SelectionState,
} from '../hooks/types'
export type { TableContainerProps } from './TableContainer'
export type { TableHeaderProps } from './TableHeader'
export type { ColumnCellProps } from './ColumnCell'
export type { TableBodyProps } from './TableBody'
export type { BodyRowProps } from './BodyRow'
export type { RowCellProps } from './RowCell'
export type { DragHandleProps } from './DragHandle'
export type { SelectHandleProps } from './SelectHandle'
