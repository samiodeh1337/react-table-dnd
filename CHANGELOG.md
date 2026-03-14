# Changelog

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
