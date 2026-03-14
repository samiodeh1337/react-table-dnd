import React, { useMemo, memo, useRef, useEffect } from "react";
import type { ReactElement, CSSProperties, ReactNode } from "react";
import { useTable } from "./TableContainer/useTable";
import { isIndexOutOfRange } from "./utils";

export interface DraggableProps {
  children: ReactNode;
  id: number | string;
  index: number;
  type: string;
  styles: CSSProperties;
  disabled?: boolean;
}

const Draggable: React.FC<DraggableProps> = memo(({
  children,
  id,
  index,
  type,
  styles = {},
}) => {
  const { state, dispatch } = useTable();
  const isDragging = useMemo(
    () =>
      String(id) === String(state.dragged.draggedID) &&
      state.dragged.isDragging,
    [id, state.dragged.draggedID, state.dragged.isDragging]
  );

  const disableDrag = useMemo(
    () =>
      type === "row"
        ? isIndexOutOfRange(
            index,
            state.options.rowDragRange.start,
            state.options.rowDragRange.end
          )
        : isIndexOutOfRange(
            index,
            state.options.columnDragRange.start,
            state.options.columnDragRange.end
          ),
    [
      index,
      state.options.columnDragRange.end,
      state.options.columnDragRange.start,
      state.options.rowDragRange.end,
      state.options.rowDragRange.start,
      type,
    ]
  );

  // Detect if this draggable contains a DragHandle
  const innerRef = useRef<HTMLDivElement>(null);
  const hasHandle = useRef(false);
  useEffect(() => {
    if (innerRef.current) {
      hasHandle.current = !!innerRef.current.querySelector("[data-drag-handle]");
    }
  });

  // Transform is applied directly via DOM in useDragContextEvents
  const draggableInnerStyles: CSSProperties = useMemo(
    () => ({
      cursor: isDragging
        ? "-webkit-grabbing"
        : disableDrag || hasHandle.current
        ? "auto"
        : "-webkit-grab",
      zIndex: isDragging ? 2 : 1,
      opacity: isDragging ? 0 : 1,
      pointerEvents: isDragging ? "none" : "auto",
      display: "flex",
    }),
    [disableDrag, isDragging]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Skip touch — touch drag clone is set via long-press in beginDrag
    if (event.pointerType === "touch") return;
    if (disableDrag) return;
    requestAnimationFrame(() => {
      dispatch({
        type: "setClone",
        value: React.cloneElement(children as ReactElement),
      });
    });
  };

  return (
    <div
      className="draggable"
      data-id={id}
      data-index={index}
      data-type={type}
      onPointerDown={onPointerDown}
      data-disabled={disableDrag ? "true" : "false"}
      style={styles}
    >
      <div ref={innerRef} style={draggableInnerStyles}>{children}</div>
    </div>
  );
});

Draggable.displayName = "Draggable";
export default Draggable;
