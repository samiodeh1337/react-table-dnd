import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './docs/globals.css'
import App from './App.tsx'

// GitHub Pages serves 404.html for a path it does not know (/react-table-dnd/docs/multi-select) and
// that page redirects here as ?p=<the path>. The site routes by hash, so turn the path into one.
const redirected = new URLSearchParams(window.location.search).get('p')
if (redirected !== null) {
  const root = window.location.pathname // where index.html is served, e.g. /react-table-dnd/
  const hashAt = redirected.indexOf('#/')
  const route =
    hashAt >= 0
      ? redirected.slice(hashAt + 1) // the link already had a hash route: keep it
      : '/' +
        (redirected.startsWith(root) ? redirected.slice(root.length) : redirected)
          .replace(/^\/+/, '')
          .split(/[?#]/)[0]
  window.history.replaceState(null, '', root + (route === '/' ? '' : '#' + route))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
