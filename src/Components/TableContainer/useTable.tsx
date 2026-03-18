import { createContext, useContext } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import type { TableStore } from './store'
import type { TableState, TableAction } from '../../hooks/types'

export const StoreContext = createContext<TableStore | null>(null)

export const useTableStore = <T,>(selector: (state: TableState) => T): T => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTableStore must be used within TableProvider')
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}

export const useTableDispatch = (): ((action: TableAction) => void) => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTableDispatch must be used within TableProvider')
  return store.dispatch
}

// subscribes to full state — prefer useTableStore(selector) for perf
export const useTable = () => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTable must be used within a TableProvider')
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return { state, dispatch: store.dispatch }
}
