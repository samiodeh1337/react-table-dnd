import Draggable from './Draggable'
import * as React from 'react'
import { useMemo, memo } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { useTableStore } from './TableContainer/useTable'

/** Props of `BodyRow`. Other HTML attributes (`aria-*`, `data-*`, `onClick`, …) go on the row's
 *  `[data-rtdnd="tr"]` element. */
export interface BodyRowProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'id' | 'children' | 'style' | 'className'
> {
  children: ReactNode
  /** Stable row id: selection, `DragEndResult.selectedIds` and `moveRowsById` use it. */
  id: string | number
  /** The row's position in your data array. */
  index: number
  style?: CSSProperties
  className?: string
  /** Extra class applied while the row is selected (needs `selectable` on TableContainer). */
  selectedClassName?: string
  /** Extra inline styles applied while the row is selected. */
  selectedStyle?: CSSProperties
  /** Inline styles for the row's outer element, the one the layout positions (for example
   *  `position: absolute` and a `transform` in a virtual table). `style` styles the row itself. */
  styles?: CSSProperties
  /** This row cannot be picked up. Other rows can still be dropped around it. */
  disabled?: boolean
}

const DEFAULT_STYLES: CSSProperties = {
  display: 'flex',
  flex: '1 0 auto',
  minHeight: '24px',
}

const BodyRow: React.FC<BodyRowProps> = memo(
  ({
    children,
    id,
    index,
    styles,
    disabled,
    style,
    className,
    selectedClassName,
    selectedStyle,
    ...rest
  }) => {
    const rowId = String(id)
    // Only rows whose selected flag flips re-render on a selection change.
    const selected = useTableStore((s) => s.selection.ids.has(rowId))

    const mergedStyles = useMemo<CSSProperties>(() => {
      const base = style ? { ...DEFAULT_STYLES, ...style } : DEFAULT_STYLES
      return selected && selectedStyle ? { ...base, ...selectedStyle } : base
    }, [style, selected, selectedStyle])

    const mergedClassName =
      selected && selectedClassName
        ? className
          ? `${className} ${selectedClassName}`
          : selectedClassName
        : className

    return (
      <Draggable id={id} index={index} styles={styles} disabled={disabled} type="row">
        <div
          {...rest}
          data-rtdnd="tr"
          data-selected={selected ? 'true' : undefined}
          className={mergedClassName}
          style={mergedStyles}
        >
          {children}
        </div>
      </Draggable>
    )
  },
)

BodyRow.displayName = 'BodyRow'
export default BodyRow
