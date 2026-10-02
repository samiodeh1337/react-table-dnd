// API reference data: one entry per exported component (plus the helpers).
// Cell text may contain `code` spans; they are rendered with <Md>.

export interface ApiEntry {
  slug: string
  name: string
  intro: string[]
  columns: string[]
  rows: string[][]
}

export const API: ApiEntry[] = [
  {
    slug: 'tablecontainer',
    name: 'TableContainer',
    intro: [
      'Root wrapper that provides the drag-and-drop context. Renders a `<div>` and accepts a ref.',
    ],
    columns: ['Prop', 'Type', 'Default', 'Description'],
    rows: [
      ['`children`', '`ReactNode` (required)', '—', 'A `TableHeader` and a `TableBody`.'],
      [
        '`onDragEnd`',
        '`(result: DragEndResult) => void`',
        '—',
        'Called on a drop. Apply it to your data here.',
      ],
      ['`onDragStart`', '`(info: DragStartInfo) => void`', '—', 'A row or column was picked up.'],
      [
        '`onDragOver`',
        '`(result: DragEndResult) => void`',
        '—',
        'The drop slot changed; `result` is what a drop there would give.',
      ],
      [
        '`onDragCancel`',
        '`(info: DragCancelInfo) => void`',
        '—',
        'The drag ended without a drop: Escape, the window lost focus, or the pointer never moved.',
      ],
      [
        '`renderPlaceholder`',
        '`() => ReactNode`',
        '—',
        'Custom marker for the slot the dragged item will land in.',
      ],
      [
        '`options`',
        '`{ rowDragRange?: DragRange; columnDragRange?: DragRange }`',
        '—',
        'Drag range constraints.',
      ],
      [
        '`selectable`',
        '`boolean`',
        'false',
        'Enable row selection: click, Ctrl/Cmd/Alt+click, Shift+click, tap on touch. Dragging a selected row moves the whole selection.',
      ],
      [
        '`selectedIds`',
        '`ReadonlyArray<string | number>`',
        '—',
        'Controlled selection. Omit to let the table keep it internally.',
      ],
      [
        '`defaultSelectedIds`',
        '`ReadonlyArray<string | number>`',
        '—',
        'Initial selection (uncontrolled).',
      ],
      [
        '`onSelectionChange`',
        '`(ids: string[]) => void`',
        '—',
        'Called with the full selection, in table order, whenever it changes.',
      ],
      [
        '`showDragCount`',
        '`boolean`',
        'true',
        'Show the count badge on the drag card when several rows move together.',
      ],
      ['`className`', '`string`', '—', 'CSS class.'],
      ['`style`', '`CSSProperties`', '—', 'Inline styles.'],
      [
        'other HTML attributes',
        '`role`, `aria-*`, `data-*`, …',
        '—',
        'Passed to the table element (`[data-rtdnd="table"]`). Not `onMouseDown` / `onTouchStart`, which start drags.',
      ],
    ],
  },
  {
    slug: 'tableheader',
    name: 'TableHeader',
    intro: ['Container for column header cells. Accepts a ref.'],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`children`', '`ReactNode` (required)', 'Should contain `ColumnCell` elements.'],
      ['`className`', '`string`', 'CSS class.'],
      ['`style`', '`CSSProperties`', 'Inline styles.'],
      [
        'other HTML attributes',
        '`role`, `aria-*`, `data-*`, …',
        'Passed to the header element (`[data-rtdnd="header"]`); `onScroll` to its inner scroll area.',
      ],
    ],
  },
  {
    slug: 'columncell',
    name: 'ColumnCell',
    intro: ['A draggable column header cell.'],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`id`', '`string | number` (required)', 'Column id.'],
      ['`index`', '`number` (required)', 'Column index in the current order.'],
      ['`children`', '`ReactNode`', 'Content inside the header cell. Can be left out.'],
      [
        '`disabled`',
        '`boolean`',
        'The column cannot be picked up. Other columns can still be dropped around it; to pin columns in place use `options.columnDragRange`.',
      ],
      ['`className`', '`string`', 'CSS class.'],
      [
        '`style`',
        '`CSSProperties`',
        'Inline styles. Put the column width here: `width` (and `flex` for a fixed width).',
      ],
      [
        'other HTML attributes',
        '`aria-*`, `data-*`, `title`, …',
        'Passed to the header cell element.',
      ],
    ],
  },
  {
    slug: 'tablebody',
    name: 'TableBody',
    intro: [
      'Container for body rows, and the scrollable area of the table. Accepts a ref: pass it to your virtualizer as the scroll element.',
    ],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`children`', '`ReactNode` (required)', 'Should contain `BodyRow` elements.'],
      [
        '`className`',
        '`string`',
        'CSS class on the outer body element (`[data-rtdnd="body"]`). Use it for borders and backgrounds.',
      ],
      [
        '`style`',
        '`CSSProperties`',
        'Inline styles on the inner scroll area (`[data-rtdnd="ibody"]`, the element the ref points to). Put `maxHeight` or `overflow` here.',
      ],
      [
        'other HTML attributes',
        '`role`, `aria-*`, `data-*`, …',
        'Passed to the outer body element (`[data-rtdnd="body"]`); `onScroll` to the inner scroll area.',
      ],
    ],
  },
  {
    slug: 'bodyrow',
    name: 'BodyRow',
    intro: ['A draggable table row.'],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`id`', '`string | number` (required)', 'Row id.'],
      ['`index`', '`number` (required)', 'Row index in the current order.'],
      ['`children`', '`ReactNode` (required)', 'Should contain `RowCell` elements.'],
      [
        '`disabled`',
        '`boolean`',
        'The row cannot be picked up or selected, and does not move with a group. Other rows can still be dropped around it; to pin rows in place use `options.rowDragRange`.',
      ],
      ['`className`', '`string`', 'CSS class.'],
      ['`style`', '`CSSProperties`', 'Inline styles.'],
      [
        '`styles`',
        '`CSSProperties`',
        "Inline styles for the row's outer element (it is what the layout positions). Use it to position rows in virtual tables.",
      ],
      [
        '`selectedClassName`',
        '`string`',
        'Extra class while the row is selected. The row also gets `data-selected="true"`.',
      ],
      ['`selectedStyle`', '`CSSProperties`', 'Extra inline styles while the row is selected.'],
      [
        'other HTML attributes',
        '`aria-*`, `data-*`, `onClick`, …',
        'Passed to the row element (`[data-rtdnd="tr"]`).',
      ],
    ],
  },
  {
    slug: 'rowcell',
    name: 'RowCell',
    intro: ['A cell within a body row. Must match the column order of `ColumnCell` elements.'],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`index`', '`number` (required)', 'Column index; matches the `ColumnCell` index.'],
      ['`children`', '`ReactNode`', 'Content to render.'],
      ['`className`', '`string`', 'CSS class.'],
      ['`style`', '`CSSProperties`', 'Inline styles.'],
      ['other HTML attributes', '`aria-*`, `data-*`, `title`, …', 'Passed to the cell element.'],
    ],
  },
  {
    slug: 'draghandle',
    name: 'DragHandle',
    intro: [
      'Wrap any element inside a `ColumnCell` or `BodyRow` with this component to make it the drag trigger. When present, only the handle starts a drag; the rest of the row or column still takes clicks and selection.',
    ],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`children`', '`ReactNode` (required)', 'A grip icon, or any element.'],
      ['`className`', '`string`', 'CSS class.'],
      ['`style`', '`CSSProperties`', 'Inline styles.'],
      ['other HTML attributes', '`role`, `aria-*`, `data-*`, …', 'Passed to the handle element.'],
    ],
  },
  {
    slug: 'selecthandle',
    name: 'SelectHandle',
    intro: [
      "Like `DragHandle`, for selection: wrap a checkbox in it and only presses inside change that row's selection (click toggles, Shift+click adds a range). Requires `selectable`.",
    ],
    columns: ['Prop', 'Type', 'Description'],
    rows: [
      ['`children`', '`ReactNode` (required)', 'A checkbox, or any element.'],
      ['`className`', '`string`', 'CSS class.'],
      ['`style`', '`CSSProperties`', 'Inline styles.'],
      ['other HTML attributes', '`role`, `aria-*`, `data-*`, …', 'Passed to the handle element.'],
    ],
  },
  {
    slug: 'helpers',
    name: 'Helpers',
    intro: [],
    columns: ['Function', 'Signature', 'Description'],
    rows: [
      [
        '`moveRowsById`',
        '`(rows, ids, insertIndex, getId?) => rows`',
        'Moves the rows with these ids, as a block, to `insertIndex` (a slot in the original array). Use it in `onDragEnd` for every row drag; it works for single rows and in virtual tables.',
      ],
      [
        '`arrayMoveMultiple`',
        '`(arr, sourceIndices, insertIndex) => arr`',
        'The same move by index. Never mutates the input.',
      ],
      [
        '`useTable`, `useTableStore`, `useTableDispatch`',
        '`useTable()`, `useTableStore(selector)`, `useTableDispatch()`',
        'Advanced: read or update the internal store from inside `TableContainer`. The state shape is internal and may change in a minor release.',
      ],
    ],
  },
]
