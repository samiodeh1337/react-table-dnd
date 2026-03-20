import React, { useCallback, useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  DragHandle,
} from 'react-table-dnd'

function arrayMove(arr, from, to) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const ROLES = ['Engineer', 'Designer', 'PM', 'QA', 'DevOps', 'Analyst', 'Lead', 'Manager']
const STATUSES = ['Active', 'Inactive', 'On Leave', 'Pending', 'Terminated']
const DEPTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Support']
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Mumbai', 'Paris']
const FIRST = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const LAST = ['Johnson', 'Smith', 'White', 'Brown', 'Davis', 'Lee', 'Kim', 'Miller', 'Chen', 'Park']

function generateRows(count) {
  const rows = new Array(count)
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]
    rows[i] = {
      id: `row-${i}`,
      name: `${first} ${last}`,
      role: ROLES[i % ROLES.length],
      status: STATUSES[i % STATUSES.length],
      email: `${first.toLowerCase()}${i}@company.com`,
      department: DEPTS[i % DEPTS.length],
      location: CITIES[i % CITIES.length],
      salary: `${40 + (i % 160)}k`,
      joined: `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}`,
      score: i % 101,
    }
  }
  return rows
}

const INIT_COLS = [
  { id: '_handle', title: '', width: 40 },
  { id: 'name', title: 'Name', width: 200 },
  { id: 'role', title: 'Role', width: 130 },
  { id: 'status', title: 'Status', width: 120 },
  { id: 'department', title: 'Department', width: 140 },
  { id: 'email', title: 'Email', width: 200 },
  { id: 'location', title: 'Location', width: 130 },
  { id: 'salary', title: 'Salary', width: 100 },
  { id: 'joined', title: 'Joined', width: 110 },
  { id: 'score', title: 'Score', width: 120 },
]

const ALWAYS_PINNED = new Set(['_handle'])

const STATUS_MAP = {
  Active: { bg: '#052e1f', color: '#34d399', dot: '#10b981' },
  Inactive: { bg: '#2a1215', color: '#f87171', dot: '#ef4444' },
  'On Leave': { bg: '#2a1f05', color: '#fbbf24', dot: '#f59e0b' },
  Pending: { bg: '#0c1a2e', color: '#60a5fa', dot: '#3b82f6' },
  Terminated: { bg: '#1a0c2e', color: '#a78bfa', dot: '#8b5cf6' },
}

const ROLE_COLORS = {
  Engineer: '#818cf8',
  Designer: '#f472b6',
  PM: '#34d399',
  QA: '#fbbf24',
  DevOps: '#60a5fa',
  Analyst: '#fb923c',
  Lead: '#a78bfa',
  Manager: '#2dd4bf',
}

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f43f5e', '#22c55e',
]

function stableHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const GripIcon = ({ style }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.3, flexShrink: 0, ...style }}>
    <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
  </svg>
)

const PinIconSvg = ({ filled = false, size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z" />
  </svg>
)

const thStyle = {
  display: 'flex', alignItems: 'center', gap: 8, height: 42,
  padding: '0 12px 0 16px', fontSize: 12, fontWeight: 600,
  color: '#94a3b8', background: '#0f172a', borderBottom: '2px solid #1e293b',
  letterSpacing: '0.04em',
}
const thPinnedStyle = { ...thStyle, background: '#0a1120', color: '#64748b' }
const tdStyle = {
  height: 48, padding: '0 16px', fontSize: 13, color: '#e2e8f0',
  display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e293b',
}
const tdPinnedStyle = { ...tdStyle, background: '#0a1120' }
const handleStyle = { display: 'flex', alignItems: 'center', padding: '0 2px' }

const MenuItem = ({ children, onClick, danger }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ padding: '7px 10px', fontSize: 12, fontWeight: 500, color: danger ? '#f87171' : '#cbd5e1', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', background: hovered ? (danger ? '#2a1215' : '#1e293b') : 'transparent', transition: 'background 0.1s' }}>
      {children}
    </div>
  )
}

const Avatar = ({ name }) => {
  const initials = name.split(' ').map((n) => n[0]).join('')
  const bg = AVATAR_COLORS[stableHash(name) % AVATAR_COLORS.length]
  return (
    <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 10 }}>
      {initials}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { bg: '#1e293b', color: '#94a3b8', dot: '#64748b' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.dot }} />
      {status}
    </span>
  )
}

const RoleChip = ({ role }) => {
  const color = ROLE_COLORS[role] || '#94a3b8'
  return (
    <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {role}
    </span>
  )
}

