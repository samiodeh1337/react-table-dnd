// The home page table: a realistic "team members" list with checkbox selection, three rows ticked
// up front so the group drag is one gesture away. Styled only with Tailwind classes on the library
// components, with colours defined for both themes.
import { useMemo, useState } from 'react'
import { ArrowLeftRightIcon, GripVerticalIcon, ListChecksIcon, XIcon } from 'lucide-react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  SelectHandle,
  moveRowsById,
  type DragEndResult,
} from '../Components'
import { Badge } from '@/docs/components/ui/badge'
import { Button } from '@/docs/components/ui/button'
import { Checkbox } from '@/docs/components/ui/checkbox'
import { Kbd } from '@/docs/components/ui/kbd'
import { cn } from '@/docs/lib/utils'

type Status = 'Active' | 'Away' | 'Offline'
interface Member {
  id: string
  name: string
  email: string
  role: string
  team: string
  status: Status
  seen: string
  hue: number // avatar colour
}

const MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Alice Johnson',
    email: 'alice@acme.dev',
    role: 'Engineer',
    team: 'Platform',
    status: 'Active',
    seen: 'now',
    hue: 262,
  },
  {
    id: 'm2',
    name: 'Bob Martinez',
    email: 'bob@acme.dev',
    role: 'Designer',
    team: 'Growth',
    status: 'Away',
    seen: '12m ago',
    hue: 20,
  },
  {
    id: 'm3',
    name: 'Carol Chen',
    email: 'carol@acme.dev',
    role: 'Product',
    team: 'Platform',
    status: 'Active',
    seen: 'now',
    hue: 160,
  },
  {
    id: 'm4',
    name: 'Dan Okafor',
    email: 'dan@acme.dev',
    role: 'Engineer',
    team: 'Payments',
    status: 'Offline',
    seen: '3h ago',
    hue: 220,
  },
  {
    id: 'm5',
    name: 'Eve Novak',
    email: 'eve@acme.dev',
    role: 'Analyst',
    team: 'Growth',
    status: 'Active',
    seen: '2m ago',
    hue: 330,
  },
  {
    id: 'm6',
    name: 'Farid Haddad',
    email: 'farid@acme.dev',
    role: 'Engineer',
    team: 'Payments',
    status: 'Away',
    seen: '40m ago',
    hue: 80,
  },
]

/** Three rows, not next to each other, so the fold into one card is easy to see. */
const PRESELECTED = ['m2', 'm4', 'm5']

const ROLE_STYLE: Record<string, string> = {
  Engineer:
    'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-400/25',
  Designer:
    'bg-pink-500/10 text-pink-700 ring-pink-500/20 dark:text-pink-300 dark:ring-pink-400/25',
  Product:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/25',
  Analyst:
    'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300 dark:ring-amber-400/25',
}
const STATUS_DOT: Record<Status, string> = {
  Active: 'bg-emerald-500',
  Away: 'bg-amber-500',
  Offline: 'bg-muted-foreground/40',
}

interface Col {
  id: 'member' | 'role' | 'status' | 'team' | 'seen'
  label: string
  width: number
}
const COLS: Col[] = [
  { id: 'member', label: 'Member', width: 260 },
  { id: 'role', label: 'Role', width: 140 },
  { id: 'status', label: 'Status', width: 130 },
  { id: 'team', label: 'Team', width: 130 },
  { id: 'seen', label: 'Last active', width: 130 },
]

const move = <T,>(arr: T[], from: number, to: number) => {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')

function Cell({ col, m }: { col: Col; m: Member }) {
  switch (col.id) {
    case 'member':
      return (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: `oklch(0.5 0.15 ${m.hue})` }}
            aria-hidden="true"
          >
            {initials(m.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      )
    case 'role':
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            ROLE_STYLE[m.role],
          )}
        >
          {m.role}
        </span>
      )
    case 'status':
      return (
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          <span className={cn('size-2 rounded-full', STATUS_DOT[m.status])} aria-hidden="true" />
          {m.status}
        </span>
      )
    case 'team':
      return <span className="text-sm text-muted-foreground">{m.team}</span>
    case 'seen':
      return <span className="text-sm text-muted-foreground tabular-nums">{m.seen}</span>
  }
}

