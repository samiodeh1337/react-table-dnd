// Every docs page, in reading order. The sidebar, the search and Previous / Next all come from
// this list, so adding a page here is all it takes.
import type { ComponentType, ReactNode } from 'react'
import { PlayIcon } from 'lucide-react'
import { Button } from '@/docs/components/ui/button'
import { Kbd } from '@/docs/components/ui/kbd'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/docs/components/ui/table'
import CodeBlock from './CodeBlock'
import ApiTable from './ApiTable'
import BasicDemo from './BasicDemo'
import EventsDemo from './EventsDemo'
import MoveExplainer from './MoveExplainer'
import { API } from './api'
import { navigate } from './router'
import { A, C, Callout, H2, H3, Md, P, UL } from './prose'
import {
  BASIC_USAGE,
  DRAG_HANDLE_CODE,
  DRAG_RANGE_CODE,
  MOVE_BY_INDEX_CODE,
  MOVE_CUSTOM_ID_CODE,
  MOVE_ROWS_CODE,
  MULTI_SELECT_CODE,
  MOVE_FILTERED_CODE,
  EVENTS_CODE,
  TANSTACK_CODE,
  PLACEHOLDER_CODE,
  SELECT_HANDLE_CODE,
  STYLING_CODE,
  TYPES_CODE,
  VIRTUAL_CODE,
} from './snippets'

export interface DocPage {
  slug: string
  title: string
  description: string
  group: 'Getting started' | 'Guides' | 'API reference' | 'Resources'
  Component: ComponentType
  /** Extra words the ⌘K search matches: prop names, helpers, topics. */
  keywords?: string
}

const GITHUB = 'https://github.com/samiodeh1337/react-table-dnd'

const INSTALL = [
  { label: 'npm', code: 'npm install react-table-dnd', lang: 'bash' },
  { label: 'pnpm', code: 'pnpm add react-table-dnd', lang: 'bash' },
  { label: 'yarn', code: 'yarn add react-table-dnd', lang: 'bash' },
  { label: 'bun', code: 'bun add react-table-dnd', lang: 'bash' },
]

function DemoLinks({ demos }: { demos: [string, string][] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {demos.map(([id, label]) => (
        <Button
          key={id}
          variant="outline"
          size="sm"
          onClick={() => navigate(`/examples?demo=${id}`)}
        >
          <PlayIcon className="text-brand" /> Open demo: {label}
        </Button>
      ))}
    </div>
  )
}

