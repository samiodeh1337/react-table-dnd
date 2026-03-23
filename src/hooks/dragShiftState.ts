// Shared mutable singleton — written by useDragContextEvents, read by Draggable.useLayoutEffect.
// Zero React overhead: no context, no store, no re-renders.
export const dragShiftState = {
  active: false,
  autoScrolling: false,
  dragType: null as 'row' | 'column' | null,
  sourceIndex: 0,
  targetIndex: 0,
  height: 0,
  width: 0,
}
