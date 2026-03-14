import React, { useCallback, useState, useMemo } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";

function arrayMove(arr, from, to) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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

const COLS = [
  { id: "name",       title: "Name",       width: 200 },
  { id: "role",       title: "Role",       width: 130 },
  { id: "status",     title: "Status",     width: 120 },
  { id: "department", title: "Department", width: 140 },
  { id: "score",      title: "Score",      width: 120 },
];

const STATUS = {
  Active:     { bg: "#052e1f", color: "#34d399", dot: "#10b981" },
  Inactive:   { bg: "#2a1215", color: "#f87171", dot: "#ef4444" },
  "On Leave": { bg: "#2a1f05", color: "#fbbf24", dot: "#f59e0b" },
  Pending:    { bg: "#0c1a2e", color: "#60a5fa", dot: "#3b82f6" },
  Terminated: { bg: "#1a0c2e", color: "#a78bfa", dot: "#8b5cf6" },
};

const ROLE_COLORS = {
  Engineer: "#818cf8", Designer: "#f472b6", PM: "#34d399", QA: "#fbbf24",
  DevOps: "#60a5fa", Analyst: "#fb923c", Lead: "#a78bfa", Manager: "#2dd4bf",
};

const AVATAR_COLORS = ["#6366f1","#ec4899","#14b8a6","#f59e0b","#8b5cf6","#06b6d4","#f43f5e","#22c55e"];

const th = {
  display: "flex", alignItems: "center", height: 48, padding: "0 18px",
  fontSize: 11, fontWeight: 700, color: "#64748b",
  background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  borderBottom: "1px solid #334155", textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const td = {
  height: 52, padding: "0 18px", fontSize: 13, color: "#e2e8f0",
  display: "flex", alignItems: "center", borderBottom: "1px solid #1e293b",
};

const Avatar = ({ name, index }) => {
  const initials = name.split(" ").map((n) => n[0]).join("");
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, marginRight: 10,
    }}>
      {initials}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || { bg: "#1e293b", color: "#94a3b8", dot: "#64748b" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.dot }} />
      {status}
    </span>
  );
};

const RoleChip = ({ role }) => {
  const color = ROLE_COLORS[role] || "#94a3b8";
  return (
    <span style={{
      display: "inline-flex", padding: "2px 10px", borderRadius: 6,
      fontSize: 12, fontWeight: 500, color,
      background: `${color}18`, border: `1px solid ${color}30`,
    }}>
      {role}
    </span>
  );
};

const ScoreBar = ({ score }) => {
  const color = score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#1e293b", overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
};

const renderCell = (row, colId, ri) => {
  if (colId === "name") return <><Avatar name={row.name} index={ri} /><span style={{ fontWeight: 500 }}>{row.name}</span></>;
  if (colId === "role") return <RoleChip role={row.role} />;
  if (colId === "status") return <StatusBadge status={row.status} />;
  if (colId === "score") return <ScoreBar score={row.score} />;
  return <span style={{ color: "#94a3b8" }}>{row[colId]}</span>;
};

export default function ShowcaseExample() {
  const [data, setData] = useState(() => generateRows(80));
  const [cols, setCols] = useState(COLS);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return;
    if (dragType === "row") setData((p) => arrayMove(p, sourceIndex, targetIndex));
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex));
  }, []);

  return (
    <TableContainer
      options={options}
      onDragEnd={handleDragEnd}
      renderPlaceholder={() => (
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          border: "2px dashed #6366f1", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, fontSize: 13, color: "#818cf8", fontWeight: 600,
        }}>
          Drop here
        </div>
      )}
      style={{
        height: 460, borderRadius: 12, overflow: "hidden",
        border: "1px solid #1e293b", background: "#0f172a",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
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
        {data.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci} width={col.width}
                style={{ ...td, background: ri % 2 === 0 ? "#0f172a" : "#131c2e" }}>
                {renderCell(row, col.id, ri)}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
