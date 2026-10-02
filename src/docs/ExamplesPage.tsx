// The live demos. The picker is a native <select> (shadcn's Native Select) with the class
// `example-select`, and the demo lives in `.example-wrapper`: the browser test scripts rely on both.
import { useEffect, useState } from 'react'
import { CodeIcon, EyeIcon } from 'lucide-react'
import { Button } from '@/docs/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/docs/components/ui/native-select'
import CodeBlock from './CodeBlock'
import { EXAMPLES } from './demos'
import { SiteFooter } from './layout'
import { cn } from '@/docs/lib/utils'

function demoFromHash(): string | null {
  const q = window.location.hash.split('?')[1]
  return q ? new URLSearchParams(q).get('demo') : null
}

export default function ExamplesPage() {
  const [active, setActive] = useState(() => {
    const id = demoFromHash()
    return EXAMPLES.some((e) => e.id === id) ? id! : EXAMPLES[0].id
  })
  const [showCode, setShowCode] = useState(false)

  // a guide's "Open demo" link changes only the query part of the hash
  useEffect(() => {
    const onHash = () => {
      const id = demoFromHash()
      if (id && EXAMPLES.some((e) => e.id === id)) {
        setActive(id)
        setShowCode(false)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const example = EXAMPLES.find((e) => e.id === active)!
  const Demo = example.component

  return (
    <>
      <main
        id="main"
        tabIndex={-1}
        className="outline-none mx-auto w-full max-w-screen-2xl px-4 py-10 md:px-6"
      >
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Examples</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Drag rows and columns. View code shows the source.
          </p>
        </div>

        <div className="mt-6 hidden flex-wrap gap-1.5 sm:flex" role="tablist" aria-label="Demos">
          {EXAMPLES.map((e) => (
            <Button
              key={e.id}
              role="tab"
              aria-selected={e.id === active}
              variant={e.id === active ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 rounded-full px-3 text-xs',
                e.id !== active && 'text-muted-foreground',
              )}
              onClick={() => {
                setActive(e.id)
                setShowCode(false)
              }}
            >
              {e.label}
            </Button>
          ))}
        </div>

        <div className="example-wrapper mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <NativeSelect
              className="example-select min-w-52"
              value={active}
              aria-label="Choose a demo"
              onChange={(e) => {
                setActive(e.target.value)
                setShowCode(false)
              }}
            >
              {EXAMPLES.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              variant={showCode ? 'secondary' : 'outline'}
              size="sm"
              className="code-toggle-btn"
              onClick={() => setShowCode((v) => !v)}
            >
              {showCode ? <EyeIcon /> : <CodeIcon />}
              {showCode ? 'Show demo' : 'View code'}
            </Button>
          </div>
          {showCode ? (
            <CodeBlock
              className="my-0"
              maxHeight={640}
              variants={
                example.jsx === example.tsx // a demo without a JSX version shows TSX only
                  ? [{ label: 'TSX', code: example.tsx, lang: 'tsx' }]
                  : [
                      { label: 'TSX', code: example.tsx, lang: 'tsx' },
                      { label: 'JSX', code: example.jsx, lang: 'jsx' },
                    ]
              }
            />
          ) : (
            // The demos are designed on a dark canvas, so their frame stays dark in both themes.
            <div className="example-container overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 shadow-sm sm:p-7">
              <Demo />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
