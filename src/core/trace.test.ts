import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRACE_OPTIONS,
  MEMORY_TRACE_OPTIONS,
  fitToTarget,
  resample,
  scoreTrace,
  type Point,
  type Stroke,
  type TraceTarget,
} from './trace';

/** n+1 evenly spaced points from (x1,y1) to (x2,y2). */
function line(x1: number, y1: number, x2: number, y2: number, n = 60): Stroke {
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: x1 + ((x2 - x1) * i) / n,
    y: y1 + ((y2 - y1) * i) / n,
  }));
}

/** A horizontal bar, length 0.6. */
const bar: TraceTarget = { strokes: [line(0.2, 0.5, 0.8, 0.5, 6)] };

/** An L: down the left side, then along the bottom. Two target strokes. */
const ell: TraceTarget = {
  strokes: [line(0.2, 0.2, 0.2, 0.8, 6), line(0.2, 0.8, 0.8, 0.8, 6)],
};

describe('scoreTrace', () => {
  it('a perfect trace passes with score 100 and feedback great', () => {
    const r = scoreTrace(bar, [line(0.2, 0.5, 0.8, 0.5)]);
    expect(r.coverage).toBeCloseTo(1, 5);
    expect(r.precision).toBeCloseTo(1, 5);
    expect(r.overshoot).toBeCloseTo(0, 5);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.feedback).toBe('great');
  });

  it('a trace shifted inside the tolerance passes', () => {
    const r = scoreTrace(bar, [line(0.2, 0.54, 0.8, 0.54)]);
    expect(r.passed).toBe(true);
  });

  it('a trace shifted beyond the tolerance fails as strayed', () => {
    const r = scoreTrace(bar, [line(0.2, 0.7, 0.8, 0.7)]);
    expect(r.passed).toBe(false);
    expect(r.feedback).toBe('strayed');
  });

  it('a scribble over the whole canvas covers the target but fails as strayed', () => {
    const scribble: Stroke = [];
    for (let i = 0; i < 20; i++) {
      scribble.push(...line(0.05, 0.05 + i * 0.045, 0.95, 0.05 + i * 0.045, 20));
    }
    const r = scoreTrace(bar, [scribble]);
    expect(r.coverage).toBeGreaterThan(0.95);
    expect(r.precision).toBeLessThan(0.3);
    expect(r.passed).toBe(false);
    expect(r.feedback).toBe('strayed');
  });

  it('a partial trace fails as incomplete with full precision', () => {
    const r = scoreTrace(bar, [line(0.2, 0.5, 0.5, 0.5)]);
    expect(r.precision).toBeCloseTo(1, 5);
    expect(r.coverage).toBeGreaterThan(0.55);
    expect(r.coverage).toBeLessThan(0.7);
    expect(r.passed).toBe(false);
    expect(r.feedback).toBe('incomplete');
  });

  it('a mostly complete trace passes with feedback good', () => {
    const r = scoreTrace(bar, [line(0.2, 0.5, 0.65, 0.5)]);
    expect(r.passed).toBe(true);
    expect(r.score).toBeLessThan(95);
    expect(r.feedback).toBe('good');
  });

  it('empty input scores 0 with feedback empty', () => {
    for (const input of [[], [[]]] as Stroke[][]) {
      const r = scoreTrace(bar, input);
      expect(r).toMatchObject({ coverage: 0, precision: 0, score: 0, passed: false, feedback: 'empty' });
    }
  });

  it('a single point or a very short stroke is too-short and never passes', () => {
    const dot = scoreTrace(bar, [[{ x: 0.5, y: 0.5 }]]);
    expect(dot.feedback).toBe('too-short');
    expect(dot.passed).toBe(false);
    const tick = scoreTrace(bar, [line(0.5, 0.5, 0.55, 0.5)]);
    expect(tick.feedback).toBe('too-short');
    expect(tick.passed).toBe(false);
  });

  it('a stroke far outside the region has no coverage and no precision', () => {
    const r = scoreTrace(bar, [line(0.05, 0.05, 0.05, 0.3)]);
    expect(r.coverage).toBe(0);
    expect(r.precision).toBe(0);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it('a stroke exactly at the tolerance is inside, and just over it is outside', () => {
    const opts = { tolerance: 0.125 };
    const at = scoreTrace(bar, [line(0.2, 0.625, 0.8, 0.625)], opts);
    expect(at.precision).toBe(1);
    expect(at.coverage).toBe(1);
    const over = scoreTrace(bar, [line(0.2, 0.635, 0.8, 0.635)], opts);
    expect(over.precision).toBe(0);
    expect(over.coverage).toBe(0);
  });

  it('respects a custom tolerance', () => {
    const shifted = [line(0.2, 0.62, 0.8, 0.62)];
    expect(scoreTrace(bar, shifted).passed).toBe(false);
    expect(scoreTrace(bar, shifted, { tolerance: 0.15 }).passed).toBe(true);
  });

  it('does not depend on stroke count, order or direction', () => {
    const whole = scoreTrace(ell, [line(0.2, 0.2, 0.2, 0.8), line(0.2, 0.8, 0.8, 0.8)]);
    const split = scoreTrace(ell, [
      line(0.8, 0.8, 0.5, 0.8, 20), // bottom bar, right half, drawn right to left
      line(0.2, 0.5, 0.2, 0.2, 20), // upright, top half, upward
      line(0.5, 0.8, 0.2, 0.8, 20),
      line(0.2, 0.8, 0.2, 0.5, 20),
    ]);
    expect(whole.passed).toBe(true);
    expect(split.passed).toBe(true);
    expect(split.coverage).toBeCloseTo(whole.coverage, 2);
    expect(split.precision).toBeCloseTo(whole.precision, 2);
  });

  it('survives NaN and off-canvas points, and counts off-canvas ink as stray', () => {
    const bad: Stroke = [{ x: Number.NaN, y: 0.5 }, { x: 0.5, y: Number.POSITIVE_INFINITY }];
    expect(() => scoreTrace(bar, [bad])).not.toThrow();
    expect(scoreTrace(bar, [bad]).feedback).toBe('empty');
    const clean = scoreTrace(bar, [line(0.2, 0.5, 0.8, 0.5)]);
    const withStray = scoreTrace(bar, [line(0.2, 0.5, 0.8, 0.5), line(1.5, 1.5, 1.9, 1.9)]);
    expect(withStray.precision).toBeLessThan(clean.precision);
  });

  it('exposes the trace and from-memory presets', () => {
    expect(DEFAULT_TRACE_OPTIONS).toEqual({
      tolerance: 0.06,
      minCoverage: 0.8,
      minPrecision: 0.8,
      spacing: 0.01,
      minInkRatio: 0.25,
    });
    expect(MEMORY_TRACE_OPTIONS.tolerance).toBeLessThan(DEFAULT_TRACE_OPTIONS.tolerance);
    expect(MEMORY_TRACE_OPTIONS.minCoverage).toBeGreaterThan(DEFAULT_TRACE_OPTIONS.minCoverage);
  });

  it('the from-memory preset is stricter than trace mode on the same ink', () => {
    const wobbly = [line(0.2, 0.555, 0.8, 0.555)]; // 0.055 off: inside 0.06, outside 0.05
    expect(scoreTrace(bar, wobbly).passed).toBe(true);
    expect(scoreTrace(bar, wobbly, MEMORY_TRACE_OPTIONS).passed).toBe(false);
  });
});

describe('fitToTarget', () => {
  it('moves and scales a small copy drawn in a corner onto the target', () => {
    const small = [line(0.05, 0.05, 0.15, 0.05)];
    expect(scoreTrace(bar, small).passed).toBe(false);
    const fitted = fitToTarget(small, bar);
    expect(scoreTrace(bar, fitted).passed).toBe(true);
  });

  it('keeps proportions (uniform scale)', () => {
    const fitted = fitToTarget([line(0, 0, 0.1, 0.2)], ell);
    const xs = fitted[0].map((p) => p.x);
    const ys = fitted[0].map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(h / w).toBeCloseTo(2, 5);
  });

  it('ignores a stray tap when fitting, so one accidental touch does not ruin the attempt', () => {
    const letter = [line(0.2, 0.5, 0.8, 0.5)];
    const tap: Stroke = [{ x: 0.02, y: 0.02 }];
    const clean = scoreTrace(bar, fitToTarget(letter, bar), MEMORY_TRACE_OPTIONS);
    const withTap = scoreTrace(bar, fitToTarget([tap, ...letter], bar), MEMORY_TRACE_OPTIONS);
    expect(clean.passed).toBe(true);
    expect(withTap.passed).toBe(true);
    expect(withTap.coverage).toBeGreaterThan(0.95);
  });

  it('still fits when every stroke is tiny', () => {
    const fitted = fitToTarget([[{ x: 0.1, y: 0.1 }, { x: 0.11, y: 0.1 }]], bar);
    expect(fitted).toHaveLength(1);
    expect(fitted[0].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('returns empty for empty input and tolerates a single point', () => {
    expect(fitToTarget([], bar)).toEqual([]);
    const one = fitToTarget([[{ x: 0.1, y: 0.1 }]], bar);
    expect(one[0][0]).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('resample', () => {
  it('survives a zero, negative or NaN spacing instead of looping forever', () => {
    for (const spacing of [0, -1, Number.NaN]) {
      const out = resample([{ x: 0, y: 0 }, { x: 0.1, y: 0 }], spacing);
      expect(out.length).toBeGreaterThan(1);
      expect(out.length).toBeLessThan(5000);
    }
    expect(() => scoreTrace(bar, [line(0.2, 0.5, 0.8, 0.5)], { spacing: 0 })).not.toThrow();
  });

  it('spaces points evenly and keeps the endpoints', () => {
    const out = resample([{ x: 0, y: 0 }, { x: 0.1, y: 0 }], 0.01);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1].x).toBeCloseTo(0.1, 9);
    expect(out.length).toBe(11);
  });

  it('returns a single point unchanged and handles empty input', () => {
    const p: Point = { x: 0.3, y: 0.3 };
    expect(resample([p], 0.01)).toEqual([p]);
    expect(resample([], 0.01)).toEqual([]);
  });
});
