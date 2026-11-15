import { describe, expect, it } from 'vitest';
import { LETTERS } from '../data/letters';
import { getGlyph } from '../data/glyphs';
import { DEFAULT_TRACE_OPTIONS, MEMORY_TRACE_OPTIONS, fitToTarget, scoreTrace, type Stroke } from './trace';

describe('glyph targets', () => {
  it('has an outline and a skeleton for every letter', () => {
    for (const l of LETTERS) {
      const g = getGlyph(l.id);
      expect(g, l.roman).toBeDefined();
      expect(g!.d.length, l.roman).toBeGreaterThan(20);
      expect(g!.target.strokes.length, l.roman).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps every skeleton stroke at 2+ points and inside the unit square', () => {
    for (const l of LETTERS) {
      for (const s of getGlyph(l.id)!.target.strokes) {
        expect(s.length, l.roman).toBeGreaterThanOrEqual(2);
        for (const p of s) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(1);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('returns undefined for an unknown letter id', () => {
    expect(getGlyph('letter:ffff')).toBeUndefined();
  });

  it("scores each letter's own skeleton as a pass", () => {
    for (const l of LETTERS) {
      const g = getGlyph(l.id)!;
      const r = scoreTrace(g.target, g.target.strokes);
      expect(r.passed, l.roman).toBe(true);
      expect(r.score, l.roman).toBeGreaterThanOrEqual(95);
    }
  });

  it("fails a different letter's skeleton in from-memory mode almost every time", () => {
    let pairs = 0;
    let falsePasses = 0;
    for (const a of LETTERS) {
      for (const b of LETTERS) {
        if (a.id === b.id) continue;
        pairs++;
        if (scoreTrace(getGlyph(a.id)!.target, getGlyph(b.id)!.target.strokes, MEMORY_TRACE_OPTIONS).passed) falsePasses++;
      }
    }
    expect(falsePasses / pairs).toBeLessThan(0.02); // measured about 1%
  });
});

/** A smooth, deterministic stand-in for a finger trace: a global shift plus a slow sine wobble, up to `amp`. */
function wobble(strokes: Stroke[], amp: number, seed: number): Stroke[] {
  const r = (n: number) => {
    const x = Math.sin(seed * 999 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const sx = (r(1) - 0.5) * amp;
  const sy = (r(2) - 0.5) * amp;
  const f1 = 6 + r(3) * 6;
  const f2 = 6 + r(4) * 6;
  const p1 = r(5) * 6.28;
  const p2 = r(6) * 6.28;
  return strokes.map((s) =>
    s.map((p) => ({
      x: p.x + sx + Math.sin(p.y * f1 + p1) * amp * 0.5,
      y: p.y + sy + Math.sin(p.x * f2 + p2) * amp * 0.5,
    })),
  );
}

describe('threshold presets on wobbly traces of every letter', () => {
  const runs = LETTERS.flatMap((l) =>
    [0.04, 0.07].flatMap((amp) => [1, 2, 3].map((seed) => ({ l, amp, seed }))),
  );

  it('trace mode passes every wobbly self trace', () => {
    for (const { l, amp, seed } of runs) {
      const g = getGlyph(l.id)!;
      const r = scoreTrace(g.target, wobble(g.target.strokes, amp, seed), DEFAULT_TRACE_OPTIONS);
      expect(r.passed, `${l.roman} amp ${amp} seed ${seed}`).toBe(true);
    }
  });

  it('from-memory mode, after fitting, passes at least 90% of wobbly self traces', () => {
    let pass = 0;
    for (const { l, amp, seed } of runs) {
      const g = getGlyph(l.id)!;
      const fitted = fitToTarget(wobble(g.target.strokes, amp, seed), g.target);
      if (scoreTrace(g.target, fitted, MEMORY_TRACE_OPTIONS).passed) pass++;
    }
    expect(pass / runs.length).toBeGreaterThanOrEqual(0.9);
  });
});
