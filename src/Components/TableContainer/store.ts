import type { TableState, TableAction } from '../../hooks/types'

export interface TableStore {
  getState: () => TableState
  dispatch: (action: TableAction) => void
  subscribe: (listener: () => void) => () => void
}

export function createTableStore(
  reducer: (state: TableState, action: TableAction) => TableState,
  initialState: TableState,
): TableStore {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action)
      if (next === state) return // no-op (e.g. controlled selection re-synced with equal ids)
      state = next
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
