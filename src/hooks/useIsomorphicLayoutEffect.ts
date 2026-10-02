import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server. Layout effects never run during
 * server rendering, and React 18 warns about every one it meets; the effects that use this only
 * touch the DOM, so there is nothing to do on the server anyway.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default useIsomorphicLayoutEffect
