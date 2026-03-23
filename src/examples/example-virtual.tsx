/**
 * Example: Virtual table — 10k rows, 20 columns, VERY HEAVY cells (stateful stress test)
 * Every cell has its own useState — inputs, checkboxes, selects, toggles, star editors.
 * Uses VirtualBody for row virtualization.
 */

import React, { useCallback, useState, useMemo, memo, useEffect, useRef } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  VirtualBody,
  BodyRow,
  RowCell,
} from '../Components'

// ── Data ──────────────────────────────────────────────

const COLUMN_DEFS = [
  { key: 'select', title: '' },
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Phone' },
  { key: 'company', title: 'Company' },
  { key: 'jobTitle', title: 'Job Title' },
  { key: 'department', title: 'Department' },
  { key: 'salary', title: 'Salary' },
  { key: 'age', title: 'Age' },
  { key: 'status', title: 'Status' },
  { key: 'score', title: 'Score' },
  { key: 'rating', title: 'Rating' },
  { key: 'startDate', title: 'Start Date' },
  { key: 'city', title: 'City' },
  { key: 'country', title: 'Country' },
  { key: 'active', title: 'Active' },
  { key: 'priority', title: 'Priority' },
  { key: 'tags', title: 'Tags' },
  { key: 'notes', title: 'Notes' },
]

const STATUSES = ['Active', 'Inactive', 'Pending', 'On Leave', 'Terminated']
const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'HR',
  'Finance',
  'Legal',
  'Support',
  'Product',
]
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const TAGS_POOL = ['vip', 'new', 'urgent', 'remote', 'part-time', 'contractor', 'lead']

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#14532d', text: '#86efac' },
  Inactive: { bg: '#1c1917', text: '#a8a29e' },
  Pending: { bg: '#1c1400', text: '#fbbf24' },
  'On Leave': { bg: '#1e1b4b', text: '#a5b4fc' },
  Terminated: { bg: '#450a0a', text: '#fca5a5' },
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
}

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#6366f1',
  Sales: '#f59e0b',
  Marketing: '#ec4899',
  HR: '#14b8a6',
  Finance: '#22c55e',
  Legal: '#8b5cf6',
  Support: '#0ea5e9',
  Product: '#f97316',
}

