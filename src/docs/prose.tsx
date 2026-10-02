// Typography for docs pages, in the shadcn docs style. Headings carry ids so the "On this page"
// list can find and link them.
import type { ReactNode } from 'react'
import { InfoIcon, LightbulbIcon, TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/docs/components/ui/alert'
import { cn } from '@/docs/lib/utils'
import { goToSection, sectionHref } from './router'

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`'"<>]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export function H2({ id, children }: { id?: string; children: string }) {
  const anchor = id ?? slugify(children)
  return (
    <h2
      id={anchor}
      data-toc="2"
      className="group mt-12 scroll-m-24 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0"
    >
      {children}
      <a
        href={sectionHref(anchor)}
        onClick={(e) => {
          e.preventDefault() // hash routing: scroll instead of changing the route
          goToSection(anchor)
        }}
        className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Link to ${children}`}
      >
        #
      </a>
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: string }) {
  const anchor = id ?? slugify(children)
  return (
    <h3 id={anchor} data-toc="3" className="mt-8 scroll-m-24 text-xl font-semibold tracking-tight">
      {children}
    </h3>
  )
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('leading-7 [&:not(:first-child)]:mt-5', className)}>{children}</p>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-lg text-muted-foreground">{children}</p>
}

export function C({ children }: { children: ReactNode }) {
  return (
    <code className="relative rounded-md bg-muted box-decoration-clone px-[0.35rem] py-[0.15rem] font-mono text-[0.85em] font-medium break-words">
      {children}
    </code>
  )
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="my-5 ml-6 list-disc space-y-2 [&>li]:leading-7">{children}</ul>
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:/.test(href)
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="font-medium text-brand underline underline-offset-4 hover:opacity-80"
    >
      {children}
    </a>
  )
}

/** Renders `code` spans in a plain string (used by data-driven API tables). */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <C key={i}>{part.slice(1, -1)}</C>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

const CALLOUT_ICON = { note: InfoIcon, tip: LightbulbIcon, warning: TriangleAlertIcon }

export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: 'note' | 'tip' | 'warning'
  title?: string
  children: ReactNode
}) {
  const Icon = CALLOUT_ICON[kind]
  return (
    <Alert
      className={cn(
        'my-6',
        kind === 'tip' &&
          'border-emerald-500/30 bg-emerald-500/[0.04] [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
        kind === 'warning' &&
          'border-amber-500/35 bg-amber-500/[0.05] [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        kind === 'note' && 'border-brand/25 bg-brand-soft/40 [&>svg]:text-brand',
      )}
    >
      <Icon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="block leading-6 [&_p]:leading-6">{children}</AlertDescription>
    </Alert>
  )
}
