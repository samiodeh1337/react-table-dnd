// The live demos: each example component with its source, shown on the Examples page.
import FixedExample from '../examples/example-fixed'
import CustomRowHeightsExample from '../examples/example-flex'
import OptionsExample from '../examples/example-options'
import MultiSelectExample from '../examples/example-multiselect'
import CustomStyledExample from '../examples/example-styled'
import VirtualExample from '../examples/example-virtual'
import VirtualSelectExample from '../examples/example-virtual-select'
import Virtual2DExample from '../examples/example-virtual2d'
import StylingExample from '../examples/example-styling'
import DragHandleExample from '../examples/example-handle'
import StyledCompExample from '../examples/example-styledcomp'
import TailwindExample from '../examples/example-tailwind'
import ScrollCellExample from '../examples/example-scrollcell'
import WidthsExample from '../examples/example-widths'
import TanStackExample from '../examples/example-tanstack'

// Raw source imports for code preview (TSX — from real example files)
import srcFixedTsx from '../examples/example-fixed.tsx?raw'
import srcFlexTsx from '../examples/example-flex.tsx?raw'
import srcOptionsTsx from '../examples/example-options.tsx?raw'
import srcMultiSelectTsx from '../examples/example-multiselect.tsx?raw'
import srcStyledTsx from '../examples/example-styled.tsx?raw'
import srcVirtualTsx from '../examples/example-virtual.tsx?raw'
import srcVirtualSelectTsx from '../examples/example-virtual-select.tsx?raw'
import srcVirtual2dTsx from '../examples/example-virtual2d.tsx?raw'
import srcStylingTsx from '../examples/example-styling.tsx?raw'
import srcHandleTsx from '../examples/example-handle.tsx?raw'
import srcStyledCompTsx from '../examples/example-styledcomp.tsx?raw'
import srcTailwindTsx from '../examples/example-tailwind.tsx?raw'
import srcScrollCellTsx from '../examples/example-scrollcell.tsx?raw'
import srcScrollCellJsx from '../examples/jsx/example-scrollcell.jsx?raw'
import srcWidthsTsx from '../examples/example-widths.tsx?raw'
import srcTanStackTsx from '../examples/example-tanstack.tsx?raw'
import srcDataTsx from '../examples/example-data.ts?raw'

// Raw source imports for code preview (JSX — standalone copies)
import srcFixedJsx from '../examples/jsx/example-fixed.jsx?raw'
import srcFlexJsx from '../examples/jsx/example-flex.jsx?raw'
import srcOptionsJsx from '../examples/jsx/example-options.jsx?raw'
import srcMultiSelectJsx from '../examples/jsx/example-multiselect.jsx?raw'
import srcStyledJsx from '../examples/jsx/example-styled.jsx?raw'
import srcVirtualJsx from '../examples/jsx/example-virtual.jsx?raw'
import srcVirtualSelectJsx from '../examples/jsx/example-virtual-select.jsx?raw'
import srcVirtual2dJsx from '../examples/jsx/example-virtual2d.jsx?raw'
import srcStylingJsx from '../examples/jsx/example-styling.jsx?raw'
import srcHandleJsx from '../examples/jsx/example-handle.jsx?raw'
import srcStyledCompJsx from '../examples/jsx/example-styledcomp.jsx?raw'
import srcTailwindJsx from '../examples/jsx/example-tailwind.jsx?raw'
import srcWidthsJsx from '../examples/jsx/example-widths.jsx?raw'
import srcTanStackJsx from '../examples/jsx/example-tanstack.jsx?raw'

