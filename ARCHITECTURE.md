# react-table-dnd — Architecture & Technical Deep Dive

## Overview

react-table-dnd is a React table component library with drag-and-drop reordering for both rows and columns. It achieves 60fps drag animations by manipulating the DOM directly (CSS transforms) instead of triggering React re-renders during drag. The library supports desktop (mouse/pen) and mobile (long-press + touch) with auto-scrolling near container edges.

---

## Project Structure

```
src/
├── Components/
│   ├── TableContainer/        # Root provider — store, reducer, refs, the drag clone element
│   │   ├── index.tsx          # TableContainer: props, reducer, controlled/uncontrolled selection
│   │   ├── store.ts           # Tiny external store (useSyncExternalStore), no-op dispatch guard
│   │   ├── useTable.tsx       # useTable / useTableStore(selector) / useTableDispatch
│   │   └── styles.tsx         # Root wrapper div
│   ├── Draggable.tsx          # Outer/inner divs every row and column cell renders (data-rtdnd="draggable")
│   ├── BodyRow.tsx            # Row wrapper (Draggable type="row")
│   ├── ColumnCell.tsx         # Column header cell (Draggable type="column")
│   ├── RowCell.tsx            # Cell within a row (a column drag hides and shifts it through the DOM)
│   ├── TableHeader.tsx        # Header container — syncs horizontal scroll with body
│   ├── TableBody.tsx          # Body container — scrollable, hosts rows
│   ├── DragHandle.tsx         # Optional grip icon to restrict drag start area
│   ├── SelectHandle.tsx       # Optional checkbox area: only presses inside it change the selection
│   ├── style.css              # Scoped library CSS (import 'react-table-dnd/styles')
│   ├── utils.ts               # Range validation, arrayMoveMultiple / moveRowsById helpers
│   └── index.ts               # Public API exports
├── hooks/
│   ├── types.ts               # TypeScript interfaces (DraggedState, DragGroup, Options, etc.)
│   ├── useDragContextEvents.tsx   # Orchestrator — sequences one drag (start/move/end/cancel)
│   ├── useSelectionGestures.ts    # Press / release / tap gestures → selection commits
│   ├── useDeferredActivation.ts   # The 5px wait between mousedown and a row drag
│   ├── useDragClone.ts        # The element that follows the pointer (card or column strip)
│   ├── useHiddenElements.ts   # Rows / cells hidden during a drag, restored afterwards
│   ├── useDragWindowEvents.ts # Window pointer/keyboard listeners while a drag runs
│   ├── useDropTarget.ts       # Collapsed-coordinate drop resolution (rows, columns)
│   ├── useShiftTransforms.ts  # Sibling shift transforms + placeholder
│   ├── useDropSettle.ts       # FLIP "unfold" animation after a drop
│   ├── useIndexMaps.ts        # O(1) index → element maps, staleness detection
│   ├── useAutoScroll.ts       # Edge-zone auto-scroll with acceleration
│   ├── useLongPress.ts        # Mobile long-press detection + JS scrolling fallback
│   └── drag/                  # Pure decision logic (no React; `dom.ts` / `cloneBuilders.ts` touch the DOM only)
│       ├── constants.ts       # Timings, distances, transition strings
│       ├── selectionRules.ts  # pressRule / releaseRule / tapRule / selectHandlePressRule
│       ├── dragGroup.ts       # resolveDragGroup, member height prefix sums
│       ├── dropMath.ts        # midpoint counting, gap ↔ targetIndex ↔ insertIndex
│       ├── shiftMath.ts       # shiftFor, placeholderSlot, affectedRange
│       ├── dom.ts             # findDraggable, select-handle lookups, row queries
│       ├── cloneBuilders.ts   # buildRowCard / buildColumnStrip / topUpColumnStrip
│       ├── inlineStyleStash.ts # saves the inline styles a drag overwrites, restores them after
│       └── __tests__/         # vitest unit tests for the pure modules (`npm test`)
└── examples/                  # 8+ demo files showing various configurations
```

**One drag model.** Every drag is described by a `DragGroup` (`ids`, sorted `indices`, per-row
`heights`, `grabbed`, `cardHeight`, `count`). A plain single-row drag is a group of one; there is no
separate single-row code path. Decisions (which rows form the group, where the slot is, how far
each row slides, what a press does to the selection) are pure functions under `hooks/drag/` with
unit tests; the hooks own refs and DOM writes; the orchestrator only sequences them.

---

## Component Hierarchy

