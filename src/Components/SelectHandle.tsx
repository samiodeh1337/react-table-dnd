import * as React from 'react'
import { memo } from 'react'
import type { ReactNode, CSSProperties } from 'react'

/** Props of `SelectHandle`. */
export interface SelectHandleProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'style'
> {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Selection twin of `DragHandle`. Place it inside a `BodyRow` (usually around a checkbox
 * visual) and, for that row, only presses inside it change the selection: a click toggles
 * the row, Shift+click selects a range. Clicks elsewhere on the row leave the selection
 * alone, so the row body stays free for drag handles and interactive content.
 *
 * Put a `readOnly` checkbox (or any visual) inside — the library handles the click, and the
 * consumer reflects `selectedIds` / `data-selected` back into it.
 */
const SelectHandle: React.FC<SelectHandleProps> = memo(
  ({ children, className, style, ...rest }) => (
    <div
      {...rest}
      data-select-handle="true"
      className={className}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  ),
)

SelectHandle.displayName = 'SelectHandle'
export default SelectHandle