/** Add the stylesheet import after the library import (every copied demo needs it). */
function withStyles(raw: string): string {
  return raw.replace(
    /(from (["'])react-table-dnd\2;?)\n/,
    '$1\nimport $2react-table-dnd/styles$2\n',
  )
}

// The shared demo data, in its two parts: the row type, lists and generateRows, then arrayMove.
const DATA = srcDataTsx
  .replace(/\/\/.*\n/, '') // remove "Shared data generation" comment
  .replace(/^export /gm, '') // remove export keywords
const ARRAY_MOVE_AT = DATA.indexOf('function arrayMove')
const DATA_ROWS = DATA.slice(0, ARRAY_MOVE_AT).trimEnd() + '\n'
const DATA_ARRAY_MOVE = DATA.slice(ARRAY_MOVE_AT)

// Transform real example TSX source → user-ready code preview: imports point at the package, the
// stylesheet is imported, and only the parts of the shared data the example imports are pasted
function prepareTsx(raw: string): string {
  const imported = /import\s*\{([^}]*)\}\s*from\s*["']\.\/example-data["']/.exec(raw)?.[1] ?? ''
  const data =
    (/\b(generateRows|Row)\b/.test(imported) ? DATA_ROWS : '') +
    (/\barrayMove\b/.test(imported) ? DATA_ARRAY_MOVE : '')
  return withStyles(
    raw
      .replace(/from ["']\.\.\/Components["']/g, 'from "react-table-dnd"')
      // a function, not a string: `$$` in the data (template literals) must stay as written
      .replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/example-data["'];?\n?/g, () => data + '\n'),
  )
}

export const EXAMPLES = [
  {
    id: 'styled',
    label: 'Showcase',
    component: CustomStyledExample,
    tsx: prepareTsx(srcStyledTsx),
    jsx: withStyles(srcStyledJsx),
  },
  {
    id: 'fixed',
    label: 'Fixed Sizes',
    component: FixedExample,
    tsx: prepareTsx(srcFixedTsx),
    jsx: withStyles(srcFixedJsx),
  },
  {
    id: 'flex',
    label: 'Custom Heights',
    component: CustomRowHeightsExample,
    tsx: prepareTsx(srcFlexTsx),
    jsx: withStyles(srcFlexJsx),
  },
  {
    id: 'options',
    label: 'Drag Ranges',
    component: OptionsExample,
    tsx: prepareTsx(srcOptionsTsx),
    jsx: withStyles(srcOptionsJsx),
  },
  {
    id: 'multiselect',
    label: 'Multi-Select',
    component: MultiSelectExample,
    tsx: prepareTsx(srcMultiSelectTsx),
    jsx: withStyles(srcMultiSelectJsx),
  },
  {
    id: 'virtual',
    label: 'Virtual (rows)',
    component: VirtualExample,
    tsx: prepareTsx(srcVirtualTsx),
    jsx: withStyles(srcVirtualJsx),
  },
  {
    id: 'virtualselect',
    label: 'Virtual + Multi-Select',
    component: VirtualSelectExample,
    tsx: prepareTsx(srcVirtualSelectTsx),
    jsx: withStyles(srcVirtualSelectJsx),
  },
  {
    id: 'virtual2d',
    label: 'Virtual (rows + cols)',
    component: Virtual2DExample,
    tsx: prepareTsx(srcVirtual2dTsx),
    jsx: withStyles(srcVirtual2dJsx),
  },
  {
    id: 'handle',
    label: 'Drag Handle',
    component: DragHandleExample,
    tsx: prepareTsx(srcHandleTsx),
    jsx: withStyles(srcHandleJsx),
  },
  {
    id: 'styling',
    label: 'className & style',
    component: StylingExample,
    tsx: prepareTsx(srcStylingTsx),
    jsx: withStyles(srcStylingJsx),
  },
  {
    id: 'sc',
    label: 'styled-components',
    component: StyledCompExample,
    tsx: prepareTsx(srcStyledCompTsx),
    jsx: withStyles(srcStyledCompJsx),
  },
  {
    id: 'tw',
    label: 'Tailwind CSS',
    component: TailwindExample,
    tsx: prepareTsx(srcTailwindTsx),
    jsx: withStyles(srcTailwindJsx),
  },
  {
    id: 'scrollcell',
    label: 'Scrollable Cells',
    component: ScrollCellExample,
    tsx: prepareTsx(srcScrollCellTsx),
    jsx: withStyles(srcScrollCellJsx),
  },
  {
    id: 'tanstack',
    label: 'TanStack Table',
    component: TanStackExample,
    tsx: prepareTsx(srcTanStackTsx),
    jsx: withStyles(srcTanStackJsx),
  },
  {
    id: 'widths',
    label: 'Column Widths',
    component: WidthsExample,
    tsx: prepareTsx(srcWidthsTsx),
    jsx: withStyles(srcWidthsJsx),
  },
] as const

export type DemoId = (typeof EXAMPLES)[number]['id']
