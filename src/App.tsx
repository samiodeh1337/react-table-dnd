import { useState, useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import FixedExample from "./examples/example-fixed";
import CustomRowHeightsExample from "./examples/example-flex";
import OptionsExample from "./examples/example-options";
import CustomStyledExample from "./examples/example-styled";
import VirtualExample from "./examples/example-virtual";
import StylingExample from "./examples/example-styling";
import DragHandleExample from "./examples/example-handle";
import "./docs.css";

// Raw source imports for code preview (TSX — from real example files)
import srcFixedTsx from "./examples/example-fixed.tsx?raw";
import srcFlexTsx from "./examples/example-flex.tsx?raw";
import srcOptionsTsx from "./examples/example-options.tsx?raw";
import srcStyledTsx from "./examples/example-styled.tsx?raw";
import srcVirtualTsx from "./examples/example-virtual.tsx?raw";
import srcStylingTsx from "./examples/example-styling.tsx?raw";
import srcHandleTsx from "./examples/example-handle.tsx?raw";
import srcDataTsx from "./examples/example-data.ts?raw";

// Raw source imports for code preview (JSX — standalone copies)
import srcFixedJsx from "./examples/jsx/example-fixed.jsx?raw";
import srcFlexJsx from "./examples/jsx/example-flex.jsx?raw";
import srcOptionsJsx from "./examples/jsx/example-options.jsx?raw";
import srcStyledJsx from "./examples/jsx/example-styled.jsx?raw";
import srcVirtualJsx from "./examples/jsx/example-virtual.jsx?raw";
import srcStylingJsx from "./examples/jsx/example-styling.jsx?raw";
import srcHandleJsx from "./examples/jsx/example-handle.jsx?raw";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);

