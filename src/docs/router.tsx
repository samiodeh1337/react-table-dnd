// A tiny hash router. The docs are hosted on GitHub Pages (static files, no server rewrites), so
// every page lives behind the hash: `#/`, `#/docs/multi-select`, `#/examples`.
import { useEffect, useState, type AnchorHTMLAttributes } from 'react'

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw || !raw.startsWith('/')) return '/'
  return raw.split('?')[0].replace(/\/+$/, '') || '/'
}

/** The current route path, e.g. "/" or "/docs/installation". */
export function useRoute(): string {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const onHash = () => {
      const next = currentPath()
      setPath((prev) => {
        if (prev !== next) window.scrollTo({ top: 0, behavior: 'instant' }) // new page: start at top
        return next
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return path
}

export const href = (path: string) => `#${path}`

/** The section a link asked for: `#/docs/multi-select?s=gestures` gives "gestures". */
export function currentSection(): string | null {
  const query = window.location.hash.split('?')[1]
  return query ? new URLSearchParams(query).get('s') : null
}

/** A shareable link to a heading on the current page. */
export const sectionHref = (id: string) => `#${currentPath()}?s=${encodeURIComponent(id)}`

/** Scroll to a heading and put its shareable link in the address bar (no route change). */
export function goToSection(id: string) {
  window.history.replaceState(null, '', sectionHref(id))
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export function navigate(path: string) {
  window.location.hash = path
}

/** A link to another docs route. */
export function Link({
  to,
  ...props
}: { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return <a href={href(to)} {...props} />
}
