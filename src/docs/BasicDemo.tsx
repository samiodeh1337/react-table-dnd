// A small live table styled only with Tailwind classes on the library's components, so it follows
// the docs theme (light / dark) and shows `className` support at the same time.
import { useState } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  moveRowsById,
  type DragEndResult,
  type TableContainerProps,
} from '../Components'
import { cn } from '@/docs/lib/utils'

const COLS = [
  { id: 'name', label: 'Name', width: 190 },
  { id: 'role', label: 'Role', width: 150 },
  { id: 'team', label: 'Team', width: 150 },
  { id: 'email', label: 'Email', width: 250 },
]
const ROWS = [
  { id: 'r1', name: 'Alice Johnson', role: 'Engineer', team: 'Platform', email: 'alice@acme.dev' },
  { id: 'r2', name: 'Bob Martinez', role: 'Designer', team: 'Growth', email: 'bob@acme.dev' },
  { id: 'r3', name: 'Carol Chen', role: 'PM', team: 'Platform', email: 'carol@acme.dev' },
  { id: 'r4', name: 'Dan Okafor', role: 'Engineer', team: 'Payments', email: 'dan@acme.dev' },
  { id: 'r5', name: 'Eve Novak', role: 'Analyst', team: 'Growth', email: 'eve@acme.dev' },
]

const move = <T,>(arr: T[], from: number, to: number) => {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** The lifecycle callbacks a demo can listen to (the Drag events page logs them). */
export type DemoEvents = Pick<
  TableContainerProps,
  'onDragStart' | 'onDragOver' | 'onDragEnd' | 'onDragCancel'
>

export default function BasicDemo({
  selectable = false,
  className,
  events,
}: {
  selectable?: boolean
  className?: string
  events?: DemoEvents
}) {
  const [cols, setCols] = useState(COLS)
  const [rows, setRows] = useState(ROWS)
  const [selected, setSelected] = useState<string[]>([])

  const onDragEnd = (r: DragEndResult) => {
    events?.onDragEnd?.(r)
    if (r.dragType === 'row') setRows((p) => moveRowsById(p, r.selectedIds, r.insertIndex))
    else setCols((p) => move(p, r.sourceIndex, r.targetIndex))
  }

  return (
    <TableContainer
      {...events}
      onDragEnd={onDragEnd}
      selectable={selectable}
      selectedIds={selectable ? selected : undefined}
      onSelectionChange={selectable ? setSelected : undefined}
      renderPlaceholder={() => (
        <div className="h-full w-full rounded-md border-2 border-dashed border-brand/60 bg-brand-soft" />
      )}
      className={cn(
        'docs-table-lift overflow-hidden rounded-xl border bg-card text-card-foreground',
        className,
      )}
      // header 36 + its border, rows of 44 with a 1px divider between them, the outer border
      style={{ height: 37 + ROWS.length * 44 + (ROWS.length - 1) + 2 }}
    >
      <TableHeader className="border-b bg-muted/50">
        {cols.map((col, i) => (
          <ColumnCell
            key={col.id}
            id={col.id}
            index={i}
            style={{ width: col.width }}
            className="flex h-9 items-center px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {col.label}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <BodyRow
            key={row.id}
            id={row.id}
            index={ri}
            className={cn('bg-card', ri < rows.length - 1 && 'border-b')}
            selectedClassName="home-demo-row-selected" // opaque: the drag card copies the row colour
          >
            {cols.map((col, ci) => (
              <RowCell
                key={col.id}
                index={ci}
                className={cn(
                  'flex h-11 items-center px-4 text-sm',
                  col.id === 'name' ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {row[col.id as keyof typeof row]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  )
}
