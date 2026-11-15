import type { TraceTarget } from '../core/trace';
import { GLYPH_TARGETS } from './glyph-targets';

export interface Glyph {
  /** SVG path of the letter's outline on a 0..100 box, for the faint guide. */
  d: string;
  /** Centreline of the letter in canvas fractions, what the learner is scored against. */
  target: TraceTarget;
}

const cache = new Map<string, Glyph>();

/** Guide outline and scoring target for a letter id, or undefined if there is none. */
export function getGlyph(letterId: string): Glyph | undefined {
  const hit = cache.get(letterId);
  if (hit) return hit;
  const raw = GLYPH_TARGETS[letterId];
  if (!raw) return undefined;
  const glyph: Glyph = {
    d: raw.d,
    target: { strokes: raw.strokes.map((s) => s.map(([x, y]) => ({ x, y }))) },
  };
  cache.set(letterId, glyph);
  return glyph;
}
