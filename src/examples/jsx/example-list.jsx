/**
 * Example: Sortable lists — one column, each row a card with a gap. The gap lives inside the
 * row (padding on the cell), so the engine measures it: the placeholder matches the card and the
 * other cards slide by the full pitch. The right-hand list has cards of different heights.
 * Click to select cards, then drag one to move them all.
 */
import React, { useState } from 'react'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  moveRowsById,
} from 'react-table-dnd'

const TASKS = [
  { id: 't1', title: 'Set up the repository', tag: 'infra', tagColor: '#a78bfa' },
  { id: 't2', title: 'Design the data model', tag: 'design', tagColor: '#f472b6' },
  { id: 't3', title: 'Write the API client', tag: 'backend', tagColor: '#34d399' },
  { id: 't4', title: 'Build the list view', tag: 'frontend', tagColor: '#60a5fa' },
  { id: 't5', title: 'Add drag-and-drop ordering', tag: 'frontend', tagColor: '#60a5fa' },
  { id: 't6', title: 'Hook up authentication', tag: 'backend', tagColor: '#34d399' },
  { id: 't7', title: 'Write the onboarding flow', tag: 'design', tagColor: '#f472b6' },
  { id: 't8', title: 'Set up error tracking', tag: 'infra', tagColor: '#a78bfa' },
  { id: 't9', title: 'Load-test the search endpoint', tag: 'backend', tagColor: '#34d399' },
  { id: 't10', title: 'Ship the beta', tag: 'release', tagColor: '#fbbf24' },
]

const NOTES = {
  t1: 'Monorepo with pnpm workspaces. CI on every PR.',
  t2:
    'Users, workspaces, tasks and comments. Soft deletes everywhere, and an audit log table ' +
    'that records who changed what.',
  t4: 'Virtualized, keyboard navigable.',
  t5:
    'Rows and columns. Multi-select with Shift and Cmd, group drag, touch support. Persist the ' +
    'order per user.',
  t7: 'Three steps, skippable.',
  t9: 'Target p95 under 200ms at 500 rps. Compare Postgres full-text with Meilisearch.',
}

const GAP = 8 // between cards; half above and half below each one, inside the row

const card = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #2a2440',
  background: '#15121f',
  color: '#e4e4e7',
  fontSize: 14,
  boxSizing: 'border-box',
}

const cardSelected = {
  ...card,
  background: '#241a4a',
  border: '1px solid #7c6cf0',
}

const grip = {
  color: '#6b6880',
  fontSize: 16,
  letterSpacing: -2,
  lineHeight: '20px',
}

const notesStyle = {
  margin: '6px 0 0',
  fontSize: 12,
  lineHeight: 1.5,
  color: '#9d9aae',
}

const tag = (color) => ({
  marginLeft: 'auto',
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  color,
  border: `1px solid ${color}55`,
  background: `${color}1a`,
})

function SortableList({ title, initial, withNotes, height }) {
  const [tasks, setTasks] = useState(initial)
  const [selected, setSelected] = useState([])
  const handleDragEnd = (r) => {
    if (r.dragType === 'row') setTasks((p) => moveRowsById(p, r.selectedIds, r.insertIndex))
  }
  return (
    <div style={{ flex: '1 1 320px', minWidth: 0 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#c4b5fd' }}>{title}</p>
      <TableContainer
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onDragEnd={handleDragEnd}
        renderPlaceholder={() => (
          <div
            style={{
              height: `calc(100% - ${GAP}px)`,
              margin: `${GAP / 2}px 0`,
              borderRadius: 10,
              border: '2px dashed #7c6cf0',
              background: '#7c6cf01a',
              boxSizing: 'border-box',
            }}
          />
        )}
        style={{ height }}
      >
        {/* a list has one column; its header is the title bar */}
        <TableHeader>
          <ColumnCell
            id="task"
            index={0}
            disabled
            style={{
              width: 480,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `0 6px ${GAP}px`,
              fontSize: 12,
              color: '#8b8b94',
              boxSizing: 'border-box',
            }}
          >
            <span>{tasks.length} tasks</span>
            <span>{selected.length ? `${selected.length} selected` : 'drag to reorder'}</span>
          </ColumnCell>
        </TableHeader>
        <TableBody>
          {tasks.map((task, i) => {
            const isSelected = selected.includes(task.id)
            const notes = withNotes ? NOTES[task.id] : undefined
            return (
              <BodyRow key={task.id} id={task.id} index={i}>
                <RowCell index={0} style={{ padding: `${GAP / 2}px 0` }}>
                  <div style={isSelected ? cardSelected : card}>
                    <span style={grip} aria-hidden="true">
                      ⋮⋮
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ lineHeight: '20px' }}>{task.title}</div>
                      {notes && <p style={notesStyle}>{notes}</p>}
                    </div>
                    <span style={tag(task.tagColor)}>{task.tag}</span>
                  </div>
                </RowCell>
              </BodyRow>
            )
          })}
        </TableBody>
      </TableContainer>
    </div>
  )
}

const SortableListExample = () => (
  <div className="sortable-lists" style={{ width: '100%' }}>
    {/* The group drag card copies the colour of the first cell, the row or the body. Here the
        colour is on the card inside the cell, so set it on the drag card directly. The card is
        rendered next to the table, not inside it, so scope the rule by a wrapper element. */}
    <style>{`.sortable-lists [data-group-size] { --rtdnd-card-bg: #15121f !important; }`}</style>
    <h3 style={{ margin: '0 0 4px', color: '#e4e4e7', fontSize: 14 }}>Sortable lists</h3>
    <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8b8b94' }}>
      Drag a card to reorder. Click cards to select them, then drag one to move them together. Cards
      on the right have different heights.
    </p>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <SortableList title="Same height" initial={TASKS} withNotes={false} height={612} />
      <SortableList title="Mixed heights" initial={TASKS} withNotes height={790} />
    </div>
  </div>
)

export default SortableListExample
