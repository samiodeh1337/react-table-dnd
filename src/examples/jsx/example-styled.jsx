import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";

const STATUS_COLORS = {
  Active:     { bg: "#064e3b", color: "#6ee7b7" },
  Inactive:   { bg: "#7f1d1d", color: "#fca5a5" },
  "On Leave": { bg: "#78350f", color: "#fcd34d" },
  Pending:    { bg: "#1e3a5f", color: "#93c5fd" },
  Terminated: { bg: "#4c1d95", color: "#c4b5fd" },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] ?? { bg: "#374151", color: "#9ca3af" };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11,
                   fontWeight: 600, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
};

const ScoreBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#374151" }}>
      <div style={{ width: `${score}%`, height: "100%", borderRadius: 3,
                    background: score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#ef4444" }} />
    </div>
    <span style={{ fontSize: 11, color: "#9ca3af" }}>{score}</span>
  </div>
);

export default function CustomStyledExample() {
  const [data, setData] = useState(() => generateRows(100));
  const [cols, setCols] = useState([
    { id: "name",       title: "Name",   width: 170 },
    { id: "role",       title: "Role",   width: 130 },
    { id: "status",     title: "Status", width: 120 },
    { id: "department", title: "Dept",   width: 130 },
    { id: "location",   title: "Loc",    width: 120 },
    { id: "score",      title: "Score",  width: 90  },
  ]);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return;
    if (dragType === "row") setData((p) => arrayMove(p, sourceIndex, targetIndex));
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex));
  }, []);

  const renderCell = (row, colId) => {
    if (colId === "status") return <StatusBadge status={row.status} />;
    if (colId === "score")  return <ScoreBar score={row.score} />;
    return row[colId];
  };

  return (
    <TableContainer options={options} onDragEnd={handleDragEnd}
      style={{ height: 420, border: "1px solid #374151", borderRadius: 8 }}>
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width}
            style={{ display: "flex", alignItems: "center", height: 44,
                     padding: "0 16px", fontSize: 11, fontWeight: 700,
                     color: "#9ca3af", background: "#111827",
                     borderBottom: "1px solid #374151", textTransform: "uppercase" }}>
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci}
                style={{ height: 44, padding: "0 16px", fontSize: 13,
                         background: ri % 2 === 0 ? "#1f2937" : "#111827",
                         color: "#e5e7eb", display: "flex", alignItems: "center",
                         borderBottom: "1px solid #374151" }}>
                {renderCell(row, col.id)}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