// Transform real example TSX source → user-ready code preview
function prepareTsx(raw: string): string {
  const cleanData = srcDataTsx
    .replace(/\/\/.*\n/, "")           // remove "Shared data generation" comment
    .replace(/^export /gm, "");        // remove export keywords
  return raw
    .replace(/from ["']\.\.\/Components["']/g, 'from "flexitablesort"')
    .replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/example-data["'];?\n?/g, cleanData + "\n");
}

const EXAMPLES = [
  { id: "fixed",   label: "Fixed Sizes",        component: FixedExample,           tsx: prepareTsx(srcFixedTsx),   jsx: srcFixedJsx   },
  { id: "flex",    label: "Custom Heights",      component: CustomRowHeightsExample, tsx: prepareTsx(srcFlexTsx),    jsx: srcFlexJsx    },
  { id: "options", label: "Drag Ranges",         component: OptionsExample,          tsx: prepareTsx(srcOptionsTsx), jsx: srcOptionsJsx },
  { id: "styled",  label: "Custom Styled",       component: CustomStyledExample,     tsx: prepareTsx(srcStyledTsx),  jsx: srcStyledJsx  },
  { id: "virtual", label: "Virtual (100k rows)", component: VirtualExample,          tsx: prepareTsx(srcVirtualTsx), jsx: srcVirtualJsx },
  { id: "styling", label: "className & style",   component: StylingExample,          tsx: prepareTsx(srcStylingTsx), jsx: srcStylingJsx },
  { id: "handle",  label: "Drag Handle",         component: DragHandleExample,       tsx: prepareTsx(srcHandleTsx),  jsx: srcHandleJsx  },
] as const;

const INSTALL_CMD = "npm install flexitablesort";

const BASIC_USAGE = `import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";

function MyTable() {
  const [columns, setColumns] = useState(["Name", "Age", "Email"]);
  const [rows, setRows] = useState([
    ["Alice", 28, "alice@example.com"],
    ["Bob",   34, "bob@example.com"],
  ]);

  const handleDragEnd = ({ sourceIndex, targetIndex, dragType }) => {
    if (dragType === "column") {
      const next = [...columns];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      setColumns(next);
    } else {
      const next = [...rows];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      setRows(next);
    }
  };

  return (
    <TableContainer onDragEnd={handleDragEnd}>
      <TableHeader>
        {columns.map((col) => (
          <ColumnCell key={col} width={150}>{col}</ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <BodyRow key={ri}>
            {row.map((cell, ci) => (
              <RowCell key={ci} index={ci} width={150}>{cell}</RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}`;

const DRAG_RANGE_CODE = `<TableContainer
  onDragEnd={handleDragEnd}
  options={{
    columnDragRange: { start: 1 }, // column 0 is locked
    rowDragRange:    { start: 1 }, // row 0 is locked
  }}
>
  {/* ... */}
</TableContainer>`;

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
</TableContainer>`;

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
}`;

// ── Syntax-highlighted code block ──────────────────────
interface CodeBlockProps {
  code?: string;
  lang?: string;
  tsxCode?: string;
  jsxCode?: string;
}

function CodeBlock({ code, lang = "tsx", tsxCode, jsxCode }: CodeBlockProps) {
  const hasTabs = !!(tsxCode && jsxCode);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"tsx" | "jsx">("jsx");
  const ref = useRef<HTMLElement>(null);

  const displayCode = hasTabs ? (activeTab === "jsx" ? jsxCode! : tsxCode!) : (code ?? "");
  const displayLang = hasTabs ? activeTab : lang;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.removeAttribute("data-highlighted");
    hljs.highlightElement(ref.current);
  }, [displayCode, displayLang]);

  const copy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hljsLang = ["tsx", "ts", "jsx"].includes(displayLang) ? "typescript" : displayLang;

  return (
    <div className="code-block">
      <div className="code-header">
        {hasTabs ? (
          <div className="code-lang-tabs">
            <button
              className={`code-lang-tab ${activeTab === "tsx" ? "code-lang-tab-active" : ""}`}
              onClick={() => setActiveTab("tsx")}
            >
              TSX
            </button>
            <button
              className={`code-lang-tab ${activeTab === "jsx" ? "code-lang-tab-active" : ""}`}
              onClick={() => setActiveTab("jsx")}
            >
              JSX
            </button>
          </div>
        ) : (
          <span className="code-lang">{lang}</span>
        )}
        <button className="copy-btn" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre>
        <code ref={ref} className={`language-${hljsLang}`}>{displayCode}</code>
      </pre>
    </div>
  );
}

// ── App ────────────────────────────────────────────────
function App() {
  const [activeExample, setActiveExample] = useState("fixed");
  const [showCode, setShowCode] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);

  const activeConfig = EXAMPLES.find((e) => e.id === activeExample)!;
  const ActiveComponent = activeConfig.component;

  const copyInstall = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 1500);
  };

  return (
    <div className="docs">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">flexitable<span>sort</span></a>
          <div className="nav-links">
            <a href="#demos">Demos</a>
            <a href="#getting-started">Get Started</a>
            <a href="#api">API</a>
            <a href="https://github.com/samiodeh1337/sortable-table" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.npmjs.com/package/flexitablesort" target="_blank" rel="noreferrer">npm</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="badge">v1.0.0 &middot; MIT License</div>
        <h1>Drag-and-drop sorting<br />for React tables</h1>
        <p className="hero-desc">
          Reorder rows and columns with smooth animations, auto-scroll,
          virtual scrolling support, and zero external UI dependencies.
        </p>
        <div className="hero-actions">
          <a href="#demos" className="btn btn-primary">See Demos</a>
          <a href="https://github.com/samiodeh1337/sortable-table" className="btn btn-secondary" target="_blank" rel="noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
        <div className="install-cmd">
          <span className="dollar">$</span>
          <code>{INSTALL_CMD}</code>
          <button onClick={copyInstall}>{installCopied ? "Copied!" : "Copy"}</button>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        {[
          { icon: "⇅", title: "Row & Column Drag", desc: "Reorder both rows and columns independently with automatic direction detection." },
          { icon: "⚡", title: "Smooth Animations", desc: "Direct DOM transforms bypass React re-renders for buttery 60fps drag animations." },
          { icon: "↔", title: "Auto-scroll", desc: "Automatically scrolls when dragging near edges, with smooth acceleration and decay." },
          { icon: "🔒", title: "Drag Range Constraints", desc: "Lock specific rows or columns in place by setting drag range boundaries." },
          { icon: "🔄", title: "Virtual Scrolling", desc: "Works with @tanstack/react-virtual to handle 100k+ rows with no performance drop." },
          { icon: "🎨", title: "Fully Styleable", desc: "Every component accepts className and style. No opinionated styles to fight against." },
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
        <div className="example-tabs-row">
          <div className="example-tabs">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                className={`tab ${activeExample === ex.id ? "tab-active" : ""}`}
                onClick={() => { setActiveExample(ex.id); setShowCode(false); }}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <button
            className={`code-toggle-btn ${showCode ? "code-toggle-active" : ""}`}
            onClick={() => setShowCode((v) => !v)}
            title={showCode ? "Hide source" : "View source"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            {showCode ? "Hide code" : "View code"}
          </button>
        </div>

        {showCode ? (
          <CodeBlock tsxCode={activeConfig.tsx} jsxCode={activeConfig.jsx} />
        ) : (
          <div className="example-container">
            <ActiveComponent />
          </div>
        )}
      </section>

      <hr className="divider" />

      {/* Getting Started */}
      <section className="section" id="getting-started">
        <h2>Getting Started</h2>
        <p className="subtitle">Install and set up flexitablesort in under a minute.</p>

        <h3>Installation</h3>
        <CodeBlock lang="bash" code={`# npm\nnpm install flexitablesort\n\n# yarn\nyarn add flexitablesort\n\n# pnpm\npnpm add flexitablesort`} />

        <h3>Peer Dependencies</h3>
        <p>Requires <code className="inline-code">react</code> and <code className="inline-code">react-dom</code> ≥ 17.0.0.</p>

        <h3>Basic Usage</h3>
        <CodeBlock code={BASIC_USAGE} />
      </section>

      <hr className="divider" />

      {/* API Reference */}
      <section className="section" id="api">
        <h2>API Reference</h2>
        <p className="subtitle">All exported components and types.</p>

        <h3 id="api-tablecontainer"><code className="inline-code">&lt;TableContainer&gt;</code></h3>
        <p>Root wrapper that provides the drag-and-drop context. Renders a <code className="inline-code">&lt;div&gt;</code> and accepts a ref.</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>onDragEnd</code></td><td><code>(result: DragEndResult) =&gt; void</code></td><td>—</td><td>Called when a drag completes.</td></tr>
            <tr><td><code>renderPlaceholder</code></td><td><code>() =&gt; ReactNode</code></td><td>—</td><td>Custom placeholder at the drag source.</td></tr>
            <tr><td><code>options</code></td><td><code>TableOptions</code></td><td>—</td><td>Drag range constraints.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>—</td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>—</td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-tableheader"><code className="inline-code">&lt;TableHeader&gt;</code></h3>
        <p>Container for column header cells. Accepts a ref.</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>Should contain <code>ColumnCell</code> elements.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-columncell"><code className="inline-code">&lt;ColumnCell&gt;</code></h3>
        <p>Individual draggable column header cell.</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>width</code></td><td><code>number</code></td><td>Fixed width in pixels.</td></tr>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>Content inside the header cell.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-tablebody"><code className="inline-code">&lt;TableBody&gt;</code></h3>
        <p>Container for body rows. Accepts a ref (required for virtual scrolling).</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>Should contain <code>BodyRow</code> elements.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-bodyrow"><code className="inline-code">&lt;BodyRow&gt;</code></h3>
        <p>A draggable table row.</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>Should contain <code>RowCell</code> elements.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-rowcell"><code className="inline-code">&lt;RowCell&gt;</code></h3>
        <p>A cell within a body row.</p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>index</code></td><td><code>number</code> <strong>(required)</strong></td><td>Column index — used to sync position during column drags.</td></tr>
            <tr><td><code>width</code></td><td><code>number</code></td><td>Fixed width in pixels.</td></tr>
            <tr><td><code>isClone</code></td><td><code>true</code></td><td>Marks cell as drag clone (internal use).</td></tr>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>Content to render.</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

        <h3 id="api-draghandle"><code className="inline-code">&lt;DragHandle&gt;</code></h3>
        <p>
          Wrap any element inside a <code className="inline-code">ColumnCell</code> or <code className="inline-code">BodyRow</code> with
          this component to make it the drag trigger. When present, only clicking the handle starts a drag — the rest of the row/column is inert.
        </p>
        <table className="api-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>children</code></td><td><code>ReactNode</code></td><td>The handle content (e.g. a grip icon).</td></tr>
            <tr><td><code>className</code></td><td><code>string</code></td><td>CSS class.</td></tr>
            <tr><td><code>style</code></td><td><code>CSSProperties</code></td><td>Inline styles.</td></tr>
          </tbody>
        </table>

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
        <CodeBlock code={DRAG_RANGE_CODE} />

        <h3>Custom Placeholder</h3>
        <p>Render a custom element in the spot vacated by the dragged item:</p>
        <CodeBlock code={PLACEHOLDER_CODE} />
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          Built by <a href="https://github.com/samiodeh1337" target="_blank" rel="noreferrer">Sami Odeh</a>
          {" "}&middot; MIT License &middot;{" "}
          <a href="https://github.com/samiodeh1337/sortable-table" target="_blank" rel="noreferrer">Source on GitHub</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
