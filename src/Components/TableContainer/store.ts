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
      state = reducer(state, action)
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
