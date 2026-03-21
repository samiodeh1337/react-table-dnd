import { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import FixedExample from './examples/example-fixed'
import CustomRowHeightsExample from './examples/example-flex'
import OptionsExample from './examples/example-options'
import CustomStyledExample from './examples/example-styled'
import VirtualExample from './examples/example-virtual'
import Virtual2DExample from './examples/example-virtual2d'
import StylingExample from './examples/example-styling'
import DragHandleExample from './examples/example-handle'
import StyledCompExample from './examples/example-styledcomp'
import TailwindExample from './examples/example-tailwind'
import ScrollCellExample from './examples/example-scrollcell'
import WidthsExample from './examples/example-widths'
import {
  TableContainer as _TC,
  TableHeader as _TH,
  ColumnCell as _CC,
  TableBody as _TB,
  BodyRow as _BR,
  RowCell as _RC,
} from './Components'
import './docs.css'

// Raw source imports for code preview (TSX — from real example files)
import srcFixedTsx from './examples/example-fixed.tsx?raw'
import srcFlexTsx from './examples/example-flex.tsx?raw'
import srcOptionsTsx from './examples/example-options.tsx?raw'
import srcStyledTsx from './examples/example-styled.tsx?raw'
import srcVirtualTsx from './examples/example-virtual.tsx?raw'
import srcVirtual2dTsx from './examples/example-virtual2d.tsx?raw'
import srcStylingTsx from './examples/example-styling.tsx?raw'
import srcHandleTsx from './examples/example-handle.tsx?raw'
import srcStyledCompTsx from './examples/example-styledcomp.tsx?raw'
import srcTailwindTsx from './examples/example-tailwind.tsx?raw'
import srcScrollCellTsx from './examples/example-scrollcell.tsx?raw'
import srcScrollCellJsx from './examples/jsx/example-scrollcell.jsx?raw'
import srcWidthsTsx from './examples/example-widths.tsx?raw'
import srcDataTsx from './examples/example-data.ts?raw'

// Raw source imports for code preview (JSX — standalone copies)
import srcFixedJsx from './examples/jsx/example-fixed.jsx?raw'
import srcFlexJsx from './examples/jsx/example-flex.jsx?raw'
import srcOptionsJsx from './examples/jsx/example-options.jsx?raw'
import srcStyledJsx from './examples/jsx/example-styled.jsx?raw'
import srcVirtualJsx from './examples/jsx/example-virtual.jsx?raw'
import srcVirtual2dJsx from './examples/jsx/example-virtual2d.jsx?raw'
import srcStylingJsx from './examples/jsx/example-styling.jsx?raw'
import srcHandleJsx from './examples/jsx/example-handle.jsx?raw'
import srcStyledCompJsx from './examples/jsx/example-styledcomp.jsx?raw'
import srcTailwindJsx from './examples/jsx/example-tailwind.jsx?raw'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)

