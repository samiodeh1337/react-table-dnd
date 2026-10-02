// Code shown on the docs pages, written against the current API. Complete examples compile as
// written; partial snippets show only the part that changes, say in a comment where they belong,
// and leave the rest as a {/* ... */} placeholder.

export const BASIC_USAGE = `import { useState } from "react";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
  moveRowsById, type DragEndResult,
} from "react-table-dnd";
import "react-table-dnd/styles";

type Person = { id: string; name: string; age: number; email: string };
type Column = { id: keyof Person; label: string; width: number };

const INITIAL_COLUMNS: Column[] = [
  { id: "name", label: "Name", width: 150 },
  { id: "age", label: "Age", width: 100 },
  { id: "email", label: "Email", width: 220 },
];

const INITIAL_ROWS: Person[] = [
  { id: "1", name: "Alice", age: 28, email: "alice@example.com" },
  { id: "2", name: "Bob", age: 34, email: "bob@example.com" },
  { id: "3", name: "Carol", age: 22, email: "carol@example.com" },
];

// columns move one at a time: take one item out and put it back at targetIndex
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function MyTable() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [rows, setRows] = useState(INITIAL_ROWS);

  const handleDragEnd = (r: DragEndResult) => {
    if (r.dragType === "row") {
      setRows((prev) => moveRowsById(prev, r.selectedIds, r.insertIndex));
    } else {
      setColumns((prev) => arrayMove(prev, r.sourceIndex, r.targetIndex));
    }
  };

  return (
    <TableContainer onDragEnd={handleDragEnd} style={{ height: 240 }}>
      <TableHeader>
        {columns.map((col, i) => (
          <ColumnCell key={col.id} id={col.id} index={i} style={{ width: col.width }}>
            {col.label}
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {columns.map((col, ci) => (
              <RowCell key={col.id} index={ci}>
                {row[col.id]}
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}`

export const TYPES_CODE = `type DragEndResult = RowDragEndResult | ColumnDragEndResult;

interface RowDragEndResult {
  dragType: "row";
  id: string;               // the grabbed row
  sourceIndex: number;      // index of the row you grabbed
  targetIndex: number;      // where it lands, for arrayMove(rows, sourceIndex, targetIndex)
  selectedIds: string[];    // every row that moved, in table order; rows scrolled out of view come last
  sourceIndices: number[];  // their indices as rendered
  insertIndex: number;      // the slot in the original array: pass it to moveRowsById
}

interface ColumnDragEndResult {
  dragType: "column";
  id: string;               // the grabbed column
  sourceIndex: number;      // arrayMove(columns, sourceIndex, targetIndex)
  targetIndex: number;
}

// what onDragStart and onDragCancel receive
type DragStartInfo =
  | { dragType: "row"; id: string; sourceIndex: number; selectedIds: string[]; sourceIndices: number[] }
  | { dragType: "column"; id: string; sourceIndex: number };
interface DragCancelInfo { dragType: "row" | "column"; id: string; sourceIndex: number }
// onDragOver receives a DragEndResult: what a drop at that slot would give

interface DragRange {
  start?: number;   // first index that can move
  end?: number;     // last index that can move (inclusive)
}

// <TableContainer options={…}> is typed inline (there is no exported name for it):
//   options?: { rowDragRange?: DragRange; columnDragRange?: DragRange }`

export const MULTI_SELECT_CODE = `import { useState } from "react";
import { TableContainer } from "react-table-dnd";

// inside your component, next to the rows / columns state from Quick start
const [selected, setSelected] = useState<string[]>([]);

// handleDragEnd is unchanged from Quick start: moveRowsById moves one row or the whole selection
<TableContainer
  selectable
  selectedIds={selected}            // controlled; leave it out to let the table keep it
  onSelectionChange={setSelected}   // ids as strings, in table order
  onDragEnd={handleDragEnd}
>
  {/* header and rows as in Quick start */}
</TableContainer>`

