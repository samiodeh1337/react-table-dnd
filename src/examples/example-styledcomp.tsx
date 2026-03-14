/**
 * Example: Styled-components — override styles using styled() on each component.
 * The className from styled() is forwarded to the inner element, so it
 * survives cloning during drag (the clone inherits the styles).
 *
 * npm install styled-components
 */
import React, { useCallback, useState, useMemo } from "react";
import styled from "styled-components";
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
} from "../Components";
import { generateRows, arrayMove } from "./example-data";

const StyledTable = styled(TableContainer)`
  height: 420px;
  border: 1px solid #1e3a5f;
  border-radius: 10px;
  background: #0c1929;
`;

const StyledCol = styled(ColumnCell)`
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #60a5fa;
  border-bottom: 2px solid #1e3a5f;
  background: #0f2440;
`;

const StyledRow = styled(BodyRow)``;

const StyledCell = styled(RowCell)`
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 16px;
  font-size: 13px;
  color: #93c5fd;
  background: #0c1929;
  border-bottom: 1px solid #1a2d45;
`;

const StyledCellAlt = styled(StyledCell)`
  background: #0a1525;
`;

const INIT_COLS = [
  { id: "name",       title: "Name",   width: 160 },
  { id: "role",       title: "Role",   width: 130 },
  { id: "status",     title: "Status", width: 110 },
  { id: "department", title: "Dept",   width: 130 },
  { id: "location",   title: "City",   width: 120 },
  { id: "score",      title: "Score",  width: 90  },
];

const StyledCompExample = () => {
  const [data, setData] = useState(() => generateRows(60));
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
      <p style={{ margin: "0 0 12px", color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>
        styled-components
      </p>
      <StyledTable options={options} onDragEnd={handleDragEnd}>
        <TableHeader>
          {cols.map((col, i) => (
            <StyledCol key={col.id} id={col.id} index={i} width={col.width}>
              {col.title}
            </StyledCol>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, ri) => (
            <StyledRow key={row.id} id={row.id} index={ri}>
              {cols.map((col, ci) => {
                const Cell = ri % 2 !== 0 ? StyledCellAlt : StyledCell;
                return (
                  <Cell key={col.id} index={ci} width={col.width}>
                    {row[col.id]}
                  </Cell>
                );
              })}
            </StyledRow>
          ))}
        </TableBody>
      </StyledTable>
    </div>
  );
};

export default StyledCompExample;