// Transform real example TSX source → user-ready code preview
function prepareTsx(raw: string): string {
  const cleanData = srcDataTsx
    .replace(/\/\/.*\n/, '') // remove "Shared data generation" comment
    .replace(/^export /gm, '') // remove export keywords
  return raw
    .replace(/from ["']\.\.\/Components["']/g, 'from "react-table-dnd"')
    .replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/example-data["'];?\n?/g, cleanData + '\n')
}

const EXAMPLES = [
  {
    id: 'styled',
    label: 'Showcase',
    component: CustomStyledExample,
    tsx: prepareTsx(srcStyledTsx),
    jsx: srcStyledJsx,
  },
  {
    id: 'fixed',
    label: 'Fixed Sizes',
    component: FixedExample,
    tsx: prepareTsx(srcFixedTsx),
    jsx: srcFixedJsx,
  },
  {
    id: 'flex',
    label: 'Custom Heights',
    component: CustomRowHeightsExample,
    tsx: prepareTsx(srcFlexTsx),
    jsx: srcFlexJsx,
  },
  {
    id: 'options',
    label: 'Drag Ranges',
    component: OptionsExample,
    tsx: prepareTsx(srcOptionsTsx),
    jsx: srcOptionsJsx,
  },
  {
    id: 'virtual',
    label: 'Virtual (rows)',
    component: VirtualExample,
    tsx: prepareTsx(srcVirtualTsx),
    jsx: srcVirtualJsx,
  },
  {
    id: 'virtual2d',
    label: 'Virtual (rows + cols)',
    component: Virtual2DExample,
    tsx: prepareTsx(srcVirtual2dTsx),
    jsx: srcVirtual2dJsx,
  },
  {
    id: 'handle',
    label: 'Drag Handle',
    component: DragHandleExample,
    tsx: prepareTsx(srcHandleTsx),
    jsx: srcHandleJsx,
  },
  {
    id: 'styling',
    label: 'className & style',
    component: StylingExample,
    tsx: prepareTsx(srcStylingTsx),
    jsx: srcStylingJsx,
  },
  {
    id: 'sc',
    label: 'styled-components',
    component: StyledCompExample,
    tsx: prepareTsx(srcStyledCompTsx),
    jsx: srcStyledCompJsx,
  },
  {
    id: 'tw',
    label: 'Tailwind CSS',
    component: TailwindExample,
    tsx: prepareTsx(srcTailwindTsx),
    jsx: srcTailwindJsx,
  },
  {
    id: 'scrollcell',
    label: 'Scrollable Cells',
    component: ScrollCellExample,
    tsx: prepareTsx(srcScrollCellTsx),
    jsx: srcScrollCellJsx,
  },
  {
    id: 'widths',
    label: 'Column Widths',
    component: WidthsExample,
    tsx: prepareTsx(srcWidthsTsx),
    jsx: prepareTsx(srcWidthsTsx),
  },
] as const

const INSTALL_CMD = 'npm install react-table-dnd'

const BASIC_USAGE = `import { useState } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "react-table-dnd";

const INIT_COLS = [
  { id: "name", label: "Name",  width: 150 },
  { id: "age",  label: "Age",   width: 100 },
  { id: "email",label: "Email", width: 200 },
];

const INIT_ROWS = [
  { id: "1", name: "Alice", age: 28, email: "alice@example.com" },
  { id: "2", name: "Bob",   age: 34, email: "bob@example.com" },
  { id: "3", name: "Carol", age: 22, email: "carol@example.com" },
];

function arrayMove(arr, from, to) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MyTable() {
  const [cols, setCols] = useState(INIT_COLS);
  const [rows, setRows] = useState(INIT_ROWS);

  const handleDragEnd = ({ sourceIndex, targetIndex, dragType }) => {
    if (dragType === "column") {
      setCols(arrayMove(cols, sourceIndex, targetIndex));
    } else {
      setRows(arrayMove(rows, sourceIndex, targetIndex));
    }
  };

  return (
    <TableContainer onDragEnd={handleDragEnd}>
      <TableHeader>
        {cols.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} style={{ width: col.width }}>
            {col.label}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci}>
                {row[col.id]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}`

const DRAG_RANGE_CODE = `<TableContainer
  onDragEnd={handleDragEnd}
  options={{
    columnDragRange: { start: 1 }, // column 0 is locked
    rowDragRange:    { start: 1 }, // row 0 is locked
  }}
>
  {/* ... */}
</TableContainer>`

const PLACEHOLDER_CODE = `<TableContainer
  onDragEnd={handleDragEnd}
  renderPlaceholder={() => (
    <div style={{
      background: "#6366f122",
      border: "2px dashed #6366f1",
      borderRadius: 4,
      height: "100%",
    }} />
  )}
>
  {/* ... */}
</TableContainer>`

const TYPES_CODE = `interface DragEndResult {
  sourceIndex: number;          // original index of dragged item
  targetIndex: number;          // index where it was dropped
  dragType: "row" | "column";
}

interface TableOptions {
  columnDragRange?: {
    start?: number; // first draggable column index
    end?:   number; // last draggable column index
  };
  rowDragRange?: {
    start?: number; // first draggable row index
    end?:   number; // last draggable row index
  };
}`

// ── Syntax-highlighted code block ──────────────────────
interface CodeBlockProps {
  code?: string
  lang?: string
  tsxCode?: string
  jsxCode?: string
}

function CodeBlock({ code, lang = 'tsx', tsxCode, jsxCode }: CodeBlockProps) {
  const hasTabs = !!(tsxCode && jsxCode)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'tsx' | 'jsx'>('jsx')
  const ref = useRef<HTMLElement>(null)

  const displayCode = hasTabs ? (activeTab === 'jsx' ? jsxCode! : tsxCode!) : (code ?? '')
  const displayLang = hasTabs ? activeTab : lang

  useEffect(() => {
    if (!ref.current) return
    ref.current.removeAttribute('data-highlighted')
    hljs.highlightElement(ref.current)
  }, [displayCode, displayLang])

  const copy = () => {
    navigator.clipboard.writeText(displayCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const hljsLang = ['tsx', 'ts', 'jsx'].includes(displayLang) ? 'typescript' : displayLang

  return (
    <div className="code-block">
      <div className="code-header">
        {hasTabs ? (
          <div className="code-lang-tabs">
            <button
              className={`code-lang-tab ${activeTab === 'tsx' ? 'code-lang-tab-active' : ''}`}
              onClick={() => setActiveTab('tsx')}
            >
              TSX
            </button>
            <button
              className={`code-lang-tab ${activeTab === 'jsx' ? 'code-lang-tab-active' : ''}`}
              onClick={() => setActiveTab('jsx')}
            >
              JSX
            </button>
          </div>
        ) : (
          <span className="code-lang">{lang}</span>
        )}
        <button className="copy-btn" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre>
        <code ref={ref} className={`language-${hljsLang}`}>
          {displayCode}
        </code>
      </pre>
    </div>
  )
}

// ── App ────────────────────────────────────────────────
// ── Basic demo (matches the "Basic Usage" code block) ──
function BasicDemo() {
  const [cols, setCols] = useState([
    { id: 'name', label: 'Name', width: 150 },
    { id: 'age', label: 'Age', width: 100 },
    { id: 'email', label: 'Email', width: 200 },
  ])
  const [rows, setRows] = useState([
    { id: '1', name: 'Alice', age: 28, email: 'alice@example.com' },
    { id: '2', name: 'Bob', age: 34, email: 'bob@example.com' },
    { id: '3', name: 'Carol', age: 22, email: 'carol@example.com' },
  ] as Record<string, string | number>[])

  const move = <T,>(arr: T[], from: number, to: number) => {
    const next = [...arr]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }

  return (
    <div className="example-container" style={{ marginTop: 16 }}>
      <div style={{ width: '100%' }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8b8b94' }}>
          Try it — drag rows and columns:
        </p>
        <_TC
          onDragEnd={({
            sourceIndex,
            targetIndex,
            dragType,
          }: {
            sourceIndex: number
            targetIndex: number
            dragType: 'row' | 'column'
          }) => {
            if (dragType === 'column') setCols(move(cols, sourceIndex, targetIndex))
            else setRows(move(rows, sourceIndex, targetIndex))
          }}
          style={{ height: 180, border: '1px solid #2e2e36', borderRadius: 8 }}
        >
          <_TH>
            {cols.map((col, i) => (
              <_CC
                key={col.id}
                id={col.id}
                index={i}
                style={{
                  width: col.width,
                  display: 'flex',
                  alignItems: 'center',
                  height: 40,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: '#1e1e24',
                  borderBottom: '2px solid #2e2e36',
                  textTransform: 'uppercase' as const,
                }}
              >
                {col.label}
              </_CC>
            ))}
          </_TH>
          <_TB>
            {rows.map((row, ri) => (
              <_BR key={row.id as string} id={row.id as string} index={ri}>
                {cols.map((col, ci) => (
                  <_RC
                    key={col.id}
                    index={ci}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      fontSize: 13,
                      color: '#cbd5e1',
                      background: '#16161c',
                      borderBottom: '1px solid #232329',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {row[col.id]}
                  </_RC>
                ))}
              </_BR>
            ))}
          </_TB>
        </_TC>
      </div>
    </div>
  )
}

function App() {
  const [activeExample, setActiveExample] = useState('styled')
  const [showCode, setShowCode] = useState(false)
  const [installCopied, setInstallCopied] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  const activeConfig = EXAMPLES.find((e) => e.id === activeExample)!
  const ActiveComponent = activeConfig.component

  const copyInstall = () => {
    navigator.clipboard.writeText(INSTALL_CMD)
    setInstallCopied(true)
    setTimeout(() => setInstallCopied(false), 1500)
  }

  return (
    <div className="docs">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            react-table<span>-dnd</span>
          </a>
          <button className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {navOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          <div className={`nav-links ${navOpen ? 'nav-open' : ''}`}>
            <a href="#demos" onClick={() => setNavOpen(false)}>
              Demos
            </a>
            <a href="#getting-started" onClick={() => setNavOpen(false)}>
              Get Started
            </a>
            <a href="#api" onClick={() => setNavOpen(false)}>
              API
            </a>
            <a
              href="https://github.com/samiodeh1337/react-table-dnd"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/react-table-dnd"
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="badge">v2.0.6 &middot; MIT License</div>
        <h1>
          The drag-and-drop table
          <br />
          React deserves
        </h1>
        <p className="hero-desc">
          Reorder rows and columns with 60fps animations, auto-scroll, mobile long-press, virtual
          scrolling for 100k+ rows, and full style control. Zero UI dependencies.
        </p>
        <div className="hero-actions">
          <a href="#demos" className="btn btn-primary">
            See Demos
          </a>
          <a
            href="https://github.com/samiodeh1337/react-table-dnd"
            className="btn btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
        <div className="install-cmd">
          <span className="dollar">$</span>
          <code>{INSTALL_CMD}</code>
          <button onClick={copyInstall}>{installCopied ? 'Copied!' : 'Copy'}</button>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        {[
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 3v18M3 8l4-4 4 4M13 20l4-4 4 4" />
              </svg>
            ),
            title: 'Row & Column Drag',
            desc: 'Reorder both rows and columns with smooth 60fps animations. Direct DOM transforms — no React re-renders during drag.',
          },
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            ),
            title: 'Mobile & Desktop',
            desc: 'Long-press to drag on touch devices, click-drag on desktop. Auto-scroll near edges with smooth acceleration.',
          },
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M21 12a9 9 0 11-6.22-8.56" />
                <path d="M21 3v6h-6" />
              </svg>
            ),
            title: 'Virtual Scrolling',
            desc: 'Works with @tanstack/react-virtual to handle 100k+ rows. Drag handles, range constraints, and full TypeScript support.',
          },
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="13.5" cy="6.5" r="2.5" />
                <path d="M17.5 10.5c3 0 4.5 1 4.5 3.5v2H2v-2c0-2.5 1.5-3.5 4.5-3.5" />
                <circle cx="6.5" cy="6.5" r="2.5" />
              </svg>
            ),
            title: 'Fully Styleable',
            desc: 'className and style on every component. Works with Tailwind, styled-components, CSS modules — zero opinionated styles.',
          },
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            ),
            title: 'Drag Constraints',
            desc: 'Lock specific rows or columns in place. Set drag ranges to control exactly which items are draggable.',
          },
          {
            icon: (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            ),
            title: 'TypeScript First',
            desc: 'Full type definitions for all props, callbacks, and options. Autocomplete and type safety out of the box.',
          },
        ].map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <hr className="divider" />

      {/* Live Demos */}
      <section className="section-wide" id="demos">
        <h2>Live Demos</h2>
        <p className="subtitle">Try dragging rows and columns in the tables below.</p>

        <div className="example-wrapper">
          <div className="example-header">
            <div className="example-select-wrap">
              <select
                className="example-select"
                value={activeExample}
                onChange={(e) => {
                  setActiveExample(e.target.value)
                  setShowCode(false)
                }}
              >
                {EXAMPLES.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.label}
                  </option>
                ))}
              </select>
              <svg
                className="example-select-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <button
              className={`code-toggle-btn ${showCode ? 'code-toggle-active' : ''}`}
              onClick={() => setShowCode((v) => !v)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              {showCode ? 'Hide code' : 'View code'}
            </button>
          </div>
          {showCode ? (
            <CodeBlock tsxCode={activeConfig.tsx} jsxCode={activeConfig.jsx} />
          ) : (
            <div className="example-container">
              <ActiveComponent />
            </div>
          )}
        </div>
      </section>

      <hr className="divider" />

      {/* Getting Started */}
      <section className="section" id="getting-started">
        <h2>Getting Started</h2>
        <p className="subtitle">Install and set up react-table-dnd in under a minute.</p>

        <h3>Installation</h3>
        <CodeBlock
          lang="bash"
          code={`# npm\nnpm install react-table-dnd\n\n# yarn\nyarn add react-table-dnd\n\n# pnpm\npnpm add react-table-dnd`}
        />

        <h3>Peer Dependencies</h3>
        <p>
          Requires <code className="inline-code">react</code> and{' '}
          <code className="inline-code">react-dom</code> ≥ 17.0.0.
        </p>

        <h3>Basic Usage</h3>
        <CodeBlock code={BASIC_USAGE} lang="jsx" />
        <BasicDemo />
      </section>

      <hr className="divider" />

      {/* API Reference */}
      <section className="section" id="api">
        <h2>API Reference</h2>
        <p className="subtitle">All exported components and types.</p>

        <h3 id="api-tablecontainer">
          <code className="inline-code">&lt;TableContainer&gt;</code>
        </h3>
        <p>
          Root wrapper that provides the drag-and-drop context. Renders a{' '}
          <code className="inline-code">&lt;div&gt;</code> and accepts a ref.
        </p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>onDragEnd</code>
                </td>
                <td>
                  <code>(result: DragEndResult) =&gt; void</code>
                </td>
                <td>—</td>
                <td>Called when a drag completes.</td>
              </tr>
              <tr>
                <td>
                  <code>renderPlaceholder</code>
                </td>
                <td>
                  <code>() =&gt; ReactNode</code>
                </td>
                <td>—</td>
                <td>Custom placeholder at the drag source.</td>
              </tr>
              <tr>
                <td>
                  <code>options</code>
                </td>
                <td>
                  <code>TableOptions</code>
                </td>
                <td>—</td>
                <td>Drag range constraints.</td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>—</td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>—</td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-tableheader">
          <code className="inline-code">&lt;TableHeader&gt;</code>
        </h3>
        <p>Container for column header cells. Accepts a ref.</p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>
                  Should contain <code>ColumnCell</code> elements.
                </td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-columncell">
          <code className="inline-code">&lt;ColumnCell&gt;</code>
        </h3>
        <p>Individual draggable column header cell.</p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>id</code>
                </td>
                <td>
                  <code>string | number</code> <strong>(required)</strong>
                </td>
                <td>Unique identifier for this column.</td>
              </tr>
              <tr>
                <td>
                  <code>index</code>
                </td>
                <td>
                  <code>number</code> <strong>(required)</strong>
                </td>
                <td>Column index in the current order.</td>
              </tr>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>Content inside the header cell.</td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-tablebody">
          <code className="inline-code">&lt;TableBody&gt;</code>
        </h3>
        <p>Container for body rows. Accepts a ref (required for virtual scrolling).</p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>
                  Should contain <code>BodyRow</code> elements.
                </td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-bodyrow">
          <code className="inline-code">&lt;BodyRow&gt;</code>
        </h3>
        <p>A draggable table row.</p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>id</code>
                </td>
                <td>
                  <code>string | number</code> <strong>(required)</strong>
                </td>
                <td>Unique identifier for this row.</td>
              </tr>
              <tr>
                <td>
                  <code>index</code>
                </td>
                <td>
                  <code>number</code> <strong>(required)</strong>
                </td>
                <td>Row index in the current order.</td>
              </tr>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>
                  Should contain <code>RowCell</code> elements.
                </td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-rowcell">
          <code className="inline-code">&lt;RowCell&gt;</code>
        </h3>
        <p>
          A cell within a body row. Must match the column order of{' '}
          <code className="inline-code">ColumnCell</code> elements.
        </p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>index</code>
                </td>
                <td>
                  <code>number</code> <strong>(required)</strong>
                </td>
                <td>
                  Column index — must match the corresponding <code>ColumnCell</code> index.
                </td>
              </tr>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>Content to render.</td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-draghandle">
          <code className="inline-code">&lt;DragHandle&gt;</code>
        </h3>
        <p>
          Wrap any element inside a <code className="inline-code">ColumnCell</code> or{' '}
          <code className="inline-code">BodyRow</code> with this component to make it the drag
          trigger. When present, only clicking the handle starts a drag — the rest of the row/column
          is inert.
        </p>
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>children</code>
                </td>
                <td>
                  <code>ReactNode</code>
                </td>
                <td>The handle content (e.g. a grip icon).</td>
              </tr>
              <tr>
                <td>
                  <code>className</code>
                </td>
                <td>
                  <code>string</code>
                </td>
                <td>CSS class.</td>
              </tr>
              <tr>
                <td>
                  <code>style</code>
                </td>
                <td>
                  <code>CSSProperties</code>
                </td>
                <td>Inline styles.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="api-types">Types</h3>
        <CodeBlock lang="ts" code={TYPES_CODE} />
      </section>

      <hr className="divider" />

      {/* Code Examples */}
      <section className="section" id="code-examples">
        <h2>Code Examples</h2>
        <p className="subtitle">Common configuration patterns.</p>

        <h3>Constraining Drag Range</h3>
        <p>Lock the first column and first row so they can't be dragged:</p>
        <CodeBlock code={DRAG_RANGE_CODE} lang="jsx" />

        <h3>Custom Placeholder</h3>
        <p>Render a custom element in the spot vacated by the dragged item:</p>
        <CodeBlock code={PLACEHOLDER_CODE} lang="jsx" />
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          Built by{' '}
          <a href="https://github.com/samiodeh1337" target="_blank" rel="noreferrer">
            Sami Odeh
          </a>{' '}
          &middot; MIT License &middot;{' '}
          <a
            href="https://github.com/samiodeh1337/react-table-dnd"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