export const SELECT_HANDLE_CODE = `import { SelectHandle, moveRowsById, type DragEndResult } from "react-table-dnd";

// The checkbox gets a column of its own at index 0, locked in place with columnDragRange.
// Your data columns render at index i + 1, so subtract 1 when you move them.
const handleDragEnd = (r: DragEndResult) => {
  if (r.dragType === "row") setRows((prev) => moveRowsById(prev, r.selectedIds, r.insertIndex));
  else setColumns((prev) => arrayMove(prev, r.sourceIndex - 1, r.targetIndex - 1));
};

<TableContainer
  selectable
  selectedIds={selected}
  onSelectionChange={setSelected}
  onDragEnd={handleDragEnd}
  options={{ columnDragRange: { start: 1 } }}   // the checkbox column stays first
>
  <TableHeader>
    <ColumnCell id="select" index={0} style={{ width: 40, flex: "0 0 40px" }} />
    {columns.map((col, i) => (
      <ColumnCell key={col.id} id={col.id} index={i + 1} style={{ width: col.width }}>
        {col.label}
      </ColumnCell>
    ))}
  </TableHeader>
  <TableBody>
    {rows.map((row, ri) => (
      <BodyRow key={row.id} id={row.id} index={ri}>
        <RowCell index={0} style={{ flex: "0 0 40px" }}>
          <SelectHandle>
            <input
              type="checkbox"
              readOnly
              checked={selected.includes(String(row.id))}   // ids come back as strings
              style={{ pointerEvents: "none" }}             // the handle owns the click
            />
          </SelectHandle>
        </RowCell>
        {columns.map((col, ci) => (
          <RowCell key={col.id} index={ci + 1}>
            {row[col.id]}
          </RowCell>
        ))}
      </BodyRow>
    ))}
  </TableBody>
</TableContainer>`

export const DRAG_HANDLE_CODE = `import { DragHandle } from "react-table-dnd";

// any icon works; this one needs no library
const GripIcon = () => <span aria-hidden="true">⠿</span>;

// inside rows.map((row, ri) => …): the handle sits in the first cell, next to its content,
// so the column indices stay the same as in Quick start
<BodyRow key={row.id} id={row.id} index={ri}>
  {columns.map((col, ci) => (
    <RowCell key={col.id} index={ci}>
      {ci === 0 && (
        <DragHandle>
          <GripIcon />   {/* only this element starts a drag */}
        </DragHandle>
      )}
      {row[col.id]}
    </RowCell>
  ))}
</BodyRow>`

export const DRAG_RANGE_CODE = `// handleDragEnd as in Quick start
<TableContainer
  onDragEnd={handleDragEnd}
  options={{
    columnDragRange: { start: 1 },         // column 0 stays in place
    rowDragRange: { start: 1, end: 8 },    // only rows 1 to 8 move; end is inclusive
  }}
>
  {/* ... */}
</TableContainer>`

export const VIRTUAL_CODE = `import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

// inside your component; rows, columns and handleDragEnd as in Quick start
const bodyRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => bodyRef.current,   // the table body is the scroller
  estimateSize: () => 40,
  overscan: 5,
});

<TableContainer onDragEnd={handleDragEnd} style={{ height: 420 }}>
  <TableHeader>{/* ... */}</TableHeader>
  <TableBody ref={bodyRef}>
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualizer.getVirtualItems().map((v) => (
        <BodyRow
          key={rows[v.index].id}
          id={rows[v.index].id}
          index={v.index}                    // the index in your full data array
          styles={{                          // positions the row's outer element
            position: "absolute", top: 0, left: 0, width: "100%",
            height: v.size, transform: \`translateY(\${v.start}px)\`,
          }}
        >
          {/* cells */}
        </BodyRow>
      ))}
    </div>
  </TableBody>
</TableContainer>`

export const STYLING_CODE = `/* a selected row */
[data-selected="true"] {
  background: #eef2ff;
}

/* the row or column the drop will land on, while dragging */
[data-drop-target] [data-rtdnd="tr"],
[data-drop-target] [data-rtdnd="th"] {
  outline: 2px solid #6366f1;
  outline-offset: -2px;
}

/* the card that follows the pointer, for one row or several */
[data-rtdnd="clone"] {
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
}

/* the count badge on the drag card when several rows move */
[data-rtdnd="drag-count"] {
  background: #f43f5e;
}`

export const PLACEHOLDER_CODE = `// handleDragEnd as in Quick start
<TableContainer
  onDragEnd={handleDragEnd}
  renderPlaceholder={() => (
    <div
      style={{
        height: "100%",
        border: "2px dashed #6366f1",
        borderRadius: 6,
        background: "#6366f111",
      }}
    />
  )}
>
  {/* ... */}
</TableContainer>`

export const MOVE_ROWS_CODE = `import { moveRowsById, type DragEndResult } from "react-table-dnd";

// inside your component, next to const [rows, setRows] = useState(...)
const handleDragEnd = (r: DragEndResult) => {
  if (r.dragType === "row") {
    setRows((prev) => moveRowsById(prev, r.selectedIds, r.insertIndex));
  }
};`

