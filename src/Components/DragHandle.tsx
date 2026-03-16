import React, { memo } from 'react'
import type { ReactNode, CSSProperties } from 'react'

interface DragHandleProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

const DragHandle: React.FC<DragHandleProps> = memo(({ children, className, style }) => (
  <div
    data-drag-handle="true"
    className={className}
    style={{ cursor: '-webkit-grab', display: 'inline-flex', alignItems: 'center', ...style }}
  >
    {children}
  </div>
))

DragHandle.displayName = 'DragHandle'
export default DragHandle
