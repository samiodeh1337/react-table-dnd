/**
 * The inline styles a drag overwrites, and the values they had before.
 *
 * React (or your own `style` prop) sets some inline styles once and never writes them again,
 * so a drag that changes one must put back exactly what was there, not an empty string.
 * `set` writes the drag's values and remembers each property's value from before the first
 * write; writing the same property again keeps that first value. `restoreAll` puts every saved
 * value back and forgets them.
 */
export type StashedProp = 'cursor' | 'opacity' | 'pointerEvents' | 'touchAction' | 'zIndex'

/** Anything with an inline style: an HTMLElement, or a plain object in tests. */
interface Styled {
  style: Pick<CSSStyleDeclaration, StashedProp>
}

export class InlineStyleStash<El extends Styled = HTMLElement> {
  private readonly before = new Map<El, Partial<Record<StashedProp, string>>>()

  /** Write `values` on `el`, remembering what each property held before the drag touched it. */
  set(el: El, values: Partial<Record<StashedProp, string>>): void {
    const saved = this.before.get(el) ?? {}
    for (const prop of Object.keys(values) as StashedProp[]) {
      if (!(prop in saved)) saved[prop] = el.style[prop]
      el.style[prop] = values[prop]!
    }
    this.before.set(el, saved)
  }

  /** Put every saved value back, then forget them. */
  restoreAll(): void {
    for (const [el, saved] of this.before)
      for (const prop of Object.keys(saved) as StashedProp[]) el.style[prop] = saved[prop]!
    this.before.clear()
  }
}
