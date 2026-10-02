// The docs site: a hash-routed app with a landing page, docs pages and the live demos.
import { useEffect, useRef } from 'react'
import { TooltipProvider } from '@/docs/components/ui/tooltip'
import { Button } from '@/docs/components/ui/button'
import { ThemeProvider } from './docs/theme'
import { Link, useRoute } from './docs/router'
import { PAGES } from './docs/pages'
import { DocsLayout, SiteHeader } from './docs/layout'
import HomePage from './docs/HomePage'
import ExamplesPage from './docs/ExamplesPage'

function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center outline-none"
    >
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This link points to a page the docs do not have.</p>
      <Button asChild>
        <Link to="/docs/introduction">Go to the docs</Link>
      </Button>
    </main>
  )
}

function Routes({ path }: { path: string }) {
  if (path === '/examples') return <ExamplesPage />
  if (path === '/docs') return <DocsLayout page={PAGES[0]} path={`/docs/${PAGES[0].slug}`} />
  if (path.startsWith('/docs/')) {
    const page = PAGES.find((p) => p.slug === path.slice('/docs/'.length))
    return page ? <DocsLayout page={page} path={path} /> : <NotFound />
  }
  if (path === '/') return <HomePage />
  return <NotFound />
}

const SITE = 'react-table-dnd'

/** The browser tab title and meta description for the current route. */
function useDocumentMeta(path: string) {
  // the home page keeps what index.html states
  const home = useRef<{ title: string; description: string } | null>(null)
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    home.current ??= { title: document.title, description: meta?.content ?? '' }
    let title = home.current.title
    let description = home.current.description
    if (path === '/examples') {
      title = `Examples · ${SITE}`
      description =
        'Live demos of react-table-dnd: multi-select, virtual tables, drag handles, TanStack Table, styling. Each shows its code.'
    } else if (path.startsWith('/docs')) {
      const page =
        PAGES.find((p) => `/docs/${p.slug}` === path) ?? (path === '/docs' ? PAGES[0] : null)
      title = page ? `${page.title} · ${SITE}` : `Page not found · ${SITE}`
      description = page?.description ?? description
    } else if (path !== '/') title = `Page not found · ${SITE}`
    document.title = title
    meta?.setAttribute('content', description)
  }, [path])
}

/** After a navigation, put keyboard focus at the start of the new content, as a page load would
 *  leave it (otherwise it falls to <body>, or stays on a link that no longer exists). */
function useFocusOnNavigate(path: string) {
  // the path focus was last placed for: the initial load keeps the browser's own focus, and a
  // StrictMode double effect run sees the same path and does nothing
  const placedFor = useRef(path)
  useEffect(() => {
    if (placedFor.current === path) return
    placedFor.current = path
    // after the render and after a closing dialog has handed focus back to its trigger
    const t = window.setTimeout(
      () => document.getElementById('main')?.focus({ preventScroll: true }),
      50,
    )
    return () => window.clearTimeout(t)
  }, [path])
}

export default function App() {
  const path = useRoute()
  useFocusOnNavigate(path)
  useDocumentMeta(path)
  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="flex min-h-svh flex-col bg-background">
          <SiteHeader path={path} />
          <div className="flex flex-1 flex-col">
            <Routes path={path} />
          </div>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}
