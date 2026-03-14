/**
 * Example: Custom row heights — 100 rows with varying heights, visible cell borders.
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
  { id: "name", title: "Name", width: 170 },
  { id: "role", title: "Role", width: 130 },
  { id: "department", title: "Department", width: 140 },
  { id: "email", title: "Email", width: 210 },
  { id: "location", title: "Location", width: 130 },
];

const ROW_HEIGHTS = [40, 56, 72, 44, 88, 48, 64, 40, 96, 52];

const th: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 44,
  padding: "0 14px",
  fontSize: 11,
  fontWeight: 800,
  color: "#6ee7b7",
  background: "#0d1f17",
  borderBottom: "2px solid #134e33",
  borderRight: "1px solid #1a3a28",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const makeTd = (h: number, isEven: boolean, isLast: boolean): React.CSSProperties => ({
  height: h,
  padding: "8px 14px",
  fontSize: 13,
  color: "#cbd5e1",
  background: isEven ? "#111a14" : "#0d1510",
  borderBottom: "1px solid #1a2e20",
  borderRight: isLast ? "none" : "1px solid #1a2420",
  display: "flex",
  alignItems: "flex-start",
  whiteSpace: "pre-wrap",
  lineHeight: "1.5",
  overflow: "hidden",
});

const heightLabel: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 600,
  color: "#6ee7b7",
  background: "#064e3b",
  borderRadius: 3,
  padding: "1px 5px",
  marginLeft: 6,
  verticalAlign: "middle",
};

const CustomRowHeightsExample = () => {
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
      <h3 style={{ margin: "0 0 12px", color: "#6ee7b7", fontSize: 14 }}>Custom Row Heights — {data.length} rows (each row different size)</h3>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div style={{
            width: "100%", height: "100%",
            background: "repeating-linear-gradient(45deg, #0d2818, #0d2818 4px, #0f1f14 4px, #0f1f14 8px)",
            border: "2px dashed #22c55e",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#22c55e", fontWeight: 700,
          }}>
            Drop here
          </div>
        )}
        style={{
          height: 420,
          border: "2px solid #134e33",
          borderRadius: 10,
          overflow: "hidden",
          background: "#0d1510",
        }}
      >
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
            const isEven = ri % 2 === 0;
            return (
              <BodyRow key={row.id} id={row.id} index={ri} style={{ minHeight: h }}>
                {cols.map((col, ci) => (
                  <RowCell key={col.id} index={ci} style={makeTd(h, isEven, ci === cols.length - 1)}>
                    {ci === 0 ? (
                      <span>
                        {(row as any)[col.id]}
                        <span style={heightLabel}>{h}px</span>
                      </span>
                    ) : (
                      (row as any)[col.id]
                    )}
                  </RowCell>
                ))}
              </BodyRow>
            );
          })}
        </TableBody>
      </TableContainer>
    </div>
  );
};

export default CustomRowHeightsExample;
