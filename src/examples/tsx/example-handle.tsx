/**
 * Example: Drag Handle — only drag from the grip icon, not the whole row/column.
 */
import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  DragHandle,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";

const INIT_COLS = [
  { id: "name",       title: "Name",   width: 160 },
  { id: "role",       title: "Role",   width: 120 },
  { id: "status",     title: "Status", width: 110 },
  { id: "email",      title: "Email",  width: 200 },
  { id: "department", title: "Dept",   width: 120 },
];

const GripIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="#6b7280" style={{ flexShrink: 0 }}>
    <circle cx="4" cy="2" r="1.2" />
    <circle cx="8" cy="2" r="1.2" />
    <circle cx="4" cy="6" r="1.2" />
    <circle cx="8" cy="6" r="1.2" />
    <circle cx="4" cy="10" r="1.2" />
    <circle cx="8" cy="10" r="1.2" />
  </svg>
);

const th: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px",
  fontSize: 13, fontWeight: 700, color: "#94a3b8", background: "#1e1e24",
  borderBottom: "2px solid #2e2e36", textTransform: "uppercase", letterSpacing: "0.04em",
};

const td: React.CSSProperties = {
  height: 36, padding: "0 12px", fontSize: 13, color: "#cbd5e1",
  background: "#16161c", borderBottom: "1px solid #232329",
  display: "flex", alignItems: "center",
};

const tdFirst: React.CSSProperties = {
  ...td, gap: 8,
};

const handleStyle: React.CSSProperties = {
  padding: "4px 2px",
  borderRadius: 4,
};

const DragHandleExample = () => {
  const [data, setData] = useState(() => generateRows(50));
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
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 4px", color: "#e4e4e7", fontSize: 14 }}>
          Drag Handle — {data.length} rows
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: "#8b8b94" }}>
          Only the <span style={{ color: "#94a3b8" }}>&#x2847;</span> grip icon starts a drag. Clicking elsewhere in the row/column does nothing.
        </p>
      </div>
      <TableContainer
        options={options} onDragEnd={handleDragEnd}
        renderPlaceholder={() => <div style={{ width: "100%", height: "100%", background: "repeating-linear-gradient(45deg,#1e1e2a,#1e1e2a 5px,#24242e 5px,#24242e 10px)", borderRadius: 4 }} />}
        style={{ height: 420, border: "1px solid #2e2e36", borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={th}>
              <DragHandle style={handleStyle}><GripIcon /></DragHandle>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => (
            <BodyRow key={row.id} id={row.id} index={ri}>
              {cols.map((col, ci) => (
                <RowCell key={col.id} index={ci} style={ci === 0 ? tdFirst : td}>
                  {ci === 0 && (
                    <DragHandle style={handleStyle}><GripIcon /></DragHandle>
                  )}
                  {(row as any)[col.id]}
                </RowCell>
              ))}
            </BodyRow>
          ))}
        </TableBody>
      </TableContainer>
    </div>
  );
};

export default DragHandleExample;
