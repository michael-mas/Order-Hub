/**
 * What the scenography says at each point of the page (04-STRUCTURE-CONTENU
 * § 1.5): at rest on the hero, two halves, the flow dominates the e-commerce
 * cases, the structure dominates System://Alive, peak density at the
 * experience threshold, then a steady decay to calm by the contact section.
 *
 * Thresholds are never literals: they are derived from where each section
 * actually sits in the document, so editing the copy cannot break the story.
 */

export interface StoryState {
  /** Presence of the ordered flow, [0, 1]. */
  flow: number
  /** Presence of the computed structure, [0, 1]. */
  structure: number
  /** Overall brightness and motion, [0, 1]. */
  energy: number
}

export const ACT_STATES: Readonly<Record<string, StoryState>> = {
  hero: { flow: 0.55, structure: 0.55, energy: 0.35 },
  halves: { flow: 0.7, structure: 0.7, energy: 0.45 },
  flow: { flow: 1, structure: 0.2, energy: 0.6 },
  structure: { flow: 0.2, structure: 1, energy: 0.6 },
  threshold: { flow: 1, structure: 1, energy: 1 },
  skills: { flow: 0.35, structure: 0.35, energy: 0.3 },
  path: { flow: 0.25, structure: 0.25, energy: 0.2 },
  contact: { flow: 0.12, structure: 0.12, energy: 0.1 },
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
  return {
    flow: a.flow + (b.flow - a.flow) * t,
    structure: a.structure + (b.structure - a.structure) * t,
    energy: a.energy + (b.energy - a.energy) * t,
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