```
TableContainer (Context Provider)
├── TableHeader
│   └── ColumnCell × N  →  Draggable (type="column")
│       └── optional DragHandle
└── TableBody
    └── BodyRow × N  →  Draggable (type="row")
        ├── optional DragHandle
        └── RowCell × N
```

---

## How Drag-and-Drop Works

### Phase 1: Drag Start

**Desktop:** `mousedown` on a row/column → `beginDrag()` fires immediately (tables with `selectable` on defer row drags until the pointer has moved 5px — see Multi-select).

**Mobile:** Touch on a row → 300ms long-press timer starts. During the wait, `preventDefault()` is called on every `touchmove` to block native scrolling. If the finger moves >8px, the timer is cancelled and JS-based scrolling takes over. If the finger stays still for 300ms, `beginDrag()` fires.

`beginDrag()` checks that the press can become a drag (the row is still mounted, a `DragHandle`
row was pressed on its handle, a touch press was not resolved as a tap) and then `startDrag()`:
1. Flushes a previous drop that is still animating, then resets the per-drag state
2. Measures the grabbed element and the container once (`captureGeometry`) and builds the index maps
3. Resolves the `DragGroup` (`resolveDragGroup`): the selection if the grabbed row is in it, else the row alone
4. Caches all row/column positions in collapsed coordinates (`computeRowItems()` / `computeColumnItems()`)
5. Hides the grabbed row and every other member (`useHiddenElements`), builds the clone (`useDragClone`)
6. Dispatches `dragStart` to the reducer — React renders the clone element at the row's location

### Phase 2: Drag Move

`dragMove(clientX, clientY)` is called on every pointer/touch move:

1. **Clone follows finger/cursor** — sets `transform: translate(x, y)` on the clone element. This is a pure CSS write, no React re-render.

2. **Drop target detection** — `resolveDropIndex()` works in *collapsed* coordinates: the dragged row/column is removed from the cached item list and later items are pulled up/left by its size, so thresholds match what the user sees. The gap is the number of collapsed items whose midpoint lies before the dragged item's leading edge (O(log n) binary search), i.e. a swap needs half the neighbour's height/width of travel in either direction — the same rule for every column width. Rows are measured in absolute scroll-space so the cache survives scrolling.

3. **Visual feedback** — when the drop target changes, `applyShiftTransforms()` runs via `requestAnimationFrame`:
   - Iterates all rows/columns
   - Applies `translateY()` / `translateX()` to shift siblings out of the way
   - Positions the placeholder indicator at the drop gap
   - Uses CSS transitions (`transform 450ms cubic-bezier(0.2, 0, 0, 1)`) for smooth animation