function Preview({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="my-6">
      <div className="rounded-xl border bg-muted/30 p-4 sm:p-6">{children}</div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {head.map((h) => (
              <TableHead key={h} className="h-10 px-4 text-xs font-medium tracking-wide uppercase">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              {cells.map((c, j) => (
                <TableCell
                  key={j}
                  className={
                    j === 0
                      ? 'w-[40%] px-4 py-3 align-top font-medium whitespace-normal sm:w-auto sm:whitespace-nowrap'
                      : 'px-4 py-3 align-top whitespace-normal text-muted-foreground'
                  }
                >
                  {c}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Getting started ─────────────────────────────────────────────────────────

function Introduction() {
  return (
    <>
      <P>
        Reorder rows and columns by dragging. Works with multi-row selections, virtual lists and
        touch screens.
      </P>
      <Preview caption="Drag a row or a column header.">
        <BasicDemo />
      </Preview>
      <P>
        Dragging works with a pointer or touch; there is no keyboard reordering yet. The table is
        made of divs; every component passes <C>role</C> and <C>aria-*</C> through if you add them.
      </P>
    </>
  )
}

function Installation() {
  return (
    <>
      <H2>Install the package</H2>
      <CodeBlock variants={INSTALL} />
      <H2>Import the stylesheet</H2>
      <P>
        Import it once, for example in your app entry. It is required: it sets the drag cursor,
        stops text selection on long-press, and draws the card for several rows.
      </P>
      <CodeBlock code={`import "react-table-dnd/styles";`} lang="tsx" title="main.tsx" />
      <H2>Requirements</H2>
      <UL>
        <li>
          <C>react</C> and <C>react-dom</C> 18 or newer.
        </li>
        <li>Any bundler. The package ships an ES module, a CommonJS build, and types for both.</li>
        <li>
          Server rendering works: the table renders on the server and becomes draggable after
          hydration. In the Next.js App Router, render it from a component marked{' '}
          <C>'use client'</C>, because it uses hooks.
        </li>
      </UL>
    </>
  )
}

function QuickStart() {
  return (
    <>
      <P>
        A table is a <C>TableContainer</C> holding a <C>TableHeader</C> of <C>ColumnCell</C>s and a{' '}
        <C>TableBody</C> of <C>BodyRow</C>s, each made of <C>RowCell</C>s. Give every row and column
        a stable <C>id</C> and its position as <C>index</C>, then update your state in{' '}
        <C>onDragEnd</C>.
      </P>
      <CodeBlock code={BASIC_USAGE} lang="tsx" title="MyTable.tsx" />
      <Preview caption="The result. The preview adds Tailwind classes; the code above renders unstyled until you add your own (see Styling).">
        <BasicDemo />
      </Preview>
      <H2>What onDragEnd receives</H2>
      <SimpleTable
        head={['Field', 'Meaning']}
        rows={[
          [
            <C>dragType</C>,
            <>
              <C>"row"</C> or <C>"column"</C>. Check it first.
            </>,
          ],
          [<C>sourceIndex</C>, 'Index of the row or column you grabbed.'],
          [
            <C>targetIndex</C>,
            <>
              Where it lands, ready for <C>arrayMove(data, sourceIndex, targetIndex)</C> (the small
              helper in the snippet above; it is not part of the library).
            </>,
          ],
          [
            <C>selectedIds</C>,
            'Rows only: the ids of every row that moved (one id for a plain drag).',
          ],
          [
            <C>insertIndex</C>,
            <>
              Rows only: the slot in your original array. Pass it to <C>moveRowsById</C> (see{' '}
              <A href="#/docs/updating-data">Updating your data</A>).
            </>,
          ],
        ]}
      />
      <H2>Column widths</H2>
      <P>
        Give each <C>ColumnCell</C> a width with <C>style={'{{ width: 150 }}'}</C>: a number, or a
        pixel string like <C>"150px"</C> (other units are read as pixels; the default is 50). The{' '}
        <C>RowCell</C>s in that column follow it automatically, and columns stretch to fill the
        table in proportion to their widths. To keep a column at exactly its width, pass{' '}
        <C>flex: "0 0 150px"</C> in the style of the <C>ColumnCell</C> and of every <C>RowCell</C>{' '}
        in that column.
      </P>
    </>
  )
}

function UpdatingData() {
  return (
    <>
      <P>
        When a row drag ends, the table tells you which rows moved and where they were dropped. You
        apply that to your state with one call:
      </P>
      <CodeBlock code={MOVE_ROWS_CODE} lang="tsx" />
      <SimpleTable
        head={['Field', 'Meaning']}
        rows={[
          [
            <C>selectedIds</C>,
            'The rows that moved, in table order. One id for a plain drag. In a virtual table, selected rows scrolled out of view come last.',
          ],
          [
            <C>insertIndex</C>,
            <>
              The slot they go to, counted in your array <em>before</em> the move. Slot 0 is before
              the first row; with 6 rows the slots are 0 to 6.
            </>,
          ],
        ]}
      />
      <H2>What moveRowsById does</H2>
      <P>
        It finds the rows with those ids, lifts them out, and puts them back as one block at the
        slot. The order of the moved rows among themselves never changes. Because the slot is
        counted in the array before the move, the helper has to adjust it for the rows it lifted out
        first.
      </P>
      <MoveExplainer />
      <H2>By index: arrayMoveMultiple</H2>
      <P>
        <C>moveRowsById</C> only turns ids into indices and then calls <C>arrayMoveMultiple</C>. You
        can call it directly with indices when that is what you have:
      </P>
      <CodeBlock code={MOVE_BY_INDEX_CODE} lang="ts" />
      <P>
        Neither helper changes your array. They return a new array, or the same array when nothing
        matched, so React skips the re-render in that case.
      </P>
      <H2>Filtered or sorted views</H2>
      <P>
        <C>insertIndex</C> counts the rows you render. If you render a filtered or sorted copy of
        your state, find the row the drop lands in front of and insert before it in your state:
      </P>
      <CodeBlock code={MOVE_FILTERED_CODE} lang="tsx" />
      <P>
        If your rows are keyed by something other than <C>id</C>, pass a function that reads it:
      </P>
      <CodeBlock code={MOVE_CUSTOM_ID_CODE} lang="tsx" />
      <H2>Columns</H2>
      <P>
        Columns move one at a time, so they use a single move:{' '}
        <C>arrayMove(columns, r.sourceIndex, r.targetIndex)</C>, as in{' '}
        <A href="#/docs/quick-start">Quick start</A>.
      </P>
    </>
  )
}

// ── Guides ─────────────────────────────────────────────────────────────────

function MultiSelect() {
  return (
    <>
      <P>
        Turn on <C>selectable</C> to select rows with click, <Kbd>⌘</Kbd>/<Kbd>Ctrl</Kbd>-click and{' '}
        <Kbd>Shift</Kbd>-click. Dragging a selected row moves the whole selection.
      </P>
      <Preview caption="Click, ⌘/Ctrl-click or Shift-click rows, then drag a selected one.">
        <BasicDemo selectable />
      </Preview>
      <CodeBlock code={MULTI_SELECT_CODE} lang="tsx" />
      <H2>Gestures</H2>
      <SimpleTable
        head={['You do', 'What happens']}
        rows={[
          ['Click a row', 'Selects only that row. Clicking the only selected row again clears it.'],
          [
            <>
              <Kbd>Ctrl</Kbd> / <Kbd>⌘</Kbd> / <Kbd>Alt</Kbd> + click
            </>,
            'Adds or removes that row.',
          ],
          [
            <>
              <Kbd>Shift</Kbd> + click
            </>,
            'Selects the range from the last clicked row.',
          ],
          [
            <>
              <Kbd>Ctrl</Kbd> / <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + click
            </>,
            'Adds that range to the current selection.',
          ],
          ['Drag a selected row', 'Moves every selected row together.'],
          ['Drag an unselected row', 'Selects it and moves it alone.'],
          [
            <>
              Click empty space in the table body, or <Kbd>Esc</Kbd>
            </>,
            'Clears the selection (Escape only after you interacted with the table).',
          ],
          ['Tap (touch)', 'Toggles the row.'],
        ]}
      />
      <H2>Styling selected rows</H2>
      <P>
        Selected rows get <C>data-selected="true"</C>. Style that in CSS, or pass{' '}
        <C>selectedClassName</C> / <C>selectedStyle</C> to <C>BodyRow</C>. Hide the count badge with{' '}
        <C>showDragCount={'{false}'}</C>.
      </P>
      <H2>Clicks that never select</H2>
      <P>
        Presses on buttons, links, inputs, selects, textareas and editable areas inside a row never
        change the selection. To exclude anything else, add the <C>data-no-select</C> attribute to
        it.
      </P>
      <P>With selection on, a drag starts after the pointer moves 5px.</P>
      <DemoLinks
        demos={[
          ['multiselect', 'Multi-Select'],
          ['virtualselect', 'Virtual + Multi-Select'],
        ]}
      />
    </>
  )
}

function CheckboxSelection() {
  return (
    <>
      <P>
        For a checkbox column, wrap the checkbox in <C>SelectHandle</C>. In rows that have one, only
        presses inside the handle change the selection: a click toggles the row and <Kbd>Shift</Kbd>{' '}
        + click adds a range. Pressing anywhere else in the row leaves the selection alone, and
        dragging a selected row still moves every selected row.
      </P>
      <P>
        It needs <C>selectable</C>, and <C>selectedIds</C> with <C>onSelectionChange</C> so each
        checkbox can show its state. The checkbox column is column 0, locked with{' '}
        <C>columnDragRange</C>, so your data columns start at index 1:
      </P>
      <CodeBlock code={SELECT_HANDLE_CODE} lang="tsx" />
      <P>In these tables, clicking empty space does not clear the selection.</P>
      <DemoLinks
        demos={[
          ['styled', 'Showcase'],
          ['flex', 'Custom Heights'],
        ]}
      />
    </>
  )
}

function DragHandles() {
  return (
    <>
      <P>
        By default the whole row or header cell starts a drag. Put a <C>DragHandle</C> inside it and
        only the handle does. The rest of the row stays free for selecting text, buttons and inputs,
        and on touch screens the rest of the row scrolls normally.
      </P>
      <CodeBlock code={DRAG_HANDLE_CODE} lang="tsx" />
      <DemoLinks demos={[['handle', 'Drag Handle']]} />
    </>
  )
}

function DragRanges() {
  return (
    <>
      <P>
        Lock rows or columns in place with <C>options</C>. Items outside the range cannot be
        dragged, cannot be dropped onto, and cannot be selected. Both ranges are optional, and{' '}
        <C>end</C> is inclusive.
      </P>
      <CodeBlock code={DRAG_RANGE_CODE} lang="tsx" />
      <P>
        To stop a single row or column from being picked up, pass <C>disabled</C>. Other rows can
        still be dropped around it. A disabled row also cannot be selected, and does not move with a
        group.
      </P>
      <CodeBlock
        code={`<BodyRow key={row.id} id={row.id} index={ri} disabled={row.archived}>`}
        lang="tsx"
      />
      <P>
        A locked row you put in <C>selectedIds</C> yourself stays highlighted but does not move with
        the group. In a virtual table this only covers locked rows that are on screen, so filter
        them out of <C>selectedIds</C> there.
      </P>
      <DemoLinks demos={[['options', 'Drag Ranges']]} />
    </>
  )
}

function VirtualTables() {
  return (
    <>
      <P>
        The table works with <C>@tanstack/react-virtual</C> for 100,000+ rows. Pass a ref to{' '}
        <C>TableBody</C> as the scroll element, give each row its index in your full data array, and
        position the row with the <C>styles</C> prop, which styles the row's outer element.
      </P>
      <CodeBlock code={VIRTUAL_CODE} lang="tsx" />
      <P>
        <C>TableContainer</C> needs a height for the body to scroll, and <C>estimateSize</C> should
        match your row height.
      </P>
      <Callout kind="warning" title="Move rows by id">
        Only rows on screen exist in the page, so a selection can include rows the table cannot see.
        Always move rows with <C>moveRowsById(rows, r.selectedIds, r.insertIndex)</C>;{' '}
        <C>sourceIndices</C> only lists the rows that were mounted. Shift + click ranges and the
        fold animation also cover mounted rows only.
      </Callout>
      <DemoLinks
        demos={[
          ['virtual', 'Virtual (rows)'],
          ['virtualselect', 'Virtual + Multi-Select'],
          ['virtual2d', 'Virtual (rows + cols)'],
        ]}
      />
    </>
  )
}

function TanStackTable() {
  return (
    <>
      <P>
        Render a <A href="https://tanstack.com/table">TanStack Table</A> with these components to
        make its rows and columns draggable. TanStack keeps the column order; <C>onDragEnd</C>{' '}
        updates it. Written for TanStack Table 9.
      </P>
      <CodeBlock code={TANSTACK_CODE} lang="tsx" title="PeopleTable.tsx" />
      <P>
        With a filter, handle the drop as in{' '}
        <A href="#/docs/updating-data?s=filtered-or-sorted-views">Filtered or sorted views</A>. With
        a sort, a dropped row goes straight back to its sorted place, so turn sorting off while
        users reorder.
      </P>
      <DemoLinks demos={[['tanstack', 'TanStack Table with a filter']]} />
    </>
  )
}

function DragEvents() {
  return (
    <>
      <P>
        Besides <C>onDragEnd</C>, <C>TableContainer</C> takes <C>onDragStart</C>, <C>onDragOver</C>{' '}
        and <C>onDragCancel</C>.
      </P>
      <Preview caption="Every callback is logged below. ⌘/Ctrl-click rows to drag several at once.">
        <EventsDemo />
      </Preview>
      <CodeBlock code={EVENTS_CODE} lang="tsx" />
      <SimpleTable
        head={['Callback', 'When it runs', 'What it receives']}
        rows={[
          [
            <C>onDragStart</C>,
            'A row or column is picked up.',
            <>
              <C>dragType</C>, <C>id</C>, <C>sourceIndex</C>; for rows also <C>selectedIds</C> and{' '}
              <C>sourceIndices</C>
            </>,
          ],
          [
            <C>onDragOver</C>,
            'The drop slot changes (once per new slot, not per mouse move).',
            'What a drop there would give: the same object onDragEnd receives',
          ],
          [<C>onDragEnd</C>, 'The item is dropped.', <C>DragEndResult</C>],
          [
            <C>onDragCancel</C>,
            'The drag ends without a drop: Escape, the window losing focus, or a release without moving.',
            <>
              <C>dragType</C>, <C>id</C>, <C>sourceIndex</C>
            </>,
          ],
        ]}
      />
      <P>
        Every drag calls <C>onDragStart</C>, then either <C>onDragEnd</C> or <C>onDragCancel</C>.
      </P>
    </>
  )
}

function Styling() {
  return (
    <>
      <P>
        Every component takes <C>className</C> and <C>style</C>, and the library adds no visual
        styles to your cells. Tailwind, CSS modules and styled-components all work.
      </P>
      <H2>Styling hooks</H2>
      <P>These selectors and variables let you style drag and selection states:</P>
      <SimpleTable
        head={['Selector / variable', 'Targets']}
        rows={[
          [<C>[data-selected="true"]</C>, 'a selected row'],
          [
            <C>[data-drop-target]</C>,
            <>
              the row or column the drop will land on, while dragging (style the{' '}
              <C>[data-rtdnd="tr"]</C> or <C>[data-rtdnd="th"]</C> inside it, as below)
            </>,
          ],
          [
            <C>[data-rtdnd="drag-count"]</C>,
            'the count badge on the drag card when several rows move',
          ],
          [
            <C>[data-rtdnd="drag-stack"]</C>,
            'the two ghost cards under the drag card when several rows move',
          ],
          [
            <C>[data-rtdnd="clone"]</C>,
            <>
              the drag card itself; it carries <C>[data-group-size]</C> while several rows move
            </>,
          ],
          [
            <C>--rtdnd-card-bg</C>,
            <>
              the multi-row card&apos;s colour, taken from the first solid background among the
              first cell, the row and the body. To force one:{' '}
              <C>{'[data-group-size] { --rtdnd-card-bg: #1e293b !important; }'}</C>
            </>,
          ],
        ]}
      />
      <CodeBlock code={STYLING_CODE} lang="css" title="styles.css" />
      <DemoLinks
        demos={[
          ['tw', 'Tailwind CSS'],
          ['sc', 'styled-components'],
          ['styling', 'className & style'],
        ]}
      />
    </>
  )
}

function CustomPlaceholder() {
  return (
    <>
      <P>
        The placeholder marks the slot the dragged item will land in. By default it is invisible:
        the other rows sliding apart already show the gap. Render your own with{' '}
        <C>renderPlaceholder</C>; it is sized to the dragged row or column.
      </P>
      <CodeBlock code={PLACEHOLDER_CODE} lang="tsx" />
    </>
  )
}

function TouchDevices() {
  return (
    <>
      <P>
        On phones and tablets a drag starts with a long-press of 300ms, so ordinary swipes still
        scroll the table, with momentum. A quick tap toggles the row when selection is on.
      </P>
      <UL>
        <li>Rows locked by a drag range scroll normally.</li>
        <li>
          In rows with a <C>DragHandle</C>, only the handle blocks the browser's scrolling.
        </li>
        <li>A long-press in a text field or select is left to the browser.</li>
        <li>
          A long-press on an unselected row selects it first, so it drags alone. One that cannot
          drag (off the grip of a <C>DragHandle</C> row) toggles like a tap.
        </li>
      </UL>
    </>
  )
}

// ── API reference ───────────────────────────────────────────────────────────

function apiPage(slug: string): ComponentType {
  const entry = API.find((a) => a.slug === slug)!
  return function ApiPage() {
    return (
      <>
        {/* the first intro sentence is the page description, shown under the title */}
        {entry.intro.slice(1).map((t) => (
          <P key={t}>
            <Md text={t} />
          </P>
        ))}
        <H2>{entry.slug === 'helpers' ? 'Functions' : 'Props'}</H2>
        <ApiTable columns={entry.columns} rows={entry.rows} />
      </>
    )
  }
}

function Types() {
  return (
    <>
      <P>
        Every type is exported from <C>react-table-dnd</C>. The one you will use most is{' '}
        <C>DragEndResult</C>: check <C>dragType</C> and TypeScript knows which fields are set.
      </P>
      <CodeBlock code={TYPES_CODE} lang="ts" title="types.ts" />
      <H3>Exported types</H3>
      <P>
        <C>DragEndResult</C>, <C>RowDragEndResult</C>, <C>ColumnDragEndResult</C>,{' '}
        <C>DragStartInfo</C>, <C>DragCancelInfo</C>, <C>DragRange</C>, <C>DragType</C>,{' '}
        <C>SelectionState</C>, and the props of every component: <C>TableContainerProps</C>,{' '}
        <C>TableHeaderProps</C>, <C>ColumnCellProps</C>, <C>TableBodyProps</C>, <C>BodyRowProps</C>,{' '}
        <C>RowCellProps</C>, <C>DragHandleProps</C> and <C>SelectHandleProps</C>. The <C>options</C>{' '}
        prop is typed inline as shown above, so there is no separate options type to import.
      </P>
    </>
  )
}

// ── Resources ───────────────────────────────────────────────────────────────

function Upgrading() {
  return (
    <>
      <P>v2 code runs unchanged. Check these points if you use TypeScript or test drop results.</P>
      <H2>TypeScript and tests</H2>
      <UL>
        <li>
          <C>DragEndResult</C> is a union on <C>dragType</C>. After <C>if (r.dragType === "row")</C>
          , the new row fields are typed as present. Code that builds a row result by hand, for
          example in a test, must include <C>selectedIds</C>, <C>sourceIndices</C> and{' '}
          <C>insertIndex</C>.
        </li>
        <li>
          Row results carry those three fields on every row drag, even without selection. A test
          that compares the whole result object will see them.
        </li>
        <li>
          <C>id</C> and <C>index</C> are typed as required on <C>BodyRow</C> and <C>ColumnCell</C>.
          They always were at runtime.
        </li>
        <li>
          The types are stricter to resolve. They now work without <C>esModuleInterop</C> and under{' '}
          <C>node16</C> / <C>nodenext</C>. Before, component props could silently become <C>any</C>,
          so you may see type errors that were always there.
        </li>
        <li>
          <C>BodyRow</C>, <C>ColumnCell</C> and <C>RowCell</C> no longer accept any prop. In v2
          their types allowed every name, and unknown props were dropped silently. Now real HTML
          attributes such as <C>aria-label</C>, <C>data-testid</C> or <C>onClick</C> are typed and
          reach the element; a misspelled prop is a type error.
        </li>
        <li>
          <C>DraggableProps</C> is no longer exported. It described an internal component. Use{' '}
          <C>BodyRowProps</C> or <C>ColumnCellProps</C>.
        </li>
        <li>
          <C>DragRange.end</C> is inclusive. The v2 README called it exclusive, but it always
          included <C>end</C>. Check any range you set by that README.
        </li>
      </UL>
      <H2>Small behaviour changes</H2>
      <UL>
        <li>Escape during a drag cancels it and is no longer passed on to your own handlers.</li>
        <li>Presses in text fields, selects and editable areas no longer start a drag.</li>
        <li>
          A press on a button, link or other control in a row waits for a 5px move before it starts
          a drag, so a click reaches the control.
        </li>
        <li>
          <C>disabled</C> on a <C>BodyRow</C> or <C>ColumnCell</C> now works: that item cannot be
          picked up. In v2 it was typed but ignored.
        </li>
        <li>
          The drag card is marked <C>[data-rtdnd="clone"]</C> instead of <C>id="portalroot"</C>, so
          two tables on one page no longer share an id. Update any CSS that targets{' '}
          <C>#portalroot</C>.
        </li>
        <li>
          Drops follow the placeholder more precisely, so <C>targetIndex</C> can differ slightly
          from v2 for the same pointer position. Its meaning is unchanged.
        </li>
      </UL>
      <H2>Packaging</H2>
      <P>
        The CommonJS file is now <C>dist/index.cjs</C>. This only matters if you imported that file
        path directly; <C>require("react-table-dnd")</C> works as before. The stylesheet import,{' '}
        <C>react-table-dnd/styles</C>, is unchanged.
      </P>
      <P>
        Every change is listed in the <A href={`${GITHUB}/blob/main/CHANGELOG.md`}>changelog</A>.
        The v2 documentation and examples are archived in{' '}
        <A href={`${GITHUB}/blob/main/docs/v2/README.md`}>docs/v2</A>.
      </P>
    </>
  )
}

export const PAGES: DocPage[] = [
  {
    slug: 'introduction',
    keywords: 'features why overview',
    title: 'Introduction',
    description: 'Drag-and-drop rows and columns for React tables.',
    group: 'Getting started',
    Component: Introduction,
  },
  {
    slug: 'installation',
    keywords: 'npm pnpm yarn bun install stylesheet styles import requirements react 18 19',
    title: 'Installation',
    description: 'Add the package and its stylesheet to your project.',
    group: 'Getting started',
    Component: Installation,
  },
  {
    slug: 'quick-start',
    keywords: 'basic example onDragEnd DragEndResult arrayMove columns rows first table',
    title: 'Quick start',
    description: 'A minimal table.',
    group: 'Getting started',
    Component: QuickStart,
  },
  {
    slug: 'updating-data',
    keywords:
      'moveRowsById arrayMoveMultiple insertIndex selectedIds getId state setRows reorder array',
    title: 'Updating your data',
    description: 'Apply a drop to your state with moveRowsById, and what it does.',
    group: 'Getting started',
    Component: UpdatingData,
  },
  {
    slug: 'multi-select',
    keywords:
      'selectable selectedIds defaultSelectedIds onSelectionChange ctrl cmd shift alt click range group drag escape keyboard gestures showDragCount badge',
    title: 'Multi-select',
    description: 'Select rows and drag them as one group.',
    group: 'Guides',
    Component: MultiSelect,
  },
  {
    slug: 'checkbox-selection',
    keywords: 'SelectHandle checkbox select all tick',
    title: 'Checkbox selection',
    description: 'A checkbox column that owns the selection.',
    group: 'Guides',
    Component: CheckboxSelection,
  },
  {
    slug: 'drag-handles',
    keywords: 'DragHandle grip handle buttons inputs text selection',
    title: 'Drag handles',
    description: 'Start drags only from a grip.',
    group: 'Guides',
    Component: DragHandles,
  },
  {
    slug: 'drag-ranges',
    keywords: 'rowDragRange columnDragRange DragRange start end lock pin fixed disabled options',
    title: 'Drag ranges',
    description: 'Lock rows or columns in place.',
    group: 'Guides',
    Component: DragRanges,
  },
  {
    slug: 'virtual-tables',
    keywords: 'virtualizer tanstack react-virtual 100000 styles scroll performance',
    title: 'Virtual tables',
    description: 'Drag and select across 100,000+ rows.',
    group: 'Guides',
    Component: VirtualTables,
  },
  {
    slug: 'tanstack-table',
    keywords:
      'tanstack react-table headless useTable useReactTable columnOrder setColumnOrder getRowId flexRender integration',
    title: 'TanStack Table',
    description: 'Use TanStack Table for the data and this library for the drag.',
    group: 'Guides',
    Component: TanStackTable,
  },
  {
    slug: 'styling',
    keywords:
      'className style data-selected data-drop-target drag-count drag-stack clone rtdnd-card-bg css tailwind selectedClassName selectedStyle theme dark',
    title: 'Styling',
    description: 'className, style, and the hooks for drag and selection states.',
    group: 'Guides',
    Component: Styling,
  },
  {
    slug: 'custom-placeholder',
    keywords: 'renderPlaceholder drop slot marker',
    title: 'Custom placeholder',
    description: 'Replace the marker for the drop slot.',
    group: 'Guides',
    Component: CustomPlaceholder,
  },
  {
    slug: 'touch',
    keywords: 'mobile long-press tap swipe phone tablet touch-action',
    title: 'Touch devices',
    description: 'Long-press to drag, swipe to scroll.',
    group: 'Guides',
    Component: TouchDevices,
  },
  {
    slug: 'drag-events',
    keywords:
      'onDragStart onDragOver onDragEnd onDragCancel callbacks lifecycle events analytics polling',
    title: 'Drag events',
    description: 'onDragStart, onDragOver and onDragCancel.',
    group: 'Guides',
    Component: DragEvents,
  },
  ...API.map(
    (a): DocPage => ({
      slug: a.slug,
      title: a.name,
      description:
        a.slug === 'helpers'
          ? 'Functions for applying a drop to your data, and hooks for advanced integrations.'
          : a.intro.join(' ').replace(/`/g, ''),
      group: 'API reference',
      Component: apiPage(a.slug),
      // every prop / helper name in the table, e.g. "renderPlaceholder showDragCount"
      keywords: a.rows.map((r) => r[0].replace(/[`,]/g, ' ')).join(' '),
    }),
  ),
  {
    slug: 'types',
    keywords:
      'TypeScript DragEndResult RowDragEndResult ColumnDragEndResult DragRange DragType SelectionState props types',
    title: 'Types',
    description: 'The TypeScript types the package exports.',
    group: 'API reference',
    Component: Types,
  },
  {
    slug: 'upgrading',
    keywords: 'migration v2 breaking changes changelog cjs portalroot DraggableProps',
    title: 'Upgrading to v3',
    description: 'What to check when you move from version 2.',
    group: 'Resources',
    Component: Upgrading,
  },
]

export const GROUPS = ['Getting started', 'Guides', 'API reference', 'Resources'] as const
