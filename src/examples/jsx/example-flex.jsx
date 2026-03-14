import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";

function generateRows(count) {
  const ROLES = ["Engineer","Designer","PM","QA","DevOps","Analyst","Lead","Manager"];
  const STATUSES = ["Active","Inactive","On Leave","Pending","Terminated"];
  const DEPTS = ["Engineering","Design","Product","Marketing","Sales","HR","Finance","Support"];
  const CITIES = ["New York","London","Berlin","Tokyo","Sydney","Toronto","Mumbai","Paris"];
  const FIRST = ["Alice","Bob","Carol","Dan","Eve","Frank","Grace","Hank","Ivy","Jack"];
  const LAST = ["Johnson","Smith","White","Brown","Davis","Lee","Kim","Miller","Chen","Park"];
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    email: `${FIRST[i % FIRST.length].toLowerCase()}${i}@company.com`,
    department: DEPTS[i % DEPTS.length],
    location: CITIES[i % CITIES.length],
    salary: `$${40 + (i % 160)}k`,
    joined: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, "0")}`,
    score: i % 101,
  }));
}

function arrayMove(arr, from, to) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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