function generateData(count: number) {
  const rows = new Array(count)
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: `row-${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@company.com`,
      phone: `+1-555-${String(i % 10000).padStart(4, '0')}`,
      company: `Company ${i}`,
      jobTitle: `Title ${i % 200}`,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      city: `City ${i}`,
      country: `Country ${i % 30}`,
      age: 18 + (i % 62),
      salary: (30 + (i % 170)) * 1000,
      startDate: `2020-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      status: STATUSES[i % STATUSES.length],
      score: i % 101,
      rating: 1 + (i % 5),
      active: i % 3 !== 0,
      priority: PRIORITIES[i % PRIORITIES.length],
      tags: TAGS_POOL.slice(0, 1 + (i % 3)),
      notes: `Note for row ${i}. This is editable text.`,
    }
  }
  return rows
}

type Row = ReturnType<typeof generateData>[number]

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// ── Stateful heavy cells ───────────────────────────────

// Checkbox with local state
const CheckboxCell = memo(({ initial }: { initial: boolean }) => {
  const [checked, setChecked] = useState(initial)
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#6366f1' }}
    />
  )
})

// Editable text input with focus state
const EditableText = memo(({ initial }: { initial: string }) => {
  const [value, setValue] = useState(initial)
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        background: focused ? '#1e1e2e' : 'transparent',
        border: focused ? '1px solid #6366f1' : '1px solid transparent',
        borderRadius: 4,
        color: '#cbd5e1',
        fontSize: 12,
        padding: '2px 6px',
        outline: 'none',
        transition: 'border-color 150ms',
      }}
    />
  )
})

// Select dropdown with local state
const SelectCell = memo(({ initial, options }: { initial: string; options: string[] }) => {
  const [value, setValue] = useState(initial)
  const colors = STATUS_COLORS[value] ?? PRIORITY_COLORS[value]
  const textColor =
    typeof colors === 'string' ? colors : ((colors as { text: string })?.text ?? '#94a3b8')
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{
        background: '#1e1e24',
        border: '1px solid #2e2e36',
        borderRadius: 4,
        color: textColor,
        fontSize: 11,
        padding: '2px 4px',
        cursor: 'pointer',
        outline: 'none',
        width: '100%',
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
})

// Toggle switch with local state
const ToggleCell = memo(({ initial }: { initial: boolean }) => {
  const [on, setOn] = useState(initial)
  return (
    <div
      onClick={() => setOn((v) => !v)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        cursor: 'pointer',
        background: on ? '#6366f1' : '#374151',
        position: 'relative',
        transition: 'background 200ms',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 200ms',
        }}
      />
    </div>
  )
})

// Interactive star rating with hover + state
const StarEditor = memo(({ initial }: { initial: number }) => {
  const [rating, setRating] = useState(initial)
  const [hovered, setHovered] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => setRating(s)}
          style={{
            fontSize: 14,
            cursor: 'pointer',
            color: s <= (hovered || rating) ? '#fbbf24' : '#374151',
            transition: 'color 100ms',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
})

// Score slider with local state
const ScoreSlider = memo(({ initial }: { initial: number }) => {
  const [value, setValue] = useState(initial)
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ flex: 1, accentColor: color, cursor: 'pointer' }}
      />
      <span style={{ fontSize: 11, color, width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
})

// Tags with add/remove local state
const TagsCell = memo(({ initial }: { initial: string[] }) => {
  const [tags, setTags] = useState(initial)
  const remove = useCallback((t: string) => setTags((prev) => prev.filter((x) => x !== t)), [])
  const add = useCallback(() => {
    const next = TAGS_POOL.find((t) => !tags.includes(t))
    if (next) setTags((prev) => [...prev, next])
  }, [tags])
  return (
    <div
      style={{
        display: 'flex',
        gap: 3,
        flexWrap: 'nowrap',
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      {tags.map((t) => (
        <span
          key={t}
          onClick={() => remove(t)}
          style={{
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: 10,
            cursor: 'pointer',
            background: '#2e2e3e',
            color: '#a5b4fc',
            border: '1px solid #3e3e5e',
            flexShrink: 0,
          }}
        >
          {t} ×
        </span>
      ))}
      {tags.length < 3 && (
        <span
          onClick={add}
          style={{ fontSize: 10, color: '#4b5563', cursor: 'pointer', flexShrink: 0 }}
        >
          +
        </span>
      )}
    </div>
  )
})

// Date picker with local state
const DateCell = memo(({ initial }: { initial: string }) => {
  const [value, setValue] = useState(initial)
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{
        background: '#1e1e24',
        border: '1px solid #2e2e36',
        borderRadius: 4,
        color: '#94a3b8',
        fontSize: 11,
        padding: '2px 4px',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
      }}
    />
  )
})

// Salary input with local state
const SalaryInput = memo(({ initial }: { initial: number }) => {
  const [value, setValue] = useState(String(initial))
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ color: '#22c55e', fontSize: 11 }}>$</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: 70,
          background: focused ? '#1e1e2e' : 'transparent',
          border: focused ? '1px solid #22c55e' : '1px solid transparent',
          borderRadius: 4,
          color: '#22c55e',
          fontSize: 12,
          padding: '2px 4px',
          outline: 'none',
        }}
      />
    </div>
  )
})

// Avatar (stateless but heavy DOM)
const Avatar = memo(({ name }: { name: string }) => {
  const initials = name.slice(0, 2).toUpperCase()
  const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1) * 13) % 360
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        background: `hsl(${hue},55%,30%)`,
        color: `hsl(${hue},80%,80%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        marginRight: 6,
        border: `2px solid hsl(${hue},55%,45%)`,
      }}
    >
      {initials}
    </div>
  )
})

// Notes textarea that expands on focus
const NotesCell = memo(({ initial }: { initial: string }) => {
  const [value, setValue] = useState(initial)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.height = focused ? '60px' : '20px'
  }, [focused])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        height: 20,
        background: focused ? '#1e1e2e' : 'transparent',
        border: focused ? '1px solid #6366f1' : '1px solid transparent',
        borderRadius: 4,
        color: '#94a3b8',
        fontSize: 11,
        padding: '2px 6px',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        transition: 'height 150ms, border-color 150ms',
        fontFamily: 'inherit',
      }}
    />
  )
})

// ── Cell dispatcher ────────────────────────────────────

