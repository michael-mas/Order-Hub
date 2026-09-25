/**
 * Scroll progress, outside React. The render loop reads `snapshot()` every
 * frame; components only subscribe to section changes. Native scroll is never
 * touched: no preventDefault, no virtual scroll, no smoothing of the scroll
 * itself — smoothing happens on the consumer side with damp().
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** 0 when the section's top meets the viewport bottom, 1 when its bottom meets the viewport top. */
export function sectionProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
): number {
  return clamp01((viewportHeight - rectTop) / (viewportHeight + rectHeight))
}

/** Progress through the whole document, in [0, 1]. */
export function documentProgress(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  return clamp01(scrollY / Math.max(1, scrollHeight - viewportHeight))
}

export interface SectionRect {
  id: string
  top: number
  height: number
}

/** The section that crosses the viewport's vertical centre, if any. */
export function activeSection(
  sections: readonly SectionRect[],
  viewportHeight: number,
): string | null {
  const centre = viewportHeight / 2
  return sections.find((s) => s.top <= centre && s.top + s.height > centre)?.id ?? null
}

export interface ScrollSnapshot {
  document: number
  sections: Readonly<Record<string, number>>
  active: string | null
}

export interface ScrollStore {
  /** Recomputes from layout reads. Call once per frame, before any DOM write. */
  update(
    sections: readonly SectionRect[],
    scrollY: number,
    scrollHeight: number,
    viewportHeight: number,
  ): void
  snapshot(): ScrollSnapshot
  /** Notified only when the active section changes — never per frame. */
  onSectionChange(listener: (active: string | null) => void): () => void
}

export function createScrollStore(): ScrollStore {
  let state: ScrollSnapshot = { document: 0, sections: {}, active: null }
  const listeners = new Set<(active: string | null) => void>()

  return {
    update(sections, scrollY, scrollHeight, viewportHeight) {
      const progress: Record<string, number> = {}
      for (const s of sections) progress[s.id] = sectionProgress(s.top, s.height, viewportHeight)
      const active = activeSection(sections, viewportHeight)
      const changed = active !== state.active
      state = {
        document: documentProgress(scrollY, scrollHeight, viewportHeight),
        sections: progress,
        active,
      }
      if (changed) for (const l of listeners) l(active)
    },
    snapshot: () => state,
    onSectionChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
