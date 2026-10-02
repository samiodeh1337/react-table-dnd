/**
 * useDeferredActivation — the wait between a mousedown and a drag.
 *
 * With selection on, a row drag must not start on mousedown (a click with a jittery hand
 * would become a drag). So after the press the window is watched until one of:
 *   - the pointer travels DRAG_ACTIVATION_DISTANCE → `onActivate` (the drag starts)
 *   - pointerup                                     → `onRelease` (it was a click)
 *   - pointercancel, Escape, or a move with no button held → `onCancel`
 * Meanwhile the browser's own drag of an image or link under the press is blocked: it would
 * take the pointer (pointercancel) and the row could never be dragged from there.
 * Listeners are removed as soon as any of these fires, on a new press, and on unmount.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { DRAG_ACTIVATION_DISTANCE } from './drag/constants'

export interface PendingPress {
  startX: number
  startY: number
  onActivate: (ev: PointerEvent) => void
  onRelease: () => void
  onCancel: () => void
}

const useDeferredActivation = () => {
  const detachRef = useRef<(() => void) | null>(null)

  useEffect(() => () => detachRef.current?.(), [])

  const arm = useCallback((press: PendingPress) => {
    detachRef.current?.()
    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('dragstart', onNativeDrag, true)
      detachRef.current = null
    }
    const onNativeDrag = (ev: DragEvent) => ev.preventDefault()
    const onMove = (ev: PointerEvent) => {
      if (ev.buttons === 0) {
        // released while this window was not listening (focus loss, a modal): not a drag
        detach()
        press.onCancel()
        return
      }
      if (
        Math.abs(ev.clientX - press.startX) < DRAG_ACTIVATION_DISTANCE &&
        Math.abs(ev.clientY - press.startY) < DRAG_ACTIVATION_DISTANCE
      )
        return
      detach()
      press.onActivate(ev)
    }
    const onUp = () => {
      detach()
      press.onRelease()
    }
    const onCancel = () => {
      detach()
      press.onCancel()
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.preventDefault() // this Escape cancels the pending press, it must not clear the selection
      ev.stopPropagation()
      detach()
      press.onCancel()
    }
    detachRef.current = detach
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('dragstart', onNativeDrag, true)
  }, [])

  return useMemo(() => ({ arm }), [arm])
}

export default useDeferredActivation
