/**
 * Example: Showcase — polished dark theme with status badges, score bars,
 * avatar initials, role chips, gradient header, hover highlights, and
 * a custom "Drop here" placeholder.
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
import { generateRows, arrayMove, Row } from "./example-data";

const INIT_COLS = [
  { id: "name",       title: "Name",       width: 200 },
  { id: "role",       title: "Role",       width: 130 },
  { id: "status",     title: "Status",     width: 120 },
  { id: "department", title: "Department", width: 140 },
  { id: "score",      title: "Score",      width: 120 },
];

const STATUS: Record<string, { bg: string; color: string; dot: string }> = {
  Active:     { bg: "#052e1f", color: "#34d399", dot: "#10b981" },
  Inactive:   { bg: "#2a1215", color: "#f87171", dot: "#ef4444" },
  "On Leave": { bg: "#2a1f05", color: "#fbbf24", dot: "#f59e0b" },
  Pending:    { bg: "#0c1a2e", color: "#60a5fa", dot: "#3b82f6" },
  Terminated: { bg: "#1a0c2e", color: "#a78bfa", dot: "#8b5cf6" },
};

const ROLE_COLORS: Record<string, string> = {
  Engineer: "#818cf8", Designer: "#f472b6", PM: "#34d399", QA: "#fbbf24",
  DevOps: "#60a5fa", Analyst: "#fb923c", Lead: "#a78bfa", Manager: "#2dd4bf",
};

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#06b6d4", "#f43f5e", "#22c55e"];

// Stable hash from string → number (so colors don't shift on reorder)
const stableHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const GripIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.3, flexShrink: 0, ...style }}>
    <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
    <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
    <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
);

const thStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px",
  fontSize: 12, fontWeight: 600, color: "#94a3b8",
  background: "#0f172a",
  borderBottom: "2px solid #1e293b",
  letterSpacing: "0.04em", cursor: "grab",
};

const tdStyle: React.CSSProperties = {
  height: 48, padding: "0 16px", fontSize: 13, color: "#e2e8f0",
  display: "flex", alignItems: "center", borderBottom: "1px solid #1e293b",
};

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const bg = AVATAR_COLORS[stableHash(name) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
      marginRight: 10,
    }}>
      {initials}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? { bg: "#1e293b", color: "#94a3b8", dot: "#64748b" };
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

const RoleChip = ({ role }: { role: string }) => {
  const color = ROLE_COLORS[role] ?? "#94a3b8";
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

const ScoreBar = ({ score }: { score: number }) => {
  const color = score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#1e293b", overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
};

const Placeholder = () => (
  <div style={{
    width: "100%", height: "100%",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "2px dashed #6366f1", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, fontSize: 13, color: "#818cf8", fontWeight: 600,
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
    Drop here
  </div>
);

const HintPill = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: 8,
    background: "#1e293b", color: "#94a3b8",
    fontSize: 12, fontWeight: 500, lineHeight: 1,
  }}>
    {icon}{children}
  </span>
);

const ShowcaseExample = () => {
  const [data, setData] = useState(() => generateRows(80));
  const [cols, setCols] = useState(INIT_COLS);
  const options = useMemo(() => ({ columnDragRange: {}, rowDragRange: {} }), []);

  // Stable stripe: based on row id, not render index
  const stripeSet = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r, i) => { if (i % 2 === 1) s.add(r.id); });
    return s;
  }, [data]);

  const handleDragEnd = useCallback(
    (r: { sourceIndex: number; targetIndex: number; dragType: string }) => {
      if (r.sourceIndex === r.targetIndex) return;
      if (r.dragType === "row") setData((p) => arrayMove(p, r.sourceIndex, r.targetIndex));
      else setCols((p) => arrayMove(p, r.sourceIndex, r.targetIndex));
    }, []
  );

  const renderCell = (row: Row, colId: string) => {
    if (colId === "name") return <><Avatar name={String(row.name)} /><span style={{ fontWeight: 500 }}>{row.name}</span></>;
    if (colId === "role") return <RoleChip role={String(row.role)} />;
    if (colId === "status") return <StatusBadge status={String(row.status)} />;
    if (colId === "score") return <ScoreBar score={Number(row.score)} />;
    return <span style={{ color: "#94a3b8" }}>{row[colId]}</span>;
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"/></svg>}>
          Drag rows up / down
        </HintPill>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M10 7l-5 5 5 5M14 7l5 5-5 5"/></svg>}>
          Drag column headers left / right
        </HintPill>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>}>
          Mobile: long-press to start
        </HintPill>
      </div>
      <TableContainer
        options={options} onDragEnd={handleDragEnd}
        renderPlaceholder={() => <Placeholder />}
        style={{
          height: 460, borderRadius: 12, overflow: "hidden",
          border: "1px solid #1e293b", background: "#0f172a",
          boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
        }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} width={col.width} style={thStyle}>
              <GripIcon style={{ opacity: 0.25 }} />
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isStripe = stripeSet.has(row.id);
            const bg = isStripe ? "#131c2e" : "#0f172a";
            return (
              <BodyRow key={row.id} id={row.id} index={data.indexOf(row)}>
                {cols.map((col, ci) => (
                  <RowCell key={col.id} index={ci} width={col.width}
                    style={{ ...tdStyle, background: bg, cursor: "grab", ...(ci === 0 ? { gap: 8 } : {}) }}>
                    {ci === 0 && <GripIcon />}
                    {renderCell(row, col.id)}
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

export default ShowcaseExample;
