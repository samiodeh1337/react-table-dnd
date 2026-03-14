/**
 * Example: Fixed-size table — 100 rows, fixed column widths, no virtualization.
 */
import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from "../Components";
import { generateRows, arrayMove } from "./example-data";

const INIT_COLS = [
  { id: "name", title: "Name", width: 160 },
  { id: "role", title: "Role", width: 120 },
  { id: "status", title: "Status", width: 100 },
  { id: "email", title: "Email", width: 200 },
  { id: "department", title: "Dept", width: 120 },
  { id: "joined", title: "Joined", width: 100 },
];

const th: React.CSSProperties = {
  display: "flex", alignItems: "center", height: 40, padding: "0 12px",
  fontSize: 13, fontWeight: 700, color: "#94a3b8", background: "#1e1e24",
  borderBottom: "2px solid #2e2e36", textTransform: "uppercase", letterSpacing: "0.04em",
};

const td: React.CSSProperties = {
  height: 36, padding: "0 12px", fontSize: 13, color: "#cbd5e1",
  background: "#16161c", borderBottom: "1px solid #232329", display: "flex", alignItems: "center",
};

const FixedExample = () => {
  const [data, setData] = useState(() => generateRows(100));
  const [cols, setCols] = useState(INIT_COLS);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  const handleDragEnd = useCallback(
    (r: { sourceIndex: number; targetIndex: number; dragType: string }) => {
      if (r.sourceIndex === r.targetIndex) return;
      if (r.dragType === "row") setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex));
      else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex));
    }, []
  );

  return (
    <div style={{ width: "100%" }}>
      <h3 style={{ margin: "0 0 12px", color: "#e4e4e7", fontSize: 14 }}>Fixed Sizes — {data.length} rows</h3>
      <TableContainer
        options={options} onDragEnd={handleDragEnd}
        renderPlaceholder={() => <div style={{ width: "100%", height: "100%", background: "repeating-linear-gradient(45deg,#1e1e2a,#1e1e2a 5px,#24242e 5px,#24242e 10px)", borderRadius: 4 }} />}
        style={{ height: 420, border: "1px solid #2e2e36", borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={th}>{col.title}</ColumnCell>
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
    </div>
  );
};

export default FixedExample;