const ScoreBar = ({ score }) => {
  const color = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#1e293b', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

const Placeholder = () => (
  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '2px dashed #6366f1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#818cf8', fontWeight: 600 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
    Drop here
  </div>
)

const HintPill = ({ icon, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#1e293b', color: '#94a3b8', fontSize: 12, fontWeight: 500, lineHeight: 1 }}>
    {icon}{children}
  </span>
)

const renderCell = (row, colId) => {
  if (colId === 'name') return <><Avatar name={row.name} /><span style={{ fontWeight: 500 }}>{row.name}</span></>
  if (colId === 'role') return <RoleChip role={row.role} />
  if (colId === 'status') return <StatusBadge status={row.status} />
  if (colId === 'score') return <ScoreBar score={row.score} />
  if (colId === 'salary') return <span style={{ color: '#34d399', fontWeight: 600 }}>{row.salary}</span>
  if (colId === 'joined') return <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{row.joined}</span>
  return <span style={{ color: '#94a3b8' }}>{row[colId]}</span>
}

export default function ShowcaseExample() {
  const [data, setData] = useState(() => generateRows(80))
  const [cols, setCols] = useState(INIT_COLS)
  const [pinnedLeft, setPinnedLeft] = useState(new Set(['_handle']))
  const [pinnedRight, setPinnedRight] = useState(new Set())
  const [activeMenu, setActiveMenu] = useState(null)
  const [menuRect, setMenuRect] = useState(null)

  useEffect(() => {
    if (!activeMenu) return
    const handler = () => setActiveMenu(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeMenu])

  const options = useMemo(
    () => ({
      columnDragRange: { start: pinnedLeft.size, end: cols.length - 1 - pinnedRight.size },
      rowDragRange: {},
    }),
    [cols.length, pinnedLeft.size, pinnedRight.size],
  )

  const getStickyLeft = useCallback(
    (index) => {
      let offset = 0
      for (let i = 0; i < index; i++) {
        if (pinnedLeft.has(cols[i].id)) offset += cols[i].width || 100
      }
      return offset
    },
    [cols, pinnedLeft],
  )

  const getStickyRight = useCallback(
    (index) => {
      let offset = 0
      for (let i = cols.length - 1; i > index; i--) {
        if (pinnedRight.has(cols[i].id)) offset += cols[i].width || 100
      }
      return offset
    },
    [cols, pinnedRight],
  )

  const openMenu = useCallback((colId, e) => {
    e.stopPropagation()
    setActiveMenu((prev) => (prev === colId ? null : colId))
    setMenuRect(e.currentTarget.getBoundingClientRect())
  }, [])

  const pinLeft = useCallback(
    (colId) => {
      const currentIndex = cols.findIndex((c) => c.id === colId)
      const targetIndex = pinnedLeft.size
      if (currentIndex !== targetIndex) setCols((p) => arrayMove(p, currentIndex, targetIndex))
      setPinnedLeft((p) => new Set([...p, colId]))
      setPinnedRight((p) => { const s = new Set(p); s.delete(colId); return s })
      setActiveMenu(null)
    },
    [cols, pinnedLeft.size],
  )

  const pinRight = useCallback(
    (colId) => {
      const currentIndex = cols.findIndex((c) => c.id === colId)
      const targetIndex = cols.length - 1 - pinnedRight.size
      if (currentIndex !== targetIndex) setCols((p) => arrayMove(p, currentIndex, targetIndex))
      setPinnedRight((p) => new Set([...p, colId]))
      setPinnedLeft((p) => { const s = new Set(p); s.delete(colId); return s })
      setActiveMenu(null)
    },
    [cols, pinnedRight.size],
  )

  const unpin = useCallback(
    (colId) => {
      const currentIndex = cols.findIndex((c) => c.id === colId)
      if (pinnedLeft.has(colId)) {
        const targetIndex = pinnedLeft.size - 1
        if (currentIndex !== targetIndex) setCols((p) => arrayMove(p, currentIndex, targetIndex))
        setPinnedLeft((p) => { const s = new Set(p); s.delete(colId); return s })
      } else {
        const targetIndex = cols.length - pinnedRight.size
        if (currentIndex !== targetIndex) setCols((p) => arrayMove(p, currentIndex, targetIndex))
        setPinnedRight((p) => { const s = new Set(p); s.delete(colId); return s })
      }
      setActiveMenu(null)
    },
    [cols, pinnedLeft, pinnedRight],
  )

  const stripeSet = useMemo(() => {
    const s = new Set()
    data.forEach((r, i) => { if (i % 2 === 1) s.add(r.id) })
    return s
  }, [data])

  const handleDragEnd = useCallback(({ sourceIndex, targetIndex, dragType }) => {
    if (sourceIndex === targetIndex) return
    if (dragType === 'row') setData((p) => arrayMove(p, sourceIndex, targetIndex))
    else setCols((p) => arrayMove(p, sourceIndex, targetIndex))
  }, [])

  const activeMenuIsPinned = !!activeMenu && (pinnedLeft.has(activeMenu) || pinnedRight.has(activeMenu))

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M7 10l5-5 5 5M7 14l5 5 5-5" /></svg>}>Grip to drag rows</HintPill>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M10 7l-5 5 5 5M14 7l5 5-5 5" /></svg>}>Grip to drag columns</HintPill>
        <HintPill icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>}>Mobile: long-press to start</HintPill>
        <HintPill icon={<PinIconSvg size={11} />}>Pin columns via header icon</HintPill>
      </div>

      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => <Placeholder />}
        style={{ height: 460, borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b', background: '#0f172a', boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
      >
        <TableHeader>
          {cols.map((col, i) => {
            const leftPinned = pinnedLeft.has(col.id)
            const rightPinned = pinnedRight.has(col.id)
            const colIsPinned = leftPinned || rightPinned
            const alwaysPinned = ALWAYS_PINNED.has(col.id)

            const stickyStyle = leftPinned
              ? { position: 'sticky', left: getStickyLeft(i), zIndex: 2, flex: `0 0 ${col.width}px` }
              : rightPinned
                ? { position: 'sticky', right: getStickyRight(i), zIndex: 2, flex: `0 0 ${col.width}px` }
                : undefined

            const cell = (
              <ColumnCell key={col.id} id={col.id} index={i} style={{ ...(colIsPinned ? thPinnedStyle : thStyle), width: col.width }}>
                {col.id === '_handle' ? (
                  <span style={{ opacity: 0.25, color: '#94a3b8' }}><PinIconSvg /></span>
                ) : (
                  <>
                    {!colIsPinned && <DragHandle style={handleStyle}><GripIcon style={{ opacity: 0.25 }} /></DragHandle>}
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.title}</span>
                    {!alwaysPinned && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => openMenu(col.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center', color: colIsPinned ? '#6366f1' : '#334155', borderRadius: 4, flexShrink: 0, lineHeight: 0, opacity: colIsPinned ? 1 : 0.6 }}
                        title={colIsPinned ? 'Unpin column' : 'Pin column'}
                      >
                        <PinIconSvg filled={colIsPinned} />
                      </button>
                    )}
                  </>
                )}
              </ColumnCell>
            )

            return stickyStyle ? <div key={col.id} style={stickyStyle}>{cell}</div> : cell
          })}
        </TableHeader>

        <TableBody>
          {data.map((row) => {
            const bg = stripeSet.has(row.id) ? '#131c2e' : '#0f172a'
            return (
              <BodyRow key={row.id} id={row.id} index={data.indexOf(row)}>
                {cols.map((col, ci) => {
                  const leftPinned = pinnedLeft.has(col.id)
                  const rightPinned = pinnedRight.has(col.id)
                  const colIsPinned = leftPinned || rightPinned
                  return (
                    <RowCell
                      key={col.id}
                      index={ci}
                      style={{
                        ...(colIsPinned ? tdPinnedStyle : tdStyle),
                        background: colIsPinned ? '#0a1120' : bg,
                        ...(col.id === '_handle' ? { justifyContent: 'center', padding: '0 8px' } : {}),
                        ...(leftPinned
                          ? { position: 'sticky', left: getStickyLeft(ci), zIndex: 1, flex: `0 0 ${col.width}px` }
                          : rightPinned
                            ? { position: 'sticky', right: getStickyRight(ci), zIndex: 1, flex: `0 0 ${col.width}px` }
                            : {}),
                      }}
                    >
                      {col.id === '_handle' ? (
                        <DragHandle style={handleStyle}><GripIcon /></DragHandle>
                      ) : (
                        renderCell(row, col.id)
                      )}
                    </RowCell>
                  )
                })}
              </BodyRow>
            )
          })}
        </TableBody>
      </TableContainer>

      {activeMenu && menuRect && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: menuRect.bottom + 4, left: Math.max(4, menuRect.right - 148), zIndex: 9999, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '4px', boxShadow: '0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)', minWidth: 148 }}
        >
          {!pinnedLeft.has(activeMenu) && (
            <MenuItem onClick={() => pinLeft(activeMenu)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
              Pin Left
            </MenuItem>
          )}
          {!pinnedRight.has(activeMenu) && (
            <MenuItem onClick={() => pinRight(activeMenu)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M19 12l-7-7M19 12l-7 7" /></svg>
              Pin Right
            </MenuItem>
          )}
          {activeMenuIsPinned && (
            <>
              <div style={{ height: 1, background: '#1e293b', margin: '3px 4px' }} />
              <MenuItem onClick={() => unpin(activeMenu)} danger>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Unpin
              </MenuItem>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
