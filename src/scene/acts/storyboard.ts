/**
 * What the scenography says at each point of the page (04-STRUCTURE-CONTENU
 * § 1.5): one subject that is a core at rest on the hero, becomes a flow of
 * data on the e-commerce cases, a computed lattice on System://Alive, bursts
 * at the experience threshold, then settles back to a calm core.
 *
 * Thresholds are never literals: they are derived from where each section
 * actually sits in the document, so editing the copy cannot break the story.
 */

export interface StoryState {
  /** Shape weights — they always sum to 1. */
  core: number
  flow: number
  lattice: number
  /** Brightness and motion, [0, 1]. */
  energy: number
  /** Radial dispersion, [0, 1] (scaled by MAX_BURST in the shader). */
  burst: number
}

const state = (
  core: number,
  flow: number,
  lattice: number,
  energy: number,
  burst = 0,
): StoryState => ({
  core,
  flow,
  lattice,
  energy,
  burst,
})

export const ACT_STATES: Readonly<Record<string, StoryState>> = {
  hero: state(1, 0, 0, 0.75),
  halves: state(0.4, 0.3, 0.3, 0.65),
  flow: state(0, 1, 0, 0.75),
  structure: state(0, 0, 1, 0.75),
  threshold: state(0.34, 0.33, 0.33, 1, 1),
  skills: state(0.4, 0, 0.6, 0.5),
  path: state(1, 0, 0, 0.4),
  contact: state(1, 0, 0, 0.3),
}

export interface SectionBox {
  act: string
  top: number
  height: number
}

export interface Keyframe {
  /** Document progress at which the section is centred in the viewport. */
  at: number
  state: StoryState
}

/** Keyframes from measured section boxes; unknown acts are ignored. */
export function keyframesFromSections(
  sections: readonly SectionBox[],
  documentHeight: number,
  viewportHeight: number,
): Keyframe[] {
  const scrollable = Math.max(1, documentHeight - viewportHeight)
  return sections
    .filter((s) => s.act in ACT_STATES)
    .map((s) => ({
      at: clamp01((s.top + s.height / 2 - viewportHeight / 2) / scrollable),
      state: ACT_STATES[s.act]!,
    }))
    .sort((a, b) => a.at - b.at)
}

/** Continuous state at document progress `p`: piecewise-linear between keyframes. */
export function stateAt(p: number, keyframes: readonly Keyframe[]): StoryState {
  const first = keyframes[0]
  if (!first) return ACT_STATES.hero!
  if (p <= first.at) return first.state
  for (let i = 1; i < keyframes.length; i++) {
    const a = keyframes[i - 1]!
    const b = keyframes[i]!
    if (p <= b.at) {
      const t = b.at === a.at ? 1 : (p - a.at) / (b.at - a.at)
      return mix(a.state, b.state, t)
    }
  }
  return keyframes.at(-1)!.state
}

function mix(a: StoryState, b: StoryState, t: number): StoryState {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    core: m(a.core, b.core),
    flow: m(a.flow, b.flow),
    lattice: m(a.lattice, b.lattice),
    energy: m(a.energy, b.energy),
    burst: m(a.burst, b.burst),
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
