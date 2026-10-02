// Site chrome in the style of the shadcn docs: header with search and theme toggle, a sidebar
// of pages, an "On this page" list, and Previous / Next links.
import { useEffect, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
  MenuIcon,
  PlayIcon,
  SearchIcon,
} from 'lucide-react'
import { Button } from '@/docs/components/ui/button'
import { Badge } from '@/docs/components/ui/badge'
import { Kbd } from '@/docs/components/ui/kbd'
import { Separator } from '@/docs/components/ui/separator'
import { ScrollArea } from '@/docs/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/docs/components/ui/sheet'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/docs/components/ui/command'
import { cn } from '@/docs/lib/utils'
import { ModeToggle } from './theme'
import { Link, currentSection, goToSection, navigate, sectionHref } from './router'
import { GROUPS, PAGES, type DocPage } from './pages'

declare const __LIB_VERSION__: string

export const GITHUB = 'https://github.com/samiodeh1337/react-table-dnd'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/** Three bars, the middle one lifted and shifted: a row being dragged out of a table. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)}
    >
      <span className="grid w-[18px] gap-[3px]" aria-hidden="true">
        <span className="h-[3px] rounded-sm bg-muted-foreground/40" />
        <span className="h-[3px] translate-x-1 rounded-sm bg-brand" />
        <span className="h-[3px] rounded-sm bg-muted-foreground/40" />
      </span>
      <span>
        react-table<span className="text-brand">-dnd</span>
      </span>
    </Link>
  )
}

// ── Search (⌘K) ────────────────────────────────────────────────────────────

/** Every word typed must appear in the item; a title hit ranks above a keyword hit. cmdk's own
 *  fuzzy match found letters scattered through long descriptions and ranked the wrong pages. */
