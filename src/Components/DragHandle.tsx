import * as React from 'react'
import { memo } from 'react'
import type { ReactNode, CSSProperties } from 'react'

/** Props of `DragHandle`. */
export interface DragHandleProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'style'
> {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

const DragHandle: React.FC<DragHandleProps> = memo(({ children, className, style, ...rest }) => (
  <div
    {...rest}
    data-drag-handle="true"
    className={className}
    style={{
      cursor: '-webkit-grab',
      touchAction: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      ...style,
    }}
  >
    {children}
  </div>
))

DragHandle.displayName = 'DragHandle'
export default DragHandle
