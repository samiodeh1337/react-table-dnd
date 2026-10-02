# Changelog
## 3.0.0 (2026-10-02)

### Breaking / behaviour changes

- Drop resolution changed for every drag: drops follow the placeholder more precisely. `targetIndex` keeps its 2.x meaning (the index `arrayMove(data, sourceIndex, targetIndex)` expects), but the same pointer position can give a different index than in 2.x
- Row drags always report `selectedIds`, `sourceIndices` and `insertIndex` in `DragEndResult`, even on tables without `selectable` (a test that compares the whole result object will see the extra fields)
- `DragEndResult` is now a union on `dragType` (`RowDragEndResult | ColumnDragEndResult`): after `if (r.dragType === 'row')` the three row fields are typed as always present, so no `!` is needed. Code that builds a row result object by hand (e.g. in tests) must include them
- `BodyRow` and `ColumnCell` now declare `id` and `index` as required props in their types (they were always required at runtime; omitting them used to compile and produce a row id of `"undefined"`)
- `BodyRow`, `ColumnCell` and `RowCell` no longer accept any prop name in their types (the `[propName: string]: any` signature is gone; unknown props were silently dropped at runtime). Real HTML attributes (`aria-*`, `data-*`, `title`, `onClick`, …) are now typed and passed to the row / header cell / cell element; `TableContainer`, `TableHeader`, `TableBody`, `DragHandle` and `SelectHandle` pass them to their element too
- `DraggableProps` is no longer exported (it described an internal component); every public component's props type is exported instead: `TableContainerProps`, `TableHeaderProps`, `ColumnCellProps`, `TableBodyProps`, `BodyRowProps`, `RowCellProps`, `DragHandleProps`, `SelectHandleProps`
- The drag card is `[data-rtdnd='clone']` instead of `id="portalroot"` (two tables on one page rendered the same id); update CSS that targets `#portalroot`
- Rows get `data-selected="true"` while selected whenever `selectedIds` or `defaultSelectedIds` is passed
- The CommonJS build is now `dist/index.cjs` (was `dist/index.cjs.js`); `require('react-table-dnd')` resolves to it through `exports`. Only deep imports of the old file path are affected
- With `selectable` on, a row drag starts after the pointer has moved 5px (a click never flashes the clone); non-selectable tables and columns still start on mousedown
- Escape during a drag now cancels the drag only: it no longer reaches your own Escape handlers (a surrounding dialog stays open)
- Presses in a text field, textarea, select or contenteditable inside a row no longer start a drag
- The v2 README, architecture notes and examples are archived under `docs/v2/`

### Features

- Multi-select rows: `selectable`, `selectedIds`, `defaultSelectedIds`, `onSelectionChange` on `TableContainer`; click, Ctrl/Cmd/Alt+click and Shift+click on desktop, tap on touch; pressing empty body space or Escape (when your last press was in the table) clears the selection
- Group drag: dragging a selected row moves the whole selection; you drag a compact card with a count badge, the other selected rows fold into the card as the drag starts (360ms), and on drop they unfold out of the landing slot into place (260ms); both animations are skipped under `prefers-reduced-motion`
- `DragEndResult` gains `selectedIds`, `sourceIndices` and `insertIndex`; `RowDragEndResult` / `ColumnDragEndResult` types; new `moveRowsById` and `arrayMoveMultiple` helpers; `SelectionState` type exported
- `disabled` on `BodyRow` and `ColumnCell` works: that item cannot be picked up (it was typed but ignored in 2.x)
- Drag lifecycle callbacks on `TableContainer`: `onDragStart`, `onDragOver` (each new drop slot, with what a drop there would give) and `onDragCancel` (Escape, window blur, a release without moving). New `DragStartInfo` and `DragCancelInfo` types. Every event, `DragEndResult` included, carries `id`: the id of the grabbed row or column
- Docs: a TanStack Table guide and a **TanStack Table** demo (checkboxes, a filter, drops that keep hidden rows in place; `@tanstack/react-table` 9 is a dev dependency of the docs only), and a Drag events guide with a live event log
- `showDragCount` prop on `TableContainer` (default `true`) to hide the count badge on the group drag card
- `SelectHandle` component: checkbox-style selection — only presses inside the handle change the selection for that row
- `BodyRow` gains `selectedClassName` / `selectedStyle` and sets `data-selected="true"` while selected
- Styling hooks: `[data-rtdnd='drag-count']` (badge), `[data-rtdnd='drag-stack']` (ghost cards), `--rtdnd-card-bg` (card colour), `[data-drop-target]` (the row/column the drop will land on)
- `options.rowDragRange` and `options.columnDragRange` are now optional in the type (either can be left out)
- Demos: new Multi-Select and Virtual + Multi-Select demos; checkbox (`SelectHandle`) selection in Showcase and Custom Heights; click selection in Tailwind, styled-components, className & style, Fixed Sizes, Drag Handle, Column Widths, Scrollable Cells and Drag Ranges

### Changed

