import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";
import "./styling.css";

// ── CSS (styling.css) ──────────────────────────────────
//
// .my-table        { border-radius: 10px; overflow: hidden;
//                    border: 2px solid #f59e0b44; }
// .my-col          { display: flex; align-items: center; height: 42px;
//                    padding: 0 14px; font-size: 11px; font-weight: 800;
//                    color: #fbbf24; border-bottom: 2px solid #f59e0b44;
//                    text-transform: uppercase; cursor: grab; }
// .my-col:hover    { background: #221f0e; }
// .my-row:hover
//   .my-cell       { background: #1a1810 !important; }
// .my-cell         { display: flex; align-items: center; height: 38px;
//                    padding: 0 14px; font-size: 13px; color: #d6c896;
//                    border-bottom: 1px solid #2a2510; cursor: grab; }
// .my-cell-alt     { background: #111008 !important; }

const INIT_COLS = [
  { id: "name",       title: "Name",   width: 160 },
  { id: "role",       title: "Role",   width: 130 },
  { id: "status",     title: "Status", width: 110 },
  { id: "department", title: "Dept",   width: 130 },
  { id: "location",   title: "City",   width: 120 },
  { id: "score",      title: "Score",  width: 90  },
];

export default function StylingExample() {
  const [data, setData] = useState(() => generateRows(60));
  const [cols, setCols] = useState(INIT_COLS);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return;
    if (dragType === "row") setData((p) => arrayMove(p, sourceIndex, targetIndex));
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex));
  }, []);

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      className="my-table"
      style={{ height: 420, background: "#0f0e09" }}
    >
      <TableHeader className="my-header">
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width} className="my-col">
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri} className="my-row">
            {cols.map((col, ci) => (
              <RowCell
                key={col.id}
                index={ci}
                className={`my-cell${ri % 2 !== 0 ? " my-cell-alt" : ""}`}
                style={{ width: col.width }}
              >
                {row[col.id]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