export default function HomeDemo() {
  const [rows, setRows] = useState(MEMBERS)
  const [cols, setCols] = useState(COLS)
  const [selected, setSelected] = useState<string[]>(PRESELECTED)
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const all = selected.length === rows.length
  const some = selected.length > 0 && !all

  const onDragEnd = (r: DragEndResult) => {
    if (r.dragType === 'row') {
      setRows((p) => moveRowsById(p, r.selectedIds, r.insertIndex))
      return
    }
    // column 0 is the checkbox column (locked), so data columns start at index 1
    if (r.sourceIndex !== r.targetIndex)
      setCols((p) => move(p, r.sourceIndex - 1, r.targetIndex - 1))
  }

  return (
    <div className="home-demo overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Team members</p>
          <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1">
              <GripVerticalIcon className="size-3.5 text-brand" aria-hidden="true" /> Drag any row
            </li>
            <li className="flex items-center gap-1">
              <ArrowLeftRightIcon className="size-3.5 text-brand" aria-hidden="true" /> Drag column
              headers
            </li>
            <li className="flex items-center gap-1">
              <ListChecksIcon className="size-3.5 text-brand" aria-hidden="true" /> Tick rows to
              move them together
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 ? (
            <>
              <Badge className="bg-brand text-white hover:bg-brand dark:text-zinc-950">
                {selected.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelected([])}
              >
                <XIcon className="size-3.5" /> Clear
              </Button>
            </>
          ) : (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <Kbd>Shift</Kbd> + tick for a range
            </span>
          )}
        </div>
      </div>

      <p className="border-b px-4 py-1.5 text-[11px] text-muted-foreground sm:hidden">
        Swipe sideways to see every column.
      </p>
      <TableContainer
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={onDragEnd}
        options={{ columnDragRange: { start: 1 } }}
        renderPlaceholder={() => (
          <div className="h-full w-full rounded-md border-2 border-dashed border-brand/60 bg-brand-soft" />
        )}
        style={{ height: 40 + rows.length * 57 }}
      >
        {/* solid, and on the cells too: a column drag copies the header cell into the drag card */}
        <TableHeader className="border-b bg-muted">
          <ColumnCell
            id="select"
            index={0}
            style={{ width: 64 }}
            className="flex h-10 items-center justify-end pr-3"
          >
            <Checkbox
              aria-label="Select all"
              checked={all ? true : some ? 'indeterminate' : false}
              onCheckedChange={() => setSelected(all ? [] : rows.map((r) => r.id))}
            />
          </ColumnCell>
          {cols.map((col, i) => (
            <ColumnCell
              key={col.id}
              id={col.id}
              index={i + 1}
              style={{ width: col.width }}
              className="group/col flex h-10 cursor-grab items-center justify-between gap-1.5 bg-muted px-3 text-xs font-medium text-muted-foreground active:cursor-grabbing"
              title="Drag to reorder columns"
            >
              {col.label}
              {/* always visible, so it is clear the header can be dragged */}
              <GripVerticalIcon
                className="size-3.5 opacity-75 transition-opacity group-hover/col:opacity-100"
                aria-hidden="true"
              />
            </ColumnCell>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((m, ri) => {
            const isSelected = selectedSet.has(m.id)
            return (
              <BodyRow
                key={m.id}
                id={m.id}
                index={ri}
                className={cn('home-demo-row group/row', ri < rows.length - 1 && 'border-b')}
                selectedClassName="home-demo-row-selected"
              >
                <RowCell index={0} className="flex h-14 items-center justify-end gap-1.5 pr-3">
                  <GripVerticalIcon
                    className="size-4 text-muted-foreground opacity-70 transition-opacity group-hover/row:opacity-100"
                    aria-hidden="true"
                  />
                  <SelectHandle>
                    <Checkbox
                      checked={isSelected}
                      aria-label={`Select ${m.name}`}
                      tabIndex={-1}
                      className="pointer-events-none" // the handle owns the click
                    />
                  </SelectHandle>
                </RowCell>
                {cols.map((col, ci) => (
                  <RowCell key={col.id} index={ci + 1} className="flex h-14 items-center px-3">
                    <Cell col={col} m={m} />
                  </RowCell>
                ))}
              </BodyRow>
            )
          })}
        </TableBody>
      </TableContainer>
    </div>
  )
}
