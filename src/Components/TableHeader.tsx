/* eslint-disable no-unused-vars */
// @ts-nocheck
import React, { useEffect, useMemo, useRef, forwardRef } from "react";
import { useTable } from "./TableContainer/useTable.tsx";
import useAutoScroll from "../hooks/useAutoScroll.ts";
import "./style.css";

interface TableHeaderProps {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const TableHeader = forwardRef<HTMLDivElement, TableHeaderProps>(
  ({ children, style, className }, ref) => {
    const localRef = useRef(null);
    const resolvedRef = ref || localRef;
    const { state, dispatch } = useTable();

    useEffect(() => {
      dispatch({ type: "setHeaderRef", value: resolvedRef });
    }, [dispatch, resolvedRef]);

    const { HeaderScrollHandle } = useAutoScroll(state.refs);

    const defaultStyles = {
      display: "flex",
      flex: "1 0 auto",
    };

    const theadDefaultStyles = useMemo(
      () => ({
        overflow: "hidden",
        display: "flex",
        paddingRight: `${state.bodyScrollBarWidth}px`,
        userSelect: state.dragged.isDragging ? "none" : "auto",
        ...style,
      }),
      [state.bodyScrollBarWidth, state.dragged.isDragging, style]
    );

    useEffect(() => {
      if (resolvedRef.current) {
        const widths = Array.from(
          resolvedRef.current.querySelectorAll(".th")
        ).map((element) => {
          const width = element.getAttribute("data-width");
          return width ? parseInt(width, 10) : null;
        });
        dispatch({ type: "setWidths", value: widths });
      }
    }, [children, dispatch, resolvedRef]);

    useEffect(() => {
      if (resolvedRef.current) {
        const ids = Array.from(
          resolvedRef.current.querySelectorAll(".draggable")
        ).map((elem) => elem.getAttribute("data-id"));
        dispatch({ type: "setColumnIds", value: ids });
      }
    }, [children, dispatch, resolvedRef]);

    return (
      <div className={`header ${className ?? ""}`}>
        <div
          className="thead"
          style={theadDefaultStyles}
          data-droppableid={"header"}
          onScroll={HeaderScrollHandle}
          ref={resolvedRef}
        >
          <div style={defaultStyles} className="tr">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

TableHeader.displayName = "TableHeader";
export default TableHeader;
