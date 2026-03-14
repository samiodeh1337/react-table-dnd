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