4. **Auto-scroll** — if the pointer is within 30px of the container edge, `startAutoScroll()` is triggered (see [Auto-Scroll](#auto-scroll) below).

### Phase 3: Drag End

`dragEnd()` runs when the finger lifts or mouse releases:

1. Captures `targetIndex` and `sourceIndex` from refs
2. Saves the current scroll position (to restore after reflow)
3. Clears all shift transforms and hides the placeholder
4. Fires `onDragEnd({ sourceIndex, targetIndex, dragType })` — the consumer reorders their data
5. Dispatches `dragEnd` to the reducer — React unmounts the clone
6. Restores scroll position (synchronously + in `requestAnimationFrame` to survive React's reflow)
7. Row drags: a FLIP pass (`useDropSettle`) measures every mounted row before and after the consumer's re-render and transitions each from its old visual spot to its new slot (~260ms). Rows that moved start on the card's landing slot, invisible, so a group unfolds out of the card instead of popping open. Skipped under `prefers-reduced-motion`; cancelled by a new drag.

---

### Multi-select & group drag (rows)

Opt-in via `selectable` on `TableContainer`. Selection lives in the store (`state.selection = { ids: Set<string>, anchorId, anchorIndex }` — the anchor row for Shift ranges is tracked by id, with the index as a fallback) and is synced from the `selectedIds` prop when controlled. `BodyRow` subscribes to `ids.has(id)`, so only rows whose flag flips re-render.

**Gestures** are split across two moments, because a drag starts on `mousedown` and the press that starts dragging a group must not deselect it (Finder semantics):

| Gesture | mousedown (`pressRule`) | mouseup before the drag activates, i.e. under 5px of movement (`releaseRule`) |
|---|---|---|
| plain, row not selected | selection = [row] | — |
| plain, row selected | — (group may be dragged) | selection = [row], or [] if it was the only one |
| plain, empty body space (`dragStart`) | selection = [] | — |
| Escape (not dragging) | selection = [] | — |
| Ctrl/Cmd, not selected | add row | — |
| Ctrl/Cmd, selected | — | remove row |
| Shift | range(anchor..row) | — |

Ctrl, Cmd and Alt are all treated as the toggle modifier. The rules are pure functions in `hooks/drag/selectionRules.ts` (`pressRule`, `releaseRule`, `tapRule`, `selectHandlePressRule`); `useSelectionGestures` reads the store, runs the rule and commits the result. With `selectable` on, `dragStart` does not call `beginDrag` on mousedown: it runs the press rule, then `useDeferredActivation` waits on window pointer events until the pointer has moved `DRAG_ACTIVATION_DISTANCE` (5px) before activating the drag, so a click never flashes the clone or starts a drag. Non-selectable tables keep the immediate mousedown activation.

**`<SelectHandle>` rows.** When a row contains `[data-select-handle]`, the press rule only runs for presses inside it: a press toggles the row (Shift: adds the range) and is resolved immediately, so it never becomes a drag; a press elsewhere on the row leaves the selection alone but may still drag (the group if the row is selected). Empty-space clearing is disabled for tables that use select handles.

Touch: a tap (no long-press, no scroll) toggles the row via `useLongPress.onTap` (only inside the handle for `<SelectHandle>` rows).

**Group drag.** `resolveDragGroup` (`hooks/drag/dragGroup.ts`) builds the `DragGroup` for every drag: when the grabbed row belongs to a multi-row selection it holds every selected, mounted, unlocked row (`ids` in table order, sorted `indices`, per-row `heights`, `count`), otherwise just the grabbed row. The clone is a compact card: the grabbed row plus a `[data-rtdnd="drag-count"]` badge and a stacked-card shadow. The members left in the table are hidden (`opacity: 0`, left in flow so nothing reflows) and removed from the drop-target items; at drag start `useHiddenElements.foldGroupRows` animates each one into the card (a `GRAB_FOLD_MS` = 360ms frame loop that chases the card's live position, since it is already following the pointer, and allows for body scroll; the row stays opaque for the first half and fades during the second, positioned and raised so it is drawn above the sliding rows), the mirror of the drop unfold, after which it is in the plain hidden state. `useShiftTransforms` then moves every non-member row by `shiftFor` (`hooks/drag/shiftMath.ts`):

```
shift(i) = (i >= gap ? +H : 0) - Σ heights of members with index < i      (gap = insertIndex)
```

where `H` is `group.cardHeight` (the grabbed row's height), so the gap that opens is one row tall and the other members simply vanish from the list; with one member this is the classic single-row shift. The placeholder (`placeholderSlot`) is `H` tall and sits above the first non-member row at or after the gap.

The drop target is resolved in the same **collapsed coordinates**: `useDropTarget.computeRowItems` drops every member and pulls each later row up by the member heights above it, so the thresholds match what the user sees rather than the stale layout. The gap is the number of collapsed rows whose midpoint lies above the clone's top edge (`resolveDrop` in `hooks/drag/dropMath.ts`). That rule needs half a neighbour's height of travel before the gap moves in either direction, so a small nudge never shifts anything. A single-row drag is the one-member case of the same rule. On drop, `DragEndResult` carries `selectedIds`, `sourceIndices` and `insertIndex` (the gap in the original array, `targetIndex + (source < target ? 1 : 0)`); `moveRowsById` / `arrayMoveMultiple` apply it. In virtual tables only mounted members can be resolved, so ids are the source of truth.

## Auto-Scroll

**File:** `src/hooks/useAutoScroll.ts`

When the pointer enters the 30px edge zone of the scrollable container, auto-scrolling begins.

### How It Works

```
startAutoScroll(speed, container, direction)
└── Sets flag, defers first tick via requestAnimationFrame
    └── autoScroll(speed, ref, dir)  [recursive rAF loop]
        ├── Check pointer against cached container rect
        │   └── If pointer left edge zone → stop
        ├── ref.scrollTop += speed  (or scrollLeft)
        ├── Check boundary (scrollTop >= maxScroll or <= 0) → stop
        └── Schedule next tick: rAF(autoScroll(speed + decay))
```

### Key Design Decisions

| Decision | Why |
|---|---|
| **Container rect cached once** (at drag start) | `getBoundingClientRect()` forces synchronous layout. Calling it 60x/sec starved touch events on mobile. The container doesn't move during drag, so one read is enough. |
| **First tick deferred** (not synchronous) | Writing `scrollTop` inside a touch event handler causes Chrome Android to reclaim the touch sequence (`touchcancel`), killing all future touch/pointer events. Deferring to `requestAnimationFrame` avoids this. |
| **Quadratic acceleration** | `decaySpeed += speed / 1000` each tick. Speed compounds: `speed + decaySpeed` feeds into the next tick. Starts slow, builds up naturally. No cap — the boundary check stops it. |
| **Pointer check every frame** | Uses cached rect + `pointerRef` (updated by drag handler). Pure in-memory comparison, no DOM reads. Stops auto-scroll when finger leaves edge zone. |

### Scroll Position Preservation

When the drag ends, `clearShiftTransforms()` removes CSS transforms from all rows. This causes a layout reflow that can shift `scrollTop`. The `onDragEnd` callback then triggers a React re-render (data reorder), causing another reflow. Scroll position is restored:
1. Synchronously after `clearShiftTransforms()`
2. In `requestAnimationFrame` after React re-renders

---

## Mobile Support — The Hard Part

**File:** `src/hooks/useLongPress.ts`

Mobile drag-and-drop required solving several Chrome Android-specific issues.

### Problem 1: `touch-action` Must Be Set Before Touch

Chrome Android evaluates `touch-action` at `pointerdown` time. Setting it dynamically (e.g., 300ms later after confirming a long press) is **ignored**. If `touch-action` is not `none` when the finger touches down, Chrome can fire `touchcancel` at any time (especially when programmatic scrolling via `scrollTop` occurs), killing all touch and pointer event delivery.

**Solution:** `touch-action: none` is in place before the finger lands: `style.css` sets it on draggable rows and drag handles, `Draggable` sets it on each row's outer element (not on locked rows, not on rows that have a `DragHandle`), and `useHiddenElements.grab` locks the whole table while a drag runs. Since this disables native touch scrolling on those rows, `useLongPress` scrolls in JavaScript when the long press is cancelled, and passes the rest of a swipe on to the page once the table body reaches its edge.

### Problem 2: No `scrollTop` Writes During Touch Handlers

Writing `ref.scrollTop` inside a `touchmove` handler causes Chrome Android to reclaim the touch for native scrolling (even with `touch-action: none` set after `pointerdown`).

**Solution:** `startAutoScroll()` defers the first scroll tick to `requestAnimationFrame` instead of calling `autoScroll()` synchronously. The scroll write happens in a separate execution context, outside the touch handler.

### Problem 3: Reliable Event Delivery

Desktop uses `window.pointermove` for drag tracking — always reliable. Mobile originally used `tableEl.touchmove { passive: false }`, which blocks the compositor and can starve the main thread.

**Solution:** With `touch-action: none` set permanently, Chrome delivers `pointermove` and `pointerup` reliably for touch input. The window-level pointer event listeners handle touch the same way as mouse — `dragMove()` and `dragEnd()` fire from `pointermove`/`pointerup` for all pointer types. The `touchmove` handler in `useLongPress` provides a fallback.

### Problem 4: JS Scrolling Fallback

With native scrolling disabled (`touch-action: none`), users need an alternative way to scroll the table when not dragging.

**Solution:** `useLongPress` detects scroll intent (finger moves >8px during the 300ms wait) and switches to a JS scroll mode:

```
touchstart → start 300ms timer
  ├── finger moves >8px → cancel timer, enter JS scroll mode
  │     └── touchmove: body.scrollTop -= deltaY, body.scrollLeft -= deltaX
  └── 300ms elapses → enter drag mode
        └── touchmove: onDragMove(clientX, clientY)
```

---

## Performance Architecture

### Where the Heavy Work Lives

| Operation | Cost | When |
|---|---|---|
| `computeRowItems()` | O(n) × `getBoundingClientRect()` | Once at drag start; again only after auto-scroll or a virtual remount invalidates the cache |
| `applyShiftTransforms()` | O(n) DOM writes + 2 `getBoundingClientRect()` | Only when drop target changes (via `requestAnimationFrame`) |
| `resolveDropIndex()` | O(log n) | Every `dragMove` call |
| `autoScroll` tick | ~0ms (cached rect, pure `scrollTop` write) | Every animation frame during auto-scroll |
| `dragMove` pointer/clone update | ~0ms (style write + ref update) | Every pointer/touch move |

### Why It's Fast

1. **No React re-renders during drag** — all visual updates are direct DOM manipulation (transforms, inline styles). React only renders on `dragStart` (clone creation) and `dragEnd` (cleanup).

2. **Binary search for drop targets** — O(log n) over the cached collapsed item list instead of iterating all elements. Row items are cached in absolute scroll-space so they survive scroll position changes.

3. **Event delegation** — single `mousedown`/`touchstart` listener on the table element, not one per row.

4. **CSS transitions for shifts** — `transform 450ms cubic-bezier(0.2, 0, 0, 1)` on sibling transforms. The browser handles the animation on the compositor thread.

5. **Deferred shift transforms** — `applyShiftTransforms` is batched via `requestAnimationFrame`. Multiple drop index changes per frame collapse into one DOM update.

---

## Data Flow

```
User drags row 5 (nothing selected) to position 3:

1. mousedown (selectable: after 5px of movement) / 300ms long-press
   └── beginDrag() → startDrag()
       ├── resolveDragGroup → a group of one: { indices: [5], grabbed: 5 }
       ├── computeRowItems()                              [once: collapsed positions]
       ├── hide row 5, clone.build() → buildRowCard        [direct DOM]
       └── dispatch("dragStart")                           [React render #1]

2. pointermove/touchmove (one call per animation frame)
   └── dragMove(x, y)
       ├── clone.follow(x − grabX, y − grabY)             [direct DOM]
       ├── target = resolveDropIndex(...)                 [O(log n), no DOM reads]
       └── if target changed → next frame: applyShiftTransforms(target)
           ├── rows 3, 4: translateY(+height)             [shiftFor, affected range only]
           └── placeholder above row 3                    [placeholderSlot]

3. pointerup/touchend
   └── dragEnd() → clone.snapTo(placeholder) → 200ms → finalizeDrop()
       ├── settle.measure()  → hidden.restore()
       ├── onDragEnd({ sourceIndex: 5, targetIndex: 3, dragType: "row",
       │               selectedIds: ["row-5"], sourceIndices: [5], insertIndex: 3 })
       │   └── consumer: moveRowsById(data, selectedIds, insertIndex)   [React render #2]
       ├── clearShiftTransforms(), restore scroll
       └── settle.play()                                  [FLIP to the new layout]
```

---

## Key Types

```typescript
interface DragEndResult {
  sourceIndex: number;
  targetIndex: number;
  dragType: "row" | "column";
  // row drags only — see Multi-select
  selectedIds?: string[];    // every row that moved, in table order
  sourceIndices?: number[];  // their indices as rendered
  insertIndex?: number;      // gap in the original array to insert the group at
}

// the `options` prop of TableContainer (both optional)
interface TableOptionsProp {
  rowDragRange?: { start?: number; end?: number };    // end is inclusive
  columnDragRange?: { start?: number; end?: number };
}

// internal Options in the store also carry defaultSizing, selectable, showDragCount

interface HookRefs {
  tableRef: MutableRefObject<HTMLDivElement | null> | null;
  bodyRef: MutableRefObject<HTMLDivElement | null> | null;
  headerRef: MutableRefObject<HTMLDivElement | null> | null;
  cloneRef: MutableRefObject<HTMLDivElement | null> | null;
  placeholderRef: MutableRefObject<HTMLDivElement | null> | null;
}
```

---

## Consumer API

```tsx
import { TableContainer, TableHeader, TableBody, BodyRow, ColumnCell, RowCell, DragHandle } from "react-table-dnd";

<TableContainer
  onDragEnd={(r) => {
    if (r.dragType === "row") setRows((p) => moveRowsById(p, r.selectedIds!, r.insertIndex!));
    else if (r.sourceIndex !== r.targetIndex) setColumns((p) => arrayMove(p, r.sourceIndex, r.targetIndex));
  }}
  options={{
    rowDragRange: { start: 1 },        // freeze first row
    columnDragRange: { start: 0, end: 5 }, // only first 5 columns draggable
  }}
>
  <TableHeader>
    {columns.map((col, i) => (
      <ColumnCell key={col.id} id={col.id} index={i} style={{ width: col.width }}>
        <DragHandle><GripIcon /></DragHandle>
        {col.title}
      </ColumnCell>
    ))}
  </TableHeader>
  <TableBody>
    {rows.map((row, i) => (
      <BodyRow key={row.id} id={row.id} index={i}>
        {columns.map((col, ci) => (
          <RowCell key={col.id} index={ci}>{row[col.id]}</RowCell>
        ))}
      </BodyRow>
    ))}
  </TableBody>
</TableContainer>
```

---

## Build & Distribution

- **Build:** `npm run build` → `tsc -b && vite build && node scripts/finish-build.mjs`
- **Output:** `dist/index.es.js` (ESM), `dist/index.cjs` (CommonJS), `dist/index.d.ts` (one rolled-up types file) and `dist/index.d.cts` (the same, for `require`), `dist/react-table-dnd.css`
- **Side effects:** `["**/*.css"]` (the JS is tree-shakeable; the stylesheet must not be dropped)
- **Peer deps:** `react` / `react-dom` >= 18.0.0
- **Runtime deps:** none
