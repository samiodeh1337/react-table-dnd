// The landing page: hero, a live table, what the library does, and the way into the docs.
import { useState } from 'react'
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  GaugeIcon,
  LayersIcon,
  LockIcon,
  MousePointerClickIcon,
  PaletteIcon,
  SmartphoneIcon,
  RowsIcon,
  CodeIcon,
} from 'lucide-react'
import { Button } from '@/docs/components/ui/button'
import { Badge } from '@/docs/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/docs/components/ui/card'
import HomeDemo from './HomeDemo'
import { GITHUB, SiteFooter } from './layout'
import { Link } from './router'

declare const __LIB_VERSION__: string

const INSTALL = 'npm install react-table-dnd'

const FEATURES = [
  {
    icon: MousePointerClickIcon,
    title: 'Multi-select group drag',
    desc: 'Click, ⌘/Ctrl, Shift, checkboxes or tap, then drag the selection as one group.',
  },
  {
    icon: GaugeIcon,
    title: 'No re-renders mid-drag',
    desc: 'React renders when a drag starts and when it ends. The movement in between is CSS transforms.',
  },
  {
    icon: LayersIcon,
    title: 'Virtual tables',
    desc: 'Works with @tanstack/react-virtual. Selected rows move even when scrolled out of view.',
  },
  {
    icon: SmartphoneIcon,
    title: 'Touch and desktop',
    desc: 'Long-press to drag, swipe to scroll. The table auto-scrolls near its edges.',
  },
  {
    icon: PaletteIcon,
    title: 'Your styles only',
    desc: 'The table adds no styles to your cells. Use className and style.',
  },
  {
    icon: LockIcon,
    title: 'Handles and ranges',
    desc: 'Drag from a grip only, lock rows or columns, or select with checkboxes.',
  },
]

function InstallCommand() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="inline-flex h-10 items-center gap-3 rounded-lg border bg-muted/40 pr-1.5 pl-4 font-mono text-sm">
      <span className="text-muted-foreground select-none" aria-hidden="true">
        $
      </span>
      <code>{INSTALL}</code>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={copy}
        aria-label="Copy install command"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </Button>
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <main id="main" tabIndex={-1} className="outline-none">
        <section className="relative overflow-hidden border-b">
          {/* a faint dot pattern and a soft glow behind the hero */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--hero-dot)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,black_35%,transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[-14rem] left-1/2 h-[26rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--hero-glow-a),transparent)] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[-6rem] left-[62%] h-[18rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--hero-glow-b),transparent)] blur-2xl"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-28">
            <Link to="/docs/multi-select">
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs backdrop-blur"
              >
                <span className="size-1.5 rounded-full bg-brand" />v{__LIB_VERSION__}: multi-select
                and group drag
                <ArrowRightIcon className="size-3" />
              </Badge>
            </Link>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              Drag-and-drop rows and columns{' '}
              <span className="bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text text-transparent">
                for React tables
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-balance text-muted-foreground">
              Reorder rows and columns, drag a selection as one group, virtualize 100,000+ rows. No
              dependencies besides React.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/docs/introduction">
                  Get started <ArrowRightIcon />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/examples">
                  <RowsIcon /> Live demos
                </Link>
              </Button>
            </div>
            <div className="mt-6">
              <InstallCommand />
            </div>
          </div>

          <div className="relative mx-auto max-w-5xl px-4 pb-20">
            {/* No backdrop-blur / filter / transform around a table: they become the containing
                block of the position: fixed drag clone, which then lands off the row. */}
            <HomeDemo />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Features</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="gap-3 py-5 shadow-none transition-colors hover:bg-accent/30"
              >
                <CardHeader className="gap-3 px-5">
                  <span className="flex size-9 items-center justify-center rounded-lg border bg-brand-soft text-brand">
                    <f.icon className="size-4" />
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription className="leading-6">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center">
            <CodeIcon className="size-6 text-brand" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Quick start</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Wrap your rows and columns, then update your state in onDragEnd.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/docs/quick-start">Read the quick start</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={GITHUB} target="_blank" rel="noreferrer">
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
