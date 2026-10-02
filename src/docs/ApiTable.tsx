// A props / helpers table built from API data, using shadcn's Table.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/docs/components/ui/table'
import { Badge } from '@/docs/components/ui/badge'
import { Md } from './prose'

/** On phones each prop becomes a small card (name, type, default, description stacked), so
 *  nothing hides behind a sideways scroll; from `sm` up it is a normal table. */
function ApiCards({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="my-6 divide-y overflow-hidden rounded-xl border sm:hidden">
      {rows.map((cells) => {
        const required = cells[1].includes('(required)')
        const type = cells[1].replace(' (required)', '')
        const hasDefault = columns.length === 4
        return (
          <div key={cells[0]} className="space-y-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[13px]">
              <Md text={cells[0]} />
              {required && (
                <Badge variant="outline" className="text-[10px]">
                  required
                </Badge>
              )}
            </div>
            <div className="text-sm">
              <Md text={type} />
              {hasDefault && cells[2] !== '—' && (
                <span className="ml-2 text-xs text-muted-foreground">default {cells[2]}</span>
              )}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              <Md text={cells[cells.length - 1]} />
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function ApiTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <>
      <ApiCards columns={columns} rows={rows} />
      <div className="my-6 hidden overflow-hidden rounded-xl border sm:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c}
                  className="h-10 px-4 text-xs font-medium tracking-wide uppercase"
                >
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cells) => (
              <TableRow key={cells[0]} className="hover:bg-transparent">
                {cells.map((cell, i) => {
                  const required = i === 1 && cell.includes('(required)')
                  const text = required ? cell.replace(' (required)', '') : cell
                  return (
                    <TableCell
                      key={i}
                      className={
                        i === 0
                          ? 'px-4 py-3 align-top font-mono text-[13px] whitespace-nowrap'
                          : i === cells.length - 1
                            ? 'min-w-64 px-4 py-3 align-top text-sm leading-6 whitespace-normal text-muted-foreground'
                            : 'px-4 py-3 align-top text-sm whitespace-normal'
                      }
                    >
                      {i === 0 ? <Md text={text} /> : <Md text={text} />}
                      {required && (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          required
                        </Badge>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
