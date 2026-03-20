# react-table-dnd — Architecture & Technical Deep Dive

## Overview

react-table-dnd is a React table component library with drag-and-drop reordering for both rows and columns. It achieves 60fps drag animations by manipulating the DOM directly (CSS transforms) instead of triggering React re-renders during drag. The library supports desktop (mouse/pen) and mobile (long-press + touch) with auto-scrolling near container edges.

---

## Project Structure

```
src/
├── Components/
│   ├── TableContainer/        # Root provider — drag context, state machine, refs
│   │   ├── index.tsx          # TableProvider with DragContext + useReducer
│   │   ├── useTable.tsx       # TableContext & useTable hook
│   │   └── styles.tsx         # Scoped styled-components (minimal resets)
│   ├── Draggable.tsx          # Wraps any row/column cell — creates clone on pointerdown
│   ├── BodyRow.tsx            # Row wrapper (Draggable type="row")
│   ├── ColumnCell.tsx         # Column header cell (Draggable type="column")
│   ├── RowCell.tsx            # Cell within a row — hides when its column is dragged
│   ├── TableHeader.tsx        # Header container — syncs horizontal scroll with body
│   ├── TableBody.tsx          # Body container — scrollable, hosts rows
│   ├── DragHandle.tsx         # Optional grip icon to restrict drag start area
│   ├── utils.ts               # Binary search for drop targets, range validation
│   └── index.ts               # Public API exports
├── hooks/
│   ├── types.ts               # TypeScript interfaces (DraggedState, Options, etc.)
│   ├── useDragContextEvents.tsx   # Main orchestrator — drag start/move/end/cancel
│   ├── useAutoScroll.ts       # Edge-zone auto-scroll with acceleration
│   └── useLongPress.ts        # Mobile long-press detection + JS scrolling fallback
└── examples/                  # 8+ demo files showing various configurations
```

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

**Desktop:** `mousedown` on a row/column → `beginDrag()` fires immediately.

**Mobile:** Touch on a row → 300ms long-press timer starts. During the wait, `preventDefault()` is called on every `touchmove` to block native scrolling. If the finger moves >8px, the timer is cancelled and JS-based scrolling takes over. If the finger stays still for 300ms, `beginDrag()` fires.

`beginDrag()` does the following:
1. Walks up the DOM from the event target to find the `.draggable` element
2. Checks if a `DragHandle` is present — if so, drag only starts from the handle
3. Captures the dragged element's size, position, and index
4. Caches all row/column positions (via `computeRowItems()` / `computeColumnItems()`)
5. Caches the container rect (used by auto-scroll — calculated once, never again)
6. Dispatches `dragStart` to the reducer — React renders the clone element
7. Positions the clone at the element's current viewport location

### Phase 2: Drag Move

`dragMove(clientX, clientY)` is called on every pointer/touch move:

1. **Clone follows finger/cursor** — sets `transform: translate(x, y)` on the clone element. This is a pure CSS write, no React re-render.

2. **Drop target detection** — uses `binarySearchDropIndex()` (O(log n)) to find which row/column the pointer is over. The search operates in absolute scroll-space coordinates so it works regardless of the current scroll position.

3. **Visual feedback** — when the drop target changes, `applyShiftTransforms()` runs via `requestAnimationFrame`:
   - Iterates all rows/columns
   - Applies `translateY()` / `translateX()` to shift siblings out of the way
   - Positions the placeholder indicator at the drop gap
   - Uses CSS transitions (`all 450ms cubic-bezier(0.2, 0, 0, 1)`) for smooth animation

