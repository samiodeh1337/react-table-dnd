// builds O(1) index maps (row/col/cell) once at drag start, rebuilt on auto-scroll invalidation
import { useCallback, useRef } from 'react'
import type { HookRefs } from './types'
import type { IndexMap } from './useShiftTransforms'

interface IndexMapsResult {
  rowIndexMapRef: React.RefObject<IndexMap>
  colIndexMapRef: React.RefObject<IndexMap>
  cellIndexMapRef: React.RefObject<Map<number, HTMLElement[]>>
  mapStaleRef: React.RefObject<boolean>
  buildMaps: (dtype: string | null | undefined, body: HTMLElement | null) => void
  rebuildRowMap: (container: HTMLElement) => void
  rebuildColumnMaps: (container: HTMLElement, header: HTMLElement | null) => void
  checkStaleness: () => void
  clearMaps: () => void
}

const useIndexMaps = (refs: HookRefs): IndexMapsResult => {
  const rowIndexMapRef = useRef<IndexMap>(new Map())
  const colIndexMapRef = useRef<IndexMap>(new Map())
  const cellIndexMapRef = useRef<Map<number, HTMLElement[]>>(new Map())
  const mapStaleRef = useRef(false)

  const clearMaps = useCallback(() => {
    rowIndexMapRef.current.clear()
    colIndexMapRef.current.clear()
    cellIndexMapRef.current.clear()
  }, [])

  const buildRowMap = useCallback((body: HTMLElement) => {
    rowIndexMapRef.current.clear()
    const rows = body.querySelectorAll('.draggable[data-type="row"]')
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i] as HTMLElement
      const idx = el.dataset.index
      if (idx === undefined) continue
      const inner = el.firstElementChild as HTMLElement | null
      if (inner) rowIndexMapRef.current.set(+idx, { outer: el, inner })
    }
  }, [])

  const buildColumnMap = useCallback((header: HTMLElement) => {
    colIndexMapRef.current.clear()
    const cols = header.querySelectorAll('.draggable[data-type="column"]')
    for (let i = 0; i < cols.length; i++) {
      const el = cols[i] as HTMLElement
      const idx = el.dataset.index
      if (idx === undefined) continue
      const inner = el.firstElementChild as HTMLElement | null
      if (inner) colIndexMapRef.current.set(+idx, { outer: el, inner })
    }
  }, [])

  const buildCellMap = useCallback((body: HTMLElement) => {
    cellIndexMapRef.current.clear()
    const cells = body.querySelectorAll('.td[data-col-index]')
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLElement
      const idx = +cell.dataset.colIndex!
      if (!cellIndexMapRef.current.has(idx)) {
        cellIndexMapRef.current.set(idx, [])
      }
      cellIndexMapRef.current.get(idx)!.push(cell)
    }
  }, [])

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const buildMaps = useCallback(
    (dtype: string | null | undefined, body: HTMLElement | null) => {
      clearMaps()
      if (!body) return

      if (dtype === 'row') {
        buildRowMap(body)
      } else if (dtype === 'column') {
        const header = refs.headerRef?.current
        if (header) buildColumnMap(header)
        buildCellMap(body)
      }
    },
    [refs.headerRef, clearMaps, buildRowMap, buildColumnMap, buildCellMap],
  )
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const rebuildRowMap = useCallback(
    (container: HTMLElement) => {
      mapStaleRef.current = false
      buildRowMap(container)
    },
    [buildRowMap],
  )

  const rebuildColumnMaps = useCallback(
    (container: HTMLElement, header: HTMLElement | null) => {
      mapStaleRef.current = false
      if (header) buildColumnMap(header)
      buildCellMap(container)
    },
    [buildColumnMap, buildCellMap],
  )

  // checks first entry only — good enough for virtual table node swaps
  const checkStaleness = useCallback(() => {
    if (mapStaleRef.current) return

    if (rowIndexMapRef.current.size > 0) {
      const firstEntry = rowIndexMapRef.current.values().next().value
      if (firstEntry && !firstEntry.outer.isConnected) {
        mapStaleRef.current = true
        return
      }
    }
    if (colIndexMapRef.current.size > 0) {
      const firstEntry = colIndexMapRef.current.values().next().value
      if (firstEntry && !firstEntry.outer.isConnected) {
        mapStaleRef.current = true
      }
    }
  }, [])

  return {
    rowIndexMapRef,
    colIndexMapRef,
    cellIndexMapRef,
    mapStaleRef,
    buildMaps,
    rebuildRowMap,
    rebuildColumnMaps,
    checkStaleness,
    clearMaps,
  }
}

export default useIndexMaps
