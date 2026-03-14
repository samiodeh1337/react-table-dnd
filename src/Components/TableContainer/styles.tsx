import styled from "styled-components";

// Scoped reset: only targets the library's own structural elements,
// never bleeds into consumer content. Uses data attributes and class
// names that the library controls.
export const Styles = styled.div`
  height: 100%;

  &, & .table, & .header, & .thead, & .body, & .ibody,
  & .draggable, & .tr, & .th, & .td {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  &.is-dragging, &.is-dragging * {
    user-select: none !important;
    -webkit-user-select: none !important;
  }
`;
