// Timing and distance constants shared by the drag hooks.

/** The clone snaps into the drop slot for this long before the drop is finalized. */
export const DROP_SNAP_MS = 200
/** After a drop, rows settle into their new order over this long (FLIP). */
export const DROP_FLIP_MS = 260
/** When a group drag starts, the other members fold into the card over this long. They stay
 *  opaque for the first half of the travel and fade during the second half. (The drop unfold,
 *  DROP_FLIP_MS, is shorter: rows appear faster than they gather.) */
export const GRAB_FOLD_MS = 360
/** Sibling rows/columns slide out of the way with this transition. */
export const TRANSITION_STYLE = 'transform 450ms cubic-bezier(0.2, 0, 0, 1)'
/** The placeholder glides between slots with this transition. */
export const PLACEHOLDER_TRANSITION_STYLE = 'transform 150ms cubic-bezier(0.2, 0, 0, 1)'

/** Pointer within this many px of the body's edge triggers auto-scroll. */
export const EDGE_SCROLL_ZONE = 30
export const EDGE_SCROLL_SPEED = 5

/** A press that moves less than this before release counts as a click. */
export const CLICK_MOVE_TOLERANCE = 4
/** Selectable rows only start dragging once the pointer has moved this far. */
export const DRAG_ACTIVATION_DISTANCE = 5

/** Presses on these never change the selection. */
export const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-no-select]'
