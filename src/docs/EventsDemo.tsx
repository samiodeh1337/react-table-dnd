// The Drag events page demo: the basic table, with selection on, and every lifecycle callback
// logged.
import { useCallback, useState } from 'react'
import type { DragCancelInfo, DragEndResult, DragStartInfo } from '../Components'
import BasicDemo from './BasicDemo'
import { Button } from '@/docs/components/ui/button'

interface LogLine {
  n: number
  name: string
  detail: string
}

const describe = (r: DragStartInfo | DragEndResult | DragCancelInfo) => {
  if ('targetIndex' in r && r.targetIndex !== undefined)
    return r.dragType === 'row'
      ? `row ${r.id} → slot ${r.insertIndex}`
      : `column ${r.id} → ${r.targetIndex}`
  const moving = 'selectedIds' in r && r.selectedIds ? `, moving [${r.selectedIds.join(', ')}]` : ''
  return `${r.dragType} ${r.id} at ${r.sourceIndex}${moving}`
}

export default function EventsDemo() {
  const [log, setLog] = useState<LogLine[]>([])
  const add = useCallback((name: string, detail: string) => {
    setLog((l) => [{ n: (l[0]?.n ?? 0) + 1, name, detail }, ...l].slice(0, 8))
  }, [])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BasicDemo
        selectable
        events={{
          onDragStart: (i) => add('onDragStart', describe(i)),
          onDragOver: (r) => add('onDragOver', describe(r)),
          onDragEnd: (r) => add('onDragEnd', describe(r)),
          onDragCancel: (i) => add('onDragCancel', describe(i)),
        }}
      />
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-sm font-medium">Events</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLog([])}>
            Clear
          </Button>
        </div>
        <ol
          className="min-h-40 px-4 py-2 font-mono text-xs"
          aria-live="polite"
          data-testid="event-log"
        >
          {log.length === 0 ? (
            <li className="py-1 text-muted-foreground">
              Select rows, drag a row or a column, or press Esc mid-drag.
            </li>
          ) : (
            log.map((l) => (
              <li key={l.n} className="flex gap-3 py-1">
                <span className="w-28 shrink-0 text-brand">{l.name}</span>
                <span className="text-muted-foreground">{l.detail}</span>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  )
}
