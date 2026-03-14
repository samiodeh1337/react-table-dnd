# flexitablesort

[![npm version](https://img.shields.io/npm/v/flexitablesort)](https://www.npmjs.com/package/flexitablesort)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/flexitablesort)](https://bundlephobia.com/package/flexitablesort)
[![license](https://img.shields.io/npm/l/flexitablesort)](https://github.com/samiodeh1337/sortable-table/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/flexitablesort)](https://www.npmjs.com/package/flexitablesort)

Drag-and-drop row and column reordering for React tables. Smooth animations, auto-scroll, virtual scrolling support, and zero external UI dependencies.

**[Live Demos & Full Documentation](https://samiodeh1337.github.io/sortable-table/)**

## Install

```bash
npm install flexitablesort
```

Peer dependencies: `react` and `react-dom` >= 17.0.0

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