export const MOVE_BY_INDEX_CODE = `import { arrayMoveMultiple } from "react-table-dnd";

const letters = ["A", "B", "C", "D", "E", "F"];

arrayMoveMultiple(letters, [1, 4], 4);
// → ["A", "C", "D", "B", "E", "F"]   B and E, together, in front of the old slot 4

arrayMoveMultiple(letters, [2], 0);
// → ["C", "A", "B", "D", "E", "F"]   one row works the same way`

export const MOVE_CUSTOM_ID_CODE = `// inside the r.dragType === "row" branch, for rows keyed by something other than \`id\`
setRows((prev) => moveRowsById(prev, r.selectedIds, r.insertIndex, (row) => row.uuid));`

export const MOVE_FILTERED_CODE = `// rows: your full state. visible: what you render, filtered or sorted, indexed 0, 1, 2, …
const handleDragEnd = (r: DragEndResult) => {
  if (r.dragType !== "row") return;
  // insertIndex is a gap in \`visible\`: insert in front of the row after it, or right after the
  // last visible row when the gap is at the end
  const after = visible[r.insertIndex]?.id;
  const last = visible[visible.length - 1].id;
  setRows((prev) => {
    const at = after
      ? prev.findIndex((row) => row.id === after)
      : prev.findIndex((row) => row.id === last) + 1;
    return moveRowsById(prev, r.selectedIds, at);
  });
};`

export const EVENTS_CODE = `<TableContainer
  onDragStart={(info) => console.log("picked up", info.id)}
  onDragOver={(r) => console.log(r.id, "over", r.targetIndex)}
  onDragEnd={handleDragEnd}
  onDragCancel={(info) => console.log(info.id, "cancelled")}
>
  {/* ... */}
</TableContainer>`

// Verified against @tanstack/react-table 9.2 (useTable + tableFeatures). Keep it in sync.
export const TANSTACK_CODE = `import { useState } from "react";
import {
  columnOrderingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  TableContainer, TableHeader, ColumnCell,
  TableBody, BodyRow, RowCell,
  moveRowsById, type DragEndResult,
} from "react-table-dnd";
import "react-table-dnd/styles";

type Person = { id: string; name: string; age: number; email: string };

// TanStack Table owns the columns and their order; react-table-dnd renders them and drags them
const features = tableFeatures({ columnOrderingFeature });
const helper = createColumnHelper<typeof features, Person>();
const columns = helper.columns([
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
  helper.accessor("email", { header: "Email" }),
]);
const WIDTHS: Record<string, number> = { name: 150, age: 100, email: 220 };

const INITIAL_ROWS: Person[] = [
  { id: "1", name: "Alice", age: 28, email: "alice@example.com" },
  { id: "2", name: "Bob", age: 34, email: "bob@example.com" },
  { id: "3", name: "Carol", age: 22, email: "carol@example.com" },
];

export function PeopleTable() {
  const [data, setData] = useState(INITIAL_ROWS);
  const [columnOrder, setColumnOrder] = useState(["name", "age", "email"]);
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id, // the ids react-table-dnd reports in selectedIds
    state: { columnOrder },
    onColumnOrderChange: setColumnOrder,
  });

  const handleDragEnd = (r: DragEndResult) => {
    if (r.dragType === "row") {
      setData((prev) => moveRowsById(prev, r.selectedIds, r.insertIndex));
    } else {
      const order = table.getAllLeafColumns().map((c) => c.id); // the order on screen
      const [moved] = order.splice(r.sourceIndex, 1);
      order.splice(r.targetIndex, 0, moved);
      table.setColumnOrder(order);
    }
  };

  return (
    <TableContainer onDragEnd={handleDragEnd} style={{ height: 240 }}>
      <TableHeader>
        {table.getHeaderGroups()[0].headers.map((header, i) => (
          <ColumnCell
            key={header.id}
            id={header.column.id}
            index={i}
            style={{ width: WIDTHS[header.column.id] }}
          >
            <table.FlexRender header={header} />
          </ColumnCell>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row, ri) => (
          <BodyRow key={row.id} id={row.id} index={ri}>
            {row.getAllCells().map((cell, ci) => (
              <RowCell key={cell.id} index={ci}>
                <table.FlexRender cell={cell} />
              </RowCell>
            ))}
          </BodyRow>
        ))}
      </TableBody>
    </TableContainer>
  );
}`
