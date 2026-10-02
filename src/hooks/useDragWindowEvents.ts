/**
 * useDragWindowEvents — the window listeners that live only while a drag runs.
 *
 * pointermove is throttled to one call per animation frame (the last position wins);
 * pointerup and pointercancel end the drag; Escape cancels it. So does losing the button: a mouse
 * released outside the window (the page never sees that pointerup) or the window losing focus.
 */
import { useEffect } from 'react'

const useDragWindowEvents = (
  active: boolean,
  onMove: (clientX: number, clientY: number) => void,
  onEnd: () => void,
  onCancel: () => void,
) => {
  useEffect(() => {
    if (!active) return
    let pendingX = 0
    let pendingY = 0
    let raf: number | null = null
    let released = false // after pointerup the drop snap runs; buttons are 0 then by design
    const onPointerMove = (e: PointerEvent) => {
      if (!e.isPrimary) return // a second finger or pen: the first pointer drives the drag
      // the button came up somewhere the page could not see: nothing is held any more
      if (!released && e.pointerType === 'mouse' && e.buttons === 0) {
        onCancel()
        return
      }
      pendingX = e.clientX
      pendingY = e.clientY
      if (raf !== null) return
      raf = requestAnimationFrame(() => {
        raf = null
        onMove(pendingX, pendingY)
      })
    }
    const onBlur = () => {
      if (!released) onCancel() // alt-tab, a system dialog: the release will never arrive
    }
    const onPointerEnd = (e: PointerEvent) => {
      if (!e.isPrimary) return // lifting a second finger must not drop the drag
      released = true
      onEnd()
    }
    // capture phase + stopPropagation: Escape cancels the drag and nothing else (a surrounding
    // dialog must not close, the idle Escape-clears-selection listener must not fire)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', onBlur)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf) // a late move must not reach the next drag
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, onMove, onEnd, onCancel])
}

export default useDragWindowEvents
