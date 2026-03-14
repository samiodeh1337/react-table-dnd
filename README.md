# flexitablesort

[![npm version](https://img.shields.io/npm/v/flexitablesort)](https://www.npmjs.com/package/flexitablesort)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/flexitablesort)](https://bundlephobia.com/package/flexitablesort)
[![license](https://img.shields.io/npm/l/flexitablesort)](https://github.com/samiodeh1337/sortable-table/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/flexitablesort)](https://www.npmjs.com/package/flexitablesort)

Drag-and-drop row and column reordering for React tables. Smooth animations, auto-scroll, virtual scrolling support, and zero external UI dependencies.

## Install

```bash
npm install flexitablesort
```

Peer dependencies: `react` and `react-dom` >= 17.0.0

## Quick Start

```jsx
import { useState } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";

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
          <ColumnCell key={col.id} id={col.id} index={i} width={col.width}>
            {col.label}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {cols.map((col, ci) => (
              <RowCell key={col.id} index={ci} width={col.width}>
                {row[col.id]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}
```

## Features

- **Row & column drag** — reorder independently, automatic direction detection
- **Smooth animations** — direct DOM transforms, no React re-renders during drag
- **Auto-scroll** — scrolls when dragging near edges with acceleration
- **Drag range constraints** — lock specific rows/columns via `options`
- **DragHandle** — restrict drag to a grip icon instead of the whole row
- **Virtual scrolling** — works with `@tanstack/react-virtual` for 100k+ rows
- **Fully styleable** — every component accepts `className` and `style`
- **Event delegation** — single mousedown listener regardless of row count
- **TypeScript** — full type definitions included

## Components

| Component | Description |
|---|---|
| `TableContainer` | Root wrapper. Provides drag context. Accepts `onDragEnd`, `options`, `renderPlaceholder`. |
| `TableHeader` | Header row container. |
| `ColumnCell` | Draggable column header cell. Requires `id`, `index`. Optional `width`. |
| `TableBody` | Body container. Pass a `ref` for virtual scrolling. |
| `BodyRow` | Draggable row. Requires `id`, `index`. |
| `RowCell` | Cell within a row. Requires `index`. Optional `width`. |
| `DragHandle` | Wrap inside ColumnCell/BodyRow to restrict drag to this element only. |

## Options

```jsx
<TableContainer
  onDragEnd={handleDragEnd}
  options={{
    columnDragRange: { start: 1 },       // column 0 is locked
    rowDragRange: { start: 2, end: 95 }, // rows 0-1 and 96+ are locked
  }}
/>
```

## DragHandle

```jsx
import { DragHandle } from "flexitablesort";

<ColumnCell id={col.id} index={i} width={150}>
  <DragHandle><GripIcon /></DragHandle>
  {col.title}
</ColumnCell>
```

When a `DragHandle` is inside a `ColumnCell` or `BodyRow`, only clicking the handle starts a drag.

## Types

```typescript
interface DragEndResult {
  sourceIndex: number;
  targetIndex: number;
  dragType: "row" | "column";
}
```

## Browser Support

Tested on Chrome, Firefox, and Safari (desktop). Mobile touch events are supported but not extensively tested across devices.

## License

MIT