4. **Auto-scroll** — if the pointer is within 30px of the container edge, `startAutoScroll()` is triggered (see [Auto-Scroll](#auto-scroll) below).

### Phase 3: Drag End

`dragEnd()` runs when the finger lifts or mouse releases:

1. Captures `targetIndex` and `sourceIndex` from refs
2. Saves the current scroll position (to restore after reflow)
3. Clears all shift transforms and hides the placeholder
4. Fires `onDragEnd({ sourceIndex, targetIndex, dragType })` — the consumer reorders their data
5. Dispatches `dragEnd` to the reducer — React unmounts the clone
6. Restores scroll position (synchronously + in `requestAnimationFrame` to survive React's reflow)

---

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

**Solution:** `touch-action: none` is set permanently on the body element (via `useEffect` on mount in `useDragContextEvents`). Since this disables native touch scrolling, `useLongPress` implements JS-based scrolling as a fallback when the long press is cancelled.

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
| `computeRowItems()` | O(n) × `getBoundingClientRect()` | Every `dragMove` call (recomputes fresh positions) |
| `applyShiftTransforms()` | O(n) DOM writes + 2 `getBoundingClientRect()` | Only when drop target changes (via `requestAnimationFrame`) |
| `binarySearchDropIndex()` | O(log n) | Every `dragMove` call |
| `autoScroll` tick | ~0ms (cached rect, pure `scrollTop` write) | Every animation frame during auto-scroll |
| `dragMove` pointer/clone update | ~0ms (style write + ref update) | Every pointer/touch move |

### Why It's Fast

1. **No React re-renders during drag** — all visual updates are direct DOM manipulation (transforms, inline styles). React only renders on `dragStart` (clone creation) and `dragEnd` (cleanup).

2. **Binary search for drop targets** — O(log n) instead of iterating all elements. Items are cached in absolute scroll-space so they survive scroll position changes.

3. **Event delegation** — single `mousedown`/`touchstart` listener on the table element, not one per row.

4. **CSS transitions for shifts** — `all 450ms cubic-bezier(0.2, 0, 0, 1)` on sibling transforms. The browser handles the animation on the compositor thread.

5. **Deferred shift transforms** — `applyShiftTransforms` is batched via `requestAnimationFrame`. Multiple drop index changes per frame collapse into one DOM update.

---

## Data Flow

```
User drags row 5 to position 3:

1. pointerdown/touchstart
   └── beginDrag() → dispatch("dragStart") → React renders clone

2. pointermove/touchmove (60x/sec)
   └── dragMove(x, y)
       ├── clone.style.transform = translate(x, y)      [direct DOM]
       ├── dropIndex = binarySearch(y, cachedItems)      [O(log n)]
       ├── applyShiftTransforms(5, 3, "row")             [rAF batched]
       │   ├── row 3: translateY(+height)                [shift down]
       │   ├── row 4: translateY(+height)                [shift down]
       │   └── placeholder at row 3 position
       └── startAutoScroll() if near edge

3. pointerup/touchend
   └── dragEnd()
       ├── onDragEnd({ source: 5, target: 3, type: "row" })
       │   └── consumer calls arrayMove(data, 5, 3) + setState
       ├── dispatch("dragEnd") → React unmounts clone
       └── restore scroll position
```

---

## Key Types

```typescript
interface DragEndResult {
  sourceIndex: number;
  targetIndex: number;
  dragType: "row" | "column";
}

interface Options {
  rowDragRange: { start?: number; end?: number };
  columnDragRange: { start?: number; end?: number };
}

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
  onDragEnd={({ sourceIndex, targetIndex, dragType }) => {
    if (dragType === "row") reorderRows(sourceIndex, targetIndex);
    else reorderColumns(sourceIndex, targetIndex);
  }}
  options={{
    rowDragRange: { start: 1 },        // freeze first row
    columnDragRange: { start: 0, end: 5 }, // only first 5 columns draggable
  }}
>
  <TableHeader>
    {columns.map((col, i) => (
      <ColumnCell key={col.id} id={col.id} index={i} width={col.width}>
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

- **Build:** `npm run build` → `tsc -b && vite build`
- **Output:** `dist/index.es.js` (ESM), `dist/index.cjs.js` (CJS), `dist/index.d.ts` (types)
- **Tree-shakeable:** `sideEffects: false`
- **Peer deps:** React >=17.0.0
- **Runtime deps:** `classnames`, `styled-components`
