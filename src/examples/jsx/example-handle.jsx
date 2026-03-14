import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell, DragHandle,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";

const GripIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="#6b7280">
    <circle cx="4" cy="2" r="1.2" />
    <circle cx="8" cy="2" r="1.2" />
    <circle cx="4" cy="6" r="1.2" />
    <circle cx="8" cy="6" r="1.2" />
    <circle cx="4" cy="10" r="1.2" />
    <circle cx="8" cy="10" r="1.2" />
  </svg>
);

const COLS = [
  { id: "name",       title: "Name",   width: 160 },
  { id: "role",       title: "Role",   width: 120 },
  { id: "status",     title: "Status", width: 110 },
  { id: "email",      title: "Email",  width: 200 },
  { id: "department", title: "Dept",   width: 120 },
];

export default function DragHandleExample() {
  const [data, setData] = useState(() => generateRows(50));
  const [cols, setCols] = useState(COLS);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return;
    if (dragType === "row") setData((p) => arrayMove(p, sourceIndex, targetIndex));
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex));
  }, []);

  return (
    <TableContainer options={options} onDragEnd={handleDragEnd}
      style={{ height: 420, border: "1px solid #2e2e36", borderRadius: 8 }}>
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width}
            style={{ display: "flex", alignItems: "center", gap: 8,
                     height: 40, padding: "0 12px", color: "#94a3b8",
                     background: "#1e1e24", fontSize: 13, fontWeight: 700 }}>
            <DragHandle><GripIcon /></DragHandle>
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci}
                style={{ display: "flex", alignItems: "center", gap: 8,
                         height: 36, padding: "0 12px", fontSize: 13,
                         color: "#cbd5e1", background: "#16161c",
                         borderBottom: "1px solid #232329" }}>
                {ci === 0 && <DragHandle><GripIcon /></DragHandle>}
                {row[col.id]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
