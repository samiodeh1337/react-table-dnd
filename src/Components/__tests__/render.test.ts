// Server render of the public components (no DOM needed): the markup contract consumers style and
// test against. Written with createElement so the file stays a plain .ts test.
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  TableContainer,
  TableHeader,
  ColumnCell,
  TableBody,
  BodyRow,
  RowCell,
  DragHandle,
  SelectHandle,
} from '../index'

const table = (rowProps: Record<string, unknown> = {}, colProps: Record<string, unknown> = {}) =>
  renderToString(
    h(
      TableContainer,
      null,
      h(TableHeader, null, h(ColumnCell, { id: 'name', index: 0, ...colProps }, 'Name')),
      h(
        TableBody,
        null,
        h(
          BodyRow,
          { id: 'r1', index: 0, ...rowProps },
          h(RowCell, { index: 0, title: 'cell title' }, 'Alice'),
        ),
      ),
    ),
  )

describe('component markup', () => {
  it('passes HTML attributes to the row, header cell and cell elements', () => {
    const html = table({ 'aria-label': 'row label', 'data-testid': 'row' }, { title: 'col title' })
    expect(html).toMatch(
      /data-rtdnd="tr"[^>]*aria-label="row label"|aria-label="row label"[^>]*data-rtdnd="tr"/,
    )
    expect(html).toContain('data-testid="row"')
    expect(html).toContain('title="col title"')
    expect(html).toContain('title="cell title"')
  })

  it('passes HTML attributes to the table, header, body and handles too', () => {
    const html = renderToString(
      h(
        TableContainer,
        { role: 'table', 'aria-label': 'People' } as never,
        h(TableHeader, { role: 'rowgroup' } as never, h(ColumnCell, { id: 'n', index: 0 }, 'Name')),
        h(
          TableBody,
          { 'aria-label': 'Rows' } as never,
          h(
            BodyRow,
            { id: 'r1', index: 0 },
            h(
              RowCell,
              { index: 0 },
              h(DragHandle, { 'aria-label': 'Move row' } as never, '⠿'),
              h(SelectHandle, { title: 'Select row' } as never, 'x'),
            ),
          ),
        ),
      ),
    )
    expect(html).toMatch(
      /role="table"[^>]*aria-label="People"[^>]*|aria-label="People"[^>]*role="table"/,
    )
    expect(html).toMatch(/<div[^>]*data-rtdnd="table"[^>]*>/)
    expect(html).toMatch(
      /<div[^>]*role="table"[^>]*data-rtdnd="table"|<div[^>]*data-rtdnd="table"[^>]*role="table"/,
    )
    expect(html).toMatch(/<div[^>]*role="rowgroup"[^>]*data-rtdnd="header"/)
    expect(html).toMatch(/<div[^>]*aria-label="Rows"[^>]*data-rtdnd="body"/)
    expect(html).toMatch(/<div[^>]*aria-label="Move row"[^>]*data-drag-handle="true"/)
    expect(html).toMatch(/<div[^>]*title="Select row"[^>]*data-select-handle="true"/)
  })

  it('keeps the attributes the library owns', () => {
    const html = renderToString(
      h(
        TableContainer,
        null,
        h(
          TableBody,
          null,
          h(
            BodyRow,
            { id: 'r1', index: 0 },
            // a consumer data-rtdnd must not replace the library's marker
            h(RowCell, { index: 3, 'data-rtdnd': 'mine' } as never, 'x'),
          ),
        ),
      ),
    )
    expect(html).toContain('data-rtdnd="td"')
    expect(html).toContain('data-col-index="3"')
  })

  it('disabled marks a row or column so it cannot be picked up', () => {
    expect(table()).not.toContain('data-disabled="true"')
    expect(table({ disabled: true })).toMatch(/data-id="r1"[^>]*data-disabled="true"/)
    expect(table({}, { disabled: true })).toMatch(/data-id="name"[^>]*data-disabled="true"/)
  })

  it('renders one clone per table, without a page-wide id', () => {
    const html = table()
    expect(html).not.toContain('portalroot')
    expect(html.match(/data-rtdnd="clone"/g)).toHaveLength(1)
    expect(html).not.toContain('class=""')
  })
})

describe('onScroll on the scroll containers', () => {
  it('is attached to the inner element that scrolls, not the outer wrapper', () => {
    // renderToString drops handlers, so check the prop split: onScroll must not reach the outer div
    // via ...rest. The server markup carries every other forwarded attribute on the outer div.
    const html = renderToString(
      h(
        TableContainer,
        null,
        h(
          TableHeader,
          { 'data-x': 'h', onScroll: () => {} } as never,
          h(ColumnCell, { id: 'n', index: 0 }, 'N'),
        ),
        h(
          TableBody,
          { 'data-x': 'b', onScroll: () => {} } as never,
          h(BodyRow, { id: 'r', index: 0 }, h(RowCell, { index: 0 }, 'x')),
        ),
      ),
    )
    expect(html).toMatch(/<div[^>]*data-x="h"[^>]*data-rtdnd="header"/)
    expect(html).toMatch(/<div[^>]*data-x="b"[^>]*data-rtdnd="body"/)
  })
})
