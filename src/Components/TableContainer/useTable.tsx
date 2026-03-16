import { createContext, useContext } from 'react'
import type { TableContextType } from '../../hooks/types'

export const TableContext = createContext<TableContextType | undefined>(undefined)

export const useTable = () => {
  const context = useContext(TableContext)
  if (context === undefined) {
    throw new Error('useTable must be used within a TableProvider')
  }
  return context
}
