/* eslint-disable no-unused-vars */
// @ts-nocheck
import React, {
  CSSProperties,
  forwardRef,
  ReactElement,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useTable } from "./TableContainer/useTable";
import useAutoScroll from "../hooks/useAutoScroll";

interface TableBodyProps {
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const TableBody = forwardRef<HTMLDivElement, TableBodyProps>(
  ({ children, style, className }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => localRef.current!, []);
    const { state, dispatch } = useTable();

    const clone = useMemo(() => {
      if (state.dragged.sourceIndex === null) return null;

      const collectBodyRows = (node: ReactNode): ReactElement[] => {
        const rows: ReactElement[] = [];
        React.Children.forEach(node, (child) => {
          if (!React.isValidElement(child)) return;
          if (child.props.id !== undefined && child.props.index !== undefined && child.props.children) {
            rows.push(child);
          } else if (child.props.children) {
            rows.push(...collectBodyRows(child.props.children));
          }
        });
        return rows;
      };

      const bodyRows = collectBodyRows(children);

      return bodyRows.map((row) => {
        const filteredCells = React.Children.toArray(row.props.children)
          .filter(
            (cell): cell is ReactElement =>
              React.isValidElement(cell) &&
              String(cell.props.index) === String(state.dragged.sourceIndex)
          )
          .map((cell) => React.cloneElement(cell, { isClone: true }));

        return React.cloneElement(row, {
          ...row.props,
          children: filteredCells,
        });
      });
    }, [children, state.dragged.sourceIndex]);

    useEffect(() => {
      dispatch({ type: "setBodyRef", value: localRef });
    }, [dispatch, localRef]);

    const { BodyScrollHandle } = useAutoScroll(state.refs);

    const InnerBodyDefaultStyles = useMemo<CSSProperties>(
      () => ({
        overflowX: "auto",
        overflowY: "auto",
        flex: 1,
        userSelect: state.dragged.isDragging ? "none" : "auto",
        ...style,
      }),
      [state.dragged.isDragging, style]
    );

    useEffect(() => {
      if (localRef.current) {
        const clientWidth = localRef.current.clientWidth;
        const offsetWidth = localRef.current.offsetWidth;
        const scrollbarWidth = offsetWidth - clientWidth;
        dispatch({ type: "setBodyScrollBarWidth", value: scrollbarWidth });
      }
    }, [dispatch, localRef]);

    const bodyScrollHeight = localRef.current?.scrollHeight ?? 0;

    return (
      <React.Fragment>
        {state.dragType === "column" &&
          state.refs.cloneRef?.current &&
          createPortal(
            <div
              className="body clone-body"
              data-droppableid={"body"}
              style={{ overflow: "hidden", flex: 1 }}
            >
              <div
                className="rbody"
                style={{ height: bodyScrollHeight, position: "relative" }}
              >
                {clone}
              </div>
            </div>,
            state.refs.cloneRef.current
          )}
        <div className={`body ${className ?? ""}`} style={BODY_STYLES}>
          <div
            className="ibody"
            style={InnerBodyDefaultStyles}
            data-droppableid={"body"}
            onScroll={BodyScrollHandle}
            ref={localRef}
          >
            {children}
          </div>
        </div>
      </React.Fragment>
    );
  }
);

const BODY_STYLES: CSSProperties = {
  display: "flex",
  overflow: "hidden",
  flex: 1,
};

TableBody.displayName = "TableBody";
export default TableBody;
