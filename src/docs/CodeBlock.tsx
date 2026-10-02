// Syntax-highlighted code with a copy button. Several variants (TSX / JSX, npm / yarn / pnpm)
// become shadcn Tabs. Colours come from the hljs rules in globals.css, which follow the theme.
import { useMemo, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/docs/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/docs/components/ui/tabs'
import { cn } from '@/docs/lib/utils'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('css', css)

export interface CodeVariant {
  label: string
  code: string
  lang?: string
}

function highlight(code: string, lang: string) {
  const language = ['tsx', 'ts', 'jsx', 'js'].includes(lang) ? 'typescript' : lang
  // Highlight to a string and let React own the DOM (never mutate the <code> element).
  return hljs.getLanguage(language)
    ? hljs.highlight(code, { language }).value
    : hljs.highlightAuto(code).value
}

export default function CodeBlock({
  code,
  lang = 'tsx',
  title,
  variants,
  className,
  maxHeight,
}: {
  code?: string
  lang?: string
  /** A file name or label shown in the header. */
  title?: string
  /** Several versions of the same snippet, shown as tabs. */
  variants?: CodeVariant[]
  className?: string
  maxHeight?: number
}) {
  const all = variants ?? [{ label: title ?? lang, code: code ?? '', lang }]
  const [active, setActive] = useState(all[0].label)
  const current = all.find((v) => v.label === active) ?? all[0]
  const [copied, setCopied] = useState(false)
  const html = useMemo(
    () => highlight(current.code, current.lang ?? lang),
    [current.code, current.lang, lang],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <div
      className={cn('code-block my-6 overflow-hidden rounded-xl border bg-code', className)}
      data-slot="code-block"
    >
      <div className="flex h-10 items-center justify-between gap-2 border-b px-2 pl-3">
        {variants ? (
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="h-7 bg-transparent p-0">
              {variants.map((v) => (
                <TabsTrigger
                  key={v.label}
                  value={v.label}
                  className="h-7 rounded-md px-2.5 font-mono text-xs data-[state=active]:bg-muted data-[state=active]:shadow-none dark:data-[state=active]:bg-muted"
                >
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{title ?? lang}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        </Button>
      </div>
      <pre
        className="overflow-auto p-4 text-[13px] leading-6"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code
          className="hljs font-mono text-code-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  )
}
