import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";

const INIT_COLS = [
  { id: "name",       title: "Name",   width: 160 },
  { id: "role",       title: "Role",   width: 120 },
  { id: "status",     title: "Status", width: 100 },
  { id: "email",      title: "Email",  width: 200 },
  { id: "department", title: "Dept",   width: 120 },
  { id: "joined",     title: "Joined", width: 100 },
];

const th = {
  display: "flex", alignItems: "center", height: 40, padding: "0 12px",
  fontSize: 13, fontWeight: 700, color: "#94a3b8", background: "#1e1e24",
  borderBottom: "2px solid #2e2e36", textTransform: "uppercase",
};

const td = {
  height: 36, padding: "0 12px", fontSize: 13, color: "#cbd5e1",
  background: "#16161c", borderBottom: "1px solid #232329",
  display: "flex", alignItems: "center",
};

export default function FixedExample() {
  const [data, setData] = useState(() => generateRows(100));
  const [cols, setCols] = useState(INIT_COLS);
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
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={th}>
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci} style={td}>{row[col.id]}</RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
