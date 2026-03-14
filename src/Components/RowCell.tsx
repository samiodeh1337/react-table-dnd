import React, { useMemo, memo } from "react";
import { useTable } from "./TableContainer/useTable";

interface RowCellProps {
  children?: React.ReactNode;
  width?: number;
  index: number;
  isClone?: true;
  style?: React.CSSProperties;
  className?: string;
  [propName: string]: any;
}

const RowCell: React.FC<RowCellProps> = memo(({
  children,
  style,
  className,
  isClone,
  ...props
}) => {
  const { index } = props;
  const { state } = useTable();

  const columnId = useMemo(
    () => state.columnIds[index] ?? "",
    [state.columnIds, index]
  );
  const rowCellWidth = useMemo(
    () => state.widths[index] ?? state.options.defaultSizing,
    [state.widths, index, state.options.defaultSizing]
  );

  const isDragging = useMemo(
    () => (isClone ? false : columnId === state.dragged.draggedID),
    [isClone, columnId, state.dragged.draggedID]
  );

  const styles = useMemo(
    () => ({
      display: "inline-flex",
      opacity: isDragging ? 0 : 1,
      width: `${rowCellWidth}px`,
      flex: `${rowCellWidth} 0 auto`,
      ...style,
    }),
    [isDragging, rowCellWidth, style]
  );

  return (
    <div className={`td ${className ?? ""}`} style={styles} data-col-index={index}>
      {children}
    </div>
  );
});

RowCell.displayName = "RowCell";
export default RowCell;
