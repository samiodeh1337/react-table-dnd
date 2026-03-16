import styled from 'styled-components'

// Scoped reset: only targets the library's own structural elements,
// never bleeds into consumer content. Uses data attributes and class
// names that the library controls.
export const Styles = styled.div`
  height: 100%;

  /* Structural elements: full reset */
  &,
  & .table,
  & .header,
  & .thead,
  & .body,
  & .ibody,
  & .draggable,
  & .tr {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* User-facing cells: only box-sizing reset — no padding/margin override
     so className and styled-components can customize freely */
  & .th,
  & .td {
    box-sizing: border-box;
  }

  &.is-dragging,
  &.is-dragging * {
    cursor: -webkit-grabbing !important;
    cursor: grabbing !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-touch-callout: none !important;
  }

  /* When a DragHandle exists, only the handle shows grab cursor */
  &:not(.is-dragging) .draggable:has([data-drag-handle]) > div {
    cursor: default !important;
  }
  &:not(.is-dragging) [data-drag-handle] {
    cursor: -webkit-grab;
    cursor: grab;
  }
`
