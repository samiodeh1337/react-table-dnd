import { createContext, useContext } from 'react'
import { useSyncExternalStore } from 'react'
import type { TableStore } from './store'
import type { TableState, TableAction } from '../../hooks/types'

export const StoreContext = createContext<TableStore | null>(null)

/** @experimental The state shape is internal and may change in a minor release. */
export const useTableStore = <T,>(selector: (state: TableState) => T): T => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTableStore must be used inside a TableContainer')
  const snapshot = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, snapshot, snapshot) // server snapshot: SSR-safe
}

/** @experimental The state shape is internal and may change in a minor release. */
export const useTableDispatch = (): ((action: TableAction) => void) => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTableDispatch must be used inside a TableContainer')
  return store.dispatch
}

// subscribes to full state — prefer useTableStore(selector) for perf
/** @experimental The state shape is internal and may change in a minor release. */
export const useTable = () => {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useTable must be used inside a TableContainer')
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  return { state, dispatch: store.dispatch }
}
