<div align="center">

# flexitablesort

<p>
  <img src="./docs/desktop.gif" alt="flexitablesort — drag rows and columns" width="680" />
</p>

<p><strong>Drag-and-drop row & column reordering for React tables.</strong></p>

<p>60fps animations &middot; Auto-scroll &middot; Mobile long-press &middot; Virtual scrolling &middot; Zero UI deps</p>

<p>
  <a href="https://www.npmjs.com/package/flexitablesort"><img src="https://img.shields.io/npm/v/flexitablesort?color=6366f1&label=npm" alt="npm" /></a>
  <a href="https://bundlephobia.com/package/flexitablesort"><img src="https://img.shields.io/bundlephobia/minzip/flexitablesort?color=6366f1&label=size" alt="bundle size" /></a>
  <a href="https://www.npmjs.com/package/flexitablesort"><img src="https://img.shields.io/npm/dm/flexitablesort?color=6366f1" alt="downloads" /></a>
  <a href="https://github.com/samiodeh1337/sortable-table/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/flexitablesort?color=6366f1" alt="license" /></a>
</p>

<p>
  <a href="https://samiodeh1337.github.io/sortable-table/"><strong>Live Demos & Docs</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick Start</a>
  &nbsp;&middot;&nbsp;
  <a href="#api">API</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/samiodeh1337/sortable-table">GitHub</a>
</p>

</div>

---

## Why flexitablesort?

- **Rows & columns** — reorder both independently, automatic direction detection
- **60fps** — direct DOM transforms during drag, no React re-renders until drop
- **Mobile** — long-press to drag on touch devices, optimized for Chrome Android & Safari iOS
- **Auto-scroll** — accelerates when dragging near container edges
- **100k+ rows** — works with `@tanstack/react-virtual`
- **Drag handles** — restrict drag to a grip icon with `<DragHandle>`
- **Constraints** — lock specific rows or columns via drag range options
- **Drop animation** — clone smoothly flies to the drop target
- **Fully styleable** — `className` + `style` on every component — Tailwind, styled-components, CSS modules
- **TypeScript** — full type definitions out of the box
- **Tiny** — only peer dependency is React

## Install

```bash
npm install flexitablesort
```

> Requires `react` and `react-dom` >= 17.0.0

## Quick Start

```jsx
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
} from "flexitablesort";

function arrayMove(arr, from, to) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function App() {
  const [cols, setCols] = useState([
    { id: "name", label: "Name", width: 150 },
    { id: "age",  label: "Age",  width: 100 },
    { id: "city", label: "City", width: 160 },
  ]);
  const [rows, setRows] = useState([
    { id: "1", name: "Alice", age: 28, city: "NYC" },
    { id: "2", name: "Bob",   age: 34, city: "LA" },
    { id: "3", name: "Carol", age: 22, city: "SF" },
  ]);

  return (
    <TableContainer
      onDragEnd={({ sourceIndex, targetIndex, dragType }) => {
        if (dragType === "column") setCols(arrayMove(cols, sourceIndex, targetIndex));
        else setRows(arrayMove(rows, sourceIndex, targetIndex));
      }}
    >
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

## API

### Components

| Component | Props | Description |
|---|---|---|
| **`TableContainer`** | `onDragEnd`, `options`, `renderPlaceholder`, `className`, `style` | Root wrapper — provides drag context |
| **`TableHeader`** | `className`, `style` | Header row container |
| **`ColumnCell`** | **`id`**, **`index`**, `width`, `className`, `style` | Draggable column header cell |
| **`TableBody`** | `className`, `style` | Scrollable body — pass `ref` for virtual scrolling |
| **`BodyRow`** | **`id`**, **`index`**, `className`, `style` | Draggable row |
| **`RowCell`** | **`index`**, `width`, `className`, `style` | Cell within a row |
| **`DragHandle`** | `className`, `style` | Wrap inside BodyRow/ColumnCell to restrict drag to this element |

Bold props are required.

### Types

```typescript
interface DragEndResult {
  sourceIndex: number;
  targetIndex: number;
  dragType: "row" | "column";
}

interface DragRange {
  start?: number;  // first draggable index
  end?: number;    // last draggable index (exclusive)
}
```

### Options

```jsx
<TableContainer
  options={{
    rowDragRange: { start: 1 },        // lock first row
    columnDragRange: { start: 1, end: 5 }, // lock first col, only 1-4 draggable
  }}
/>
```

### Drag Handle

```jsx
import { DragHandle } from "flexitablesort";

<BodyRow id="1" index={0}>
  <RowCell index={0}>
    <DragHandle><GripIcon /></DragHandle>
    Content here
  </RowCell>
</BodyRow>
```

### Custom Placeholder

```jsx
<TableContainer
  renderPlaceholder={() => (
    <div style={{
      background: "#6366f122",
      border: "2px dashed #6366f1",
      height: "100%",
    }} />
  )}
/>
```

## Styling

Every component accepts `className` and `style`. No opinionated styles on cells.

<table>
<tr>
<td><strong>Inline</strong></td>
<td><strong>Tailwind</strong></td>
<td><strong>styled-components</strong></td>
</tr>
<tr>
<td>

```jsx
<ColumnCell style={{
  padding: "0 16px",
  fontWeight: 700,
}} />
```

</td>
<td>

```jsx
<ColumnCell className="px-4
  font-bold text-sm" />
```

</td>
<td>

```jsx
const Col = styled(ColumnCell)`
  padding: 0 16px;
  font-weight: 700;
`;
```

</td>
</tr>
</table>

## Browser Support

| | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| **Desktop** | ✅ | ✅ | ✅ | ✅ |
| **Mobile** | ✅ | ✅ | ✅ | ✅ |

Mobile uses long-press to initiate drag.

## Contributing

```bash
git clone https://github.com/samiodeh1337/sortable-table.git
cd sortable-table
npm install
npm run dev    # docs site at localhost:5173
```

## License

[MIT](LICENSE) &copy; [Sami Odeh](https://github.com/samiodeh1337)
