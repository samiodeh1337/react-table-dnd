// An interactive walk-through of what `moveRowsById` / `arrayMoveMultiple` do with a drop.
// Pick the rows that move and the gap they are dropped into; every step is computed live with the
// library's real function, so what you see is exactly what your onDragEnd will get.
import { useState, type ReactNode } from 'react'
import { arrayMoveMultiple } from '../Components'
import { Button } from '@/docs/components/ui/button'
import { cn } from '@/docs/lib/utils'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function Chip({ letter, moving, dim }: { letter: string; moving?: boolean; dim?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md border font-mono text-sm font-semibold',
        moving ? 'border-brand bg-brand text-white dark:text-zinc-950' : 'bg-card text-foreground',
        dim && 'opacity-35',
      )}
    >
      {letter}
    </span>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-3">
      <span className="flex size-7 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

export default function MoveExplainer() {
  const [moving, setMoving] = useState<number[]>([1, 4]) // B and E
  const [gap, setGap] = useState(4) // between D and E

  const toggle = (i: number) =>
    setMoving((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i].sort((a, b) => a - b)))

  const sorted = [...moving].sort((a, b) => a - b)
  const group = sorted.map((i) => LETTERS[i])
  const rest = LETTERS.filter((_, i) => !moving.includes(i))
  const before = sorted.filter((i) => i < gap).length
  const at = Math.max(0, Math.min(rest.length, gap - before))
  const result = arrayMoveMultiple(LETTERS, sorted, gap) // the real library function

  return (
    <div className="my-6 rounded-xl border bg-card p-4 sm:p-6">
      <p className="text-sm font-medium">Try it</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Click letters to choose which rows are dragged. Click a slot{' '}
        <span className="inline-block h-4 w-1 translate-y-0.5 rounded bg-brand align-baseline" /> to
        choose where they are dropped.
      </p>

      {/* the table before the drop, with clickable rows and gaps */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-nowrap items-center overflow-x-auto"
          role="group"
          aria-label="Rows and drop slots"
        >
          {LETTERS.map((l, i) => (
            <div key={l} className="flex items-center">
              <button
                type="button"
                aria-label={`Drop slot ${i}`}
                onClick={() => setGap(i)}
                className="group flex h-9 w-4 items-center justify-center"
              >
                <span
                  className={cn(
                    'h-7 w-1 rounded transition-colors',
                    gap === i ? 'bg-brand' : 'bg-border group-hover:bg-muted-foreground/40',
                  )}
                />
              </button>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={moving.includes(i)}
                aria-label={`Row ${l}`}
              >
                <Chip letter={l} moving={moving.includes(i)} />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label={`Drop slot ${LETTERS.length}`}
            onClick={() => setGap(LETTERS.length)}
            className="group flex h-9 w-4 items-center justify-center"
          >
            <span
              className={cn(
                'h-7 w-1 rounded transition-colors',
                gap === LETTERS.length
                  ? 'bg-brand'
                  : 'bg-border group-hover:bg-muted-foreground/40',
              )}
            />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMoving([1, 4])
              setGap(4)
            }}
          >
            Reset
          </Button>
        </div>
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        insertIndex = {gap}
        {gap < LETTERS.length ? ` (the slot just before ${LETTERS[gap]})` : ' (after the last row)'}
      </p>

      {moving.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Pick at least one row to move.</p>
      ) : (
        <ol className="mt-6 space-y-5">
          <Step n={1} title="Take the moving rows out, keeping their order">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs">moving</span>
              {group.map((l) => (
                <Chip key={l} letter={l} moving />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="w-14 text-xs">the rest</span>
              {rest.map((l) => (
                <Chip key={l} letter={l} />
              ))}
            </div>
          </Step>
          <Step n={2} title="Shift the slot left by the rows that were taken out before it">
            <p>
              insertIndex counts slots in the table <em>before</em> anything moved.{' '}
              {before === 0 ? 'No' : before} moving row{before === 1 ? ' was' : 's were'} in front
              of slot {gap}
              {before > 0 &&
                ` (${sorted
                  .filter((i) => i < gap)
                  .map((i) => LETTERS[i])
                  .join(', ')})`}
              , so in “the rest” the same slot is at{' '}
              <span className="font-mono text-foreground">
                {gap} − {before} = {at}
              </span>
              .
            </p>
          </Step>
          <Step n={3} title={`Insert the moving rows at position ${at}`}>
            <div className="flex flex-wrap items-center gap-2">
              {result.map((l) => (
                <Chip key={l} letter={l} moving={group.includes(l)} />
              ))}
            </div>
            <p className="mt-2 font-mono text-xs">
              arrayMoveMultiple([{LETTERS.map((l) => `"${l}"`).join(', ')}], [{sorted.join(', ')}],{' '}
              {gap})
            </p>
          </Step>
        </ol>
      )}
    </div>
  )
}
