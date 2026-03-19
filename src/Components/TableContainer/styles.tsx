import type { ReactNode } from 'react'
import '../style.css'

interface StylesProps {
  children: ReactNode
  className?: string
}

// Plain wrapper div — all styles live in style.css scoped to [data-flexitable-root].
// No styled-components dependency; consumers can still override .th/.td freely.
export const Styles = ({ children, className }: StylesProps) => (
  <div data-flexitable-root="" className={className ?? ''}>
    {children}
  </div>
)