- Drops are consistent in both directions and with mixed row heights and column widths. Previously moving an item forward reacted much sooner than moving it back, which felt uneven with mixed column widths
- Under `prefers-reduced-motion` the drop is applied immediately instead of after the 200ms snap

### Bug Fixes

- `require('react-table-dnd')` threw `exports is not defined in ES module scope` (the CommonJS build was a `.js` file in a `"type": "module"` package)
- Types did not resolve under `moduleResolution: node16` / `nodenext` (extension-less relative imports); the types are now one self-contained file, with a `.d.cts` copy for `require`
- Server-side rendering failed with "Missing getServerSnapshot", and React 18 printed a `useLayoutEffect` warning for every table rendered on the server
- The published types needed `esModuleInterop` / `allowSyntheticDefaultImports`; without them every component's props silently became `any`
- A dragged row lost its grab cursor for good after the drop (the engine cleared the inline cursor React had set)
- A drag erased inline styles you set yourself: `opacity`, `transform` and `transition` on `RowCell`s after a column drag, and `touch-action` on `TableContainer`; a column drop also left the engine's transition on half the body cells
- During auto-scroll several rows could carry `[data-drop-target]` at once
- A drag kept following the pointer after the mouse button was released outside the window or the window lost focus; it now cancels
- Buttons, links and other controls inside a row never got their clicks in a table without `selectable`: the press started a drag at once. A press on a control now waits for a 5px move before dragging
- With `selectable`, a row could not be dragged by pressing an image or a link in it: the browser's own drag of the image took the pointer
- A selected row removed from the data (not scrolled away in a virtual table) still counted in the group: the drag card showed the wrong count and `selectedIds` listed the missing id
- Shift+click could start a range from a row that was no longer on screen or selected (for example after a filter hid it and the selection was cleared); it now starts a new range
- Touch: lifting a second finger dropped the drag; a long-press that turned into a click (off a drag handle) could start an auto-scroll that never stopped; a swipe on a row could not scroll the page once the table body reached its edge
- Scrolling the page, a parent or the table body without moving the pointer (a wheel, a sideways scroll) or resizing the window during a drag left the drop slot where the rows used to be
- Virtual tables: rows that mounted during a column drag were neither hidden, shifted nor shown in the drag card
- Escape stopped clearing the selection when the table sat inside a focusable element (a dialog, a `tabIndex={-1}` wrapper): clicking plain cell text focuses that wrapper, which counted as leaving the table
- Touch scrolling did not work on rows or columns locked by `rowDragRange` / `columnDragRange`
- Passing a `ref` to `TableHeader` broke column drag and header/body scroll sync
- An element with its own `data-id` attribute inside a cell was mistaken for a draggable row
- The idle drag clone was not hidden, so browsers with always-visible scrollbars could paint empty scrollbars in the top-left corner
- Escape during a drag also closed surrounding dialogs, and Escape during the 5px wait cleared the selection
- Escape during the 200ms drop snap reported the drag a second time with no target
- A press during the 200ms drop snap was resolved against the pre-drop layout (wrong row, wrong Shift range)
- A timer from a previous tap could re-enable mouse handling during the next tap on touch devices
- `rowDragRange: { end: 0 }` was ignored when resolving drop slots
- Escape during a drag now restores the dragged row / column cells instead of leaving them invisible
- A press exactly on an SVG shape inside a `DragHandle` (e.g. one of the grip dots) no longer gets mistaken for a scrollbar click and ignored
- Starting a new drag while the previous drop is still snapping into place now finalizes that drop before measuring the pressed row
- `DragRange.end` was documented as exclusive; it is inclusive

### Internals

- The drag engine was split: one drag model (every drag is a `DragGroup`, a single row is a group of one), pure decision modules under `src/hooks/drag/` (selection rules, group resolution, drop maths, shift maths), and small hooks for gestures, deferred activation, the clone, hidden elements, the fold and the settle animation. `useDragContextEvents` only sequences them
- Unit tests with vitest (`npm test`) for the pure modules and the `arrayMoveMultiple` / `moveRowsById` helpers, run in CI before the build
- `styled-components` and `classnames` removed from the bundler externals (neither was used)

## 2.0.18 (2026-07-17)

### Bug Fixes

- Flush pending drop cleanup so a fast second drag (or a cancel) no longer races the ~200ms drop-snap animation timeout, which could leave the previous row hidden or corrupt drag state
- Skip the post-shift transform frame when the drag has already ended

### Chores

- Bump `styled-components`, `typescript-eslint`, and `vite` devDependencies

## 1.0.0 (2025-03-14)

### Features

- Drag-and-drop reordering for both rows and columns
- Smooth 60fps animations using direct DOM transforms
- Auto-scroll when dragging near container edges
- Drag range constraints (`columnDragRange`, `rowDragRange`)
- Custom placeholder rendering via `renderPlaceholder`
- `DragHandle` component for restricting drag to a grip element
- Virtual scrolling support (compatible with `@tanstack/react-virtual`)
- Full `className` and `style` prop support on every component
- Event delegation — single listener regardless of row count
- TypeScript support with full type definitions
