import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";
import { generateRows, arrayMove } from "./helpers";

const INIT_COLS = [
  { id: "name",       title: "Name",       width: 170 },
  { id: "role",       title: "Role",       width: 130 },
  { id: "department", title: "Department", width: 140 },
  { id: "email",      title: "Email",      width: 210 },
  { id: "location",   title: "Location",   width: 130 },
];

const ROW_HEIGHTS = [40, 56, 72, 44, 88, 48, 64, 40, 96, 52];

const th = {
  display: "flex", alignItems: "center", height: 44, padding: "0 14px",
  fontSize: 11, fontWeight: 800, color: "#6ee7b7", background: "#0d1f17",
  borderBottom: "2px solid #134e33", textTransform: "uppercase",
};

const makeTd = (h, isEven) => ({
  height: h, padding: "8px 14px", fontSize: 13, color: "#cbd5e1",
  background: isEven ? "#111a14" : "#0d1510",
  borderBottom: "1px solid #1a2e20",
  display: "flex", alignItems: "flex-start",
});

export default function CustomRowHeightsExample() {
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
      style={{ height: 420, border: "2px solid #134e33", borderRadius: 10 }}>
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={th}>
            {col.title}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((row, ri) => {
          const h = ROW_HEIGHTS[ri % ROW_HEIGHTS.length];
          return (
            <BodyRow key={row.id} id={row.id} index={ri} style={{ minHeight: h }}>
              {cols.map((col, ci) => (
                <RowCell key={col.id} index={ci} style={makeTd(h, ri % 2 === 0)}>
                  {row[col.id]}
                </RowCell>
              ))}
            </BodyRow>
          );
        })}
      </TableBody>
    </TableContainer>
  );
}