const CellContent = memo(({ colKey, row }: { colKey: string; row: Row }) => {
  switch (colKey) {
    case 'select':
      return <CheckboxCell initial={false} />
    case 'firstName':
      return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Avatar name={row.firstName + row.lastName} />
          <EditableText initial={row.firstName} />
        </div>
      )
    case 'lastName':
    case 'email':
    case 'phone':
    case 'company':
    case 'jobTitle':
    case 'city':
    case 'country':
      return <EditableText initial={String(row[colKey as keyof Row])} />
    case 'status':
      return <SelectCell initial={row.status} options={STATUSES} />
    case 'department':
      return (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 4,
            fontSize: 11,
            flexShrink: 0,
            background: `${DEPT_COLORS[row.department] ?? '#4b5563'}20`,
            color: DEPT_COLORS[row.department] ?? '#94a3b8',
            border: `1px solid ${DEPT_COLORS[row.department] ?? '#4b5563'}40`,
          }}
        >
          {row.department}
        </span>
      )
    case 'salary':
      return <SalaryInput initial={row.salary} />
    case 'age':
      return <EditableText initial={String(row.age)} />
    case 'score':
      return <ScoreSlider initial={row.score} />
    case 'rating':
      return <StarEditor initial={row.rating} />
    case 'startDate':
      return <DateCell initial={row.startDate} />
    case 'active':
      return <ToggleCell initial={row.active} />
    case 'priority':
      return <SelectCell initial={row.priority} options={PRIORITIES} />
    case 'tags':
      return <TagsCell initial={row.tags} />
    case 'notes':
      return <NotesCell initial={row.notes} />
    default:
      return (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>
          {String(row[colKey as keyof Row])}
        </span>
      )
  }
})

// ── Styles ────────────────────────────────────────────

const COL_WIDTHS: Record<string, number> = {
  select: 40,
  firstName: 160,
  lastName: 120,
  email: 180,
  phone: 140,
  company: 130,
  jobTitle: 130,
  department: 130,
  salary: 120,
  age: 80,
  status: 120,
  score: 130,
  rating: 110,
  startDate: 130,
  city: 100,
  country: 100,
  active: 70,
  priority: 110,
  tags: 160,
  notes: 180,
}

const thStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 40,
  padding: '0 10px',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  background: '#0f0f13',
  borderBottom: '1px solid #1e1e28',
  borderRight: '1px solid #1e1e28',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flexShrink: 0,
}

const tdStyle: React.CSSProperties = {
  height: 44,
  padding: '0 10px',
  fontSize: 13,
  color: '#cbd5e1',
  background: '#111116',
  borderBottom: '1px solid #1a1a22',
  borderRight: '1px solid #1a1a22',
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  flexShrink: 0,
}

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#1a1a2e',
  border: '2px dashed #6366f1',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: '#818cf8',
  fontWeight: 500,
}

// ── Component ─────────────────────────────────────────

const ROW_HEIGHT = 44

const VirtualExample = () => {
  const [data, setData] = useState(() => generateData(1_000_000))
  const [cols, setCols] = useState(() =>
    COLUMN_DEFS.map((def, i) => ({ ...def, id: `col-${i}`, width: COL_WIDTHS[def.key] ?? 130 })),
  )

  const options = useMemo(() => ({ columnDragRange: { start: 1 }, rowDragRange: { start: 0 } }), [])

  const handleDragEnd = useCallback(
    (result: { sourceIndex: number; targetIndex: number; dragType: 'row' | 'column' }) => {
      if (result.sourceIndex === result.targetIndex) return
      if (result.dragType === 'row') {
        setData((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
      } else {
        setCols((prev) => arrayMove(prev, result.sourceIndex, result.targetIndex))
      }
    },
    [],
  )

  const renderRow = useCallback(
    (index: number, style: React.CSSProperties) => {
      const row = data[index]
      return (
        <BodyRow id={row.id} index={index} styles={style}>
          {cols.map((col, ci) => (
            <RowCell key={col.id} index={ci} style={{ ...tdStyle, width: col.width }}>
              <CellContent key={row.id} colKey={col.key} row={row} />
            </RowCell>
          ))}
        </BodyRow>
      )
    },
    [data, cols],
  )

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 10px', color: '#e4e4e7', fontSize: 14 }}>
        Virtual (stateful) — {data.length.toLocaleString()} rows × {cols.length} cols
        <span style={{ marginLeft: 12, fontSize: 11, color: '#4b5563', fontWeight: 400 }}>
          every cell has useState — inputs, selects, toggles, sliders, stars, tags
        </span>
      </h3>
      <TableContainer
        options={options}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => <div style={placeholderStyle}>Drop here</div>}
        style={{ height: 500, border: '1px solid #1e1e28', borderRadius: 8 }}
      >
        <TableHeader>
          {cols.map((col, i) => (
            <ColumnCell key={col.id} id={col.id} index={i} style={{ ...thStyle, width: col.width }}>
              {col.title}
            </ColumnCell>
          ))}
        </TableHeader>
        <VirtualBody rowCount={data.length} rowHeight={ROW_HEIGHT} renderRow={renderRow} />
      </TableContainer>
    </div>
  )
}

export default VirtualExample