function searchFilter(value: string, search: string, keywords?: string[]): number {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return 1
  const title = value.toLowerCase()
  const all = `${title} ${(keywords ?? []).join(' ').toLowerCase()}`
  if (!terms.every((t) => all.includes(t))) return 0
  return terms.every((t) => title.includes(t)) ? 1 : 0.5
}

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search documentation"
      filter={searchFilter}
    >
      <CommandInput placeholder="Search documentation..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {GROUPS.map((group) => (
          <CommandGroup key={group} heading={group}>
            {PAGES.filter((p) => p.group === group).map((p) => (
              <CommandItem
                key={p.slug}
                value={p.title}
                keywords={[p.description, p.keywords ?? '']}
                onSelect={() => go(`/docs/${p.slug}`)}
              >
                <FileTextIcon />
                <span>{p.title}</span>
                <span className="ml-auto truncate pl-4 text-xs text-muted-foreground">
                  {p.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Examples">
          <CommandItem
            value="Live demos"
            keywords={['examples playground showcase demo']}
            onSelect={() => go('/examples')}
          >
            <PlayIcon />
            <span>Live demos</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────

export function SiteHeader({ path }: { path: string }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const isApi = PAGES.some((p) => p.group === 'API reference' && path === `/docs/${p.slug}`)
  const nav = [
    { to: '/docs/introduction', label: 'Docs', active: path.startsWith('/docs') && !isApi },
    { to: '/examples', label: 'Examples', active: path === '/examples' },
    { to: '/docs/tablecontainer', label: 'API', active: isApi },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault() // hash routing: move focus instead of changing the route
          const main = document.getElementById('main')
          main?.focus()
          main?.scrollIntoView()
        }}
        className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:px-3 focus:py-2 focus:z-[60] focus:outline-2 focus:outline-brand"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-4 md:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 md:hidden" aria-label="Open menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle asChild>
                <div onClick={() => setMenuOpen(false)}>
                  <Logo />
                </div>
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100svh-4rem)]">
              <div
                className="p-4"
                onClick={(e) => (e.target as HTMLElement).closest('a') && setMenuOpen(false)}
              >
                <Link
                  to="/examples"
                  className="mb-4 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  <PlayIcon className="size-4 text-brand" /> Live demos
                </Link>
                <SidebarNav path={path} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Logo className="mr-2" />
        <Badge
          variant="outline"
          className="hidden font-mono text-[11px] font-normal sm:inline-flex"
        >
          v{__LIB_VERSION__}
        </Badge>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((n) => (
            <Button
              key={n.to}
              variant="ghost"
              size="sm"
              asChild
              className={cn('text-muted-foreground', n.active && 'text-foreground')}
            >
              <Link to={n.to}>{n.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 w-64 justify-between gap-3 bg-muted/40 px-3 font-normal text-muted-foreground shadow-none lg:flex"
            onClick={() => setSearchOpen(true)}
          >
            <span className="flex items-center gap-2">
              <SearchIcon className="size-3.5" /> Search documentation
            </span>
            <Kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</Kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 lg:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Search documentation"
          >
            <SearchIcon />
          </Button>
          <Separator orientation="vertical" className="mx-1 hidden !h-4 sm:block" />
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <a href={GITHUB} target="_blank" rel="noreferrer" aria-label="GitHub">
              <GithubIcon className="size-4" />
            </a>
          </Button>
          <ModeToggle />
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function SidebarNav({ path }: { path: string }) {
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">{group}</p>
          <ul className="flex flex-col gap-0.5">
            {PAGES.filter((p) => p.group === group).map((p) => {
              const active = path === `/docs/${p.slug}`
              return (
                <li key={p.slug}>
                  <Link
                    to={`/docs/${p.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm outline-brand transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2',
                      active ? 'bg-accent font-medium text-foreground' : 'text-foreground/70',
                    )}
                  >
                    {p.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

// ── On this page ───────────────────────────────────────────────────────────

interface TocItem {
  id: string
  text: string
  level: number
}

function useToc(slug: string) {
  const [items, setItems] = useState<TocItem[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    // headings are rendered by the page: read them on the next frame, once it has painted
    let els: HTMLElement[] = []
    let frame = requestAnimationFrame(() => {
      frame = 0
      els = Array.from(document.querySelectorAll<HTMLElement>('[data-toc]'))
      setItems(
        els.map((el) => ({
          id: el.id,
          text: el.textContent?.replace(/#$/, '').trim() ?? '',
          level: +(el.dataset.toc ?? 2),
        })),
      )
      measure()
    })
    const measure = () => {
      frame = 0
      if (!els.length) return
      let current = els[0].id
      for (const el of els) if (el.getBoundingClientRect().top <= 120) current = el.id
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [slug])

  return { items, active }
}

function OnThisPage({ slug }: { slug: string }) {
  const { items, active } = useToc(slug)
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium">On this page</p>
      <ul className="flex flex-col gap-1.5 border-l">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={sectionHref(it.id)}
              onClick={(e) => {
                e.preventDefault()
                goToSection(it.id)
              }}
              className={cn(
                '-ml-px block border-l py-0.5 outline-brand transition-colors hover:text-foreground focus-visible:outline-2',
                it.level === 3 ? 'pl-6' : 'pl-3',
                active === it.id
                  ? 'border-brand font-medium text-foreground'
                  : 'border-transparent text-muted-foreground',
              )}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Pager ──────────────────────────────────────────────────────────────────

function neighbours(slug: string): [DocPage | undefined, DocPage | undefined] {
  const i = PAGES.findIndex((p) => p.slug === slug)
  return [PAGES[i - 1], PAGES[i + 1]]
}

function PagerButtons({ slug, compact }: { slug: string; compact?: boolean }) {
  const [prev, next] = neighbours(slug)
  if (compact) {
    const arrow = (page: DocPage | undefined, dir: 'prev' | 'next') => {
      const Icon = dir === 'prev' ? ArrowLeftIcon : ArrowRightIcon
      const label = dir === 'prev' ? 'Previous' : 'Next'
      return page ? (
        <Button variant="secondary" size="icon" className="size-8 shadow-none" asChild>
          <Link to={`/docs/${page.slug}`} aria-label={`${label}: ${page.title}`} title={page.title}>
            <Icon />
          </Link>
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="icon"
          className="size-8 shadow-none"
          disabled
          aria-label={label}
        >
          <Icon />
        </Button>
      )
    }
    return (
      <div className="flex items-center gap-2">
        {arrow(prev, 'prev')}
        {arrow(next, 'next')}
      </div>
    )
  }
  return (
    <div className="mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/docs/${prev.slug}`}
          className="group rounded-xl border p-4 transition-colors hover:bg-accent/50"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeftIcon className="size-3.5" /> Previous
          </span>
          <span className="mt-1 block font-medium group-hover:text-brand">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          to={`/docs/${next.slug}`}
          className="group rounded-xl border p-4 text-right transition-colors hover:bg-accent/50"
        >
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next <ArrowRightIcon className="size-3.5" />
          </span>
          <span className="mt-1 block font-medium group-hover:text-brand">{next.title}</span>
        </Link>
      )}
    </div>
  )
}

// ── Docs page layout ───────────────────────────────────────────────────────

export function DocsLayout({ page, path }: { page: DocPage; path: string }) {
  const { Component } = page

  // a shared section link (#/docs/<page>?s=<heading>): jump there once the page has rendered,
  // and again when only the section changes (the route stays the same, so nothing re-renders)
  useEffect(() => {
    const jump = () => {
      const id = currentSection()
      if (id) document.getElementById(id)?.scrollIntoView()
    }
    const frame = requestAnimationFrame(jump)
    window.addEventListener('hashchange', jump)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', jump)
    }
  }, [path])

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl">
      <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 border-r md:block">
        <ScrollArea className="h-full">
          <div className="px-4 py-8">
            <SidebarNav path={path} />
          </div>
        </ScrollArea>
      </aside>

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 flex-1 px-4 py-8 outline-none md:px-10 lg:py-10"
      >
        <div className="mx-auto flex max-w-3xl gap-10 xl:max-w-none">
          <article className="min-w-0 max-w-3xl flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpenIcon className="size-3.5" /> {page.group}
                </p>
                <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {page.title}
                </h1>
              </div>
              <div className="pt-7">
                <PagerButtons slug={page.slug} compact />
              </div>
            </div>
            <p className="mt-3 text-lg text-muted-foreground">{page.description}</p>
            <div className="mt-8" key={page.slug}>
              <Component />
            </div>
            <PagerButtons slug={page.slug} />
          </article>

          <aside className="sticky top-24 hidden h-fit w-56 shrink-0 xl:block">
            <OnThisPage slug={page.slug} />
          </aside>
        </div>
      </main>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row md:px-6">
        <p>
          Built by{' '}
          <a
            href="https://github.com/samiodeh1337"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Sami Odeh
          </a>
          . MIT License.
        </p>
        <p>
          The source is on{' '}
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
