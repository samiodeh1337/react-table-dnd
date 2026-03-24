import { useCallback, useRef, useState } from 'react'

export interface MultiSelectResult {
  selectedIndices: number[]
  isSelected: (index: number) => boolean
  onRowClick: (index: number, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void
  clearSelection: () => void
  selectAll: () => void
  setSelectedIndices: React.Dispatch<React.SetStateAction<number[]>>
}

const useMultiSelect = (totalCount: number): MultiSelectResult => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const lastClickedRef = useRef<number | null>(null)

  const isSelected = useCallback(
    (index: number) => selectedIndices.includes(index),
    [selectedIndices],
  )

  const onRowClick = useCallback(
    (index: number, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      if (e.shiftKey && lastClickedRef.current !== null) {
        // Shift+click: range select from last clicked to current
        const from = Math.min(lastClickedRef.current, index)
        const to = Math.max(lastClickedRef.current, index)
        const range: number[] = []
        for (let i = from; i <= to; i++) range.push(i)
        setSelectedIndices((prev) => {
          const set = new Set(prev)
          for (const i of range) set.add(i)
          return Array.from(set).sort((a, b) => a - b)
        })
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click: toggle single item
        setSelectedIndices((prev) => {
          if (prev.includes(index)) return prev.filter((i) => i !== index)
          return [...prev, index].sort((a, b) => a - b)
        })
        lastClickedRef.current = index
      } else {
        // Plain click: select only this item
        setSelectedIndices([index])
        lastClickedRef.current = index
      }
    },
    [],
  )

  const clearSelection = useCallback(() => {
    setSelectedIndices([])
    lastClickedRef.current = null
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIndices(Array.from({ length: totalCount }, (_, i) => i))
  }, [totalCount])

  return { selectedIndices, isSelected, onRowClick, clearSelection, selectAll, setSelectedIndices }
}

export default useMultiSelect
