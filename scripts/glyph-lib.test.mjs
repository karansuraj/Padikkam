import { describe, expect, it } from 'vitest';
import {
  fillPolygons,
  fitPolygons,
  flattenCommands,
  pathData,
  simplify,
  skeletonPolylines,
  thin,
} from './glyph-lib.mjs';

const SIZE = 64;

/** Axis-aligned rectangle polygon in unit coordinates, counter-clockwise on screen. */
const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const reversed = (poly) => [...poly].reverse();

const at = (bitmap, size, x, y) => bitmap[y * size + x];
const count = (bitmap) => bitmap.reduce((s, v) => s + v, 0);

/** Pixel position (unit coordinates) to bitmap index. */
const px = (u) => Math.floor(u * SIZE);

describe('flattenCommands', () => {
  it('turns M L Z into one closed polygon', () => {
    const polys = flattenCommands([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 10, y: 0 },
      { type: 'L', x: 10, y: 10 },
      { type: 'Z' },
    ]);
    expect(polys).toEqual([[[0, 0], [10, 0], [10, 10]]]);
  });

  it('flattens a quadratic curve ending exactly at its end point', () => {
    const polys = flattenCommands(
      [
        { type: 'M', x: 0, y: 0 },
        { type: 'Q', x1: 5, y1: 10, x: 10, y: 0 },
        { type: 'Z' },
      ],
      4,
    );
    expect(polys[0].length).toBe(5);
    expect(polys[0][4]).toEqual([10, 0]);
    expect(polys[0][2][1]).toBeCloseTo(5, 5); // top of the arc
  });

  it('flattens a cubic curve and starts a new polygon at each M', () => {
    const polys = flattenCommands(
      [
        { type: 'M', x: 0, y: 0 },
        { type: 'C', x1: 0, y1: 10, x2: 10, y2: 10, x: 10, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 20, y: 0 },
        { type: 'L', x: 30, y: 0 },
        { type: 'L', x: 30, y: 5 },
        { type: 'Z' },
      ],
      4,
    );
    expect(polys.length).toBe(2);
    expect(polys[0][polys[0].length - 1]).toEqual([10, 0]);
  });
});

describe('fitPolygons', () => {
  it('flips y, keeps the aspect ratio and lands inside the margin', () => {
    const { polygons } = fitPolygons([[[0, 0], [200, 0], [200, 100], [0, 100]]], 0.1);
    const flat = polygons.flat();
    const xs = flat.map((p) => p[0]);
    const ys = flat.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(0.1, 6);
    expect(Math.max(...xs)).toBeCloseTo(0.9, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.4, 6);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(0.5, 6);
    // y was flipped: the point that was at font y=100 (top) is now smaller y.
    expect(polygons[0][2][1]).toBeLessThan(polygons[0][0][1]);
  });
});

describe('fillPolygons', () => {
  it('fills a rectangle and nothing outside it', () => {
    const bm = fillPolygons([rect(0.25, 0.25, 0.75, 0.75)], SIZE);
    expect(at(bm, SIZE, px(0.5), px(0.5))).toBe(1);
    expect(at(bm, SIZE, px(0.1), px(0.5))).toBe(0);
    expect(at(bm, SIZE, px(0.5), px(0.9))).toBe(0);
  });

  it('leaves a counter-wound hole empty', () => {
    const bm = fillPolygons([rect(0.1, 0.1, 0.9, 0.9), reversed(rect(0.4, 0.4, 0.6, 0.6))], SIZE);
    expect(at(bm, SIZE, px(0.2), px(0.5))).toBe(1);
    expect(at(bm, SIZE, px(0.5), px(0.5))).toBe(0);
  });
});

describe('thin', () => {
  it('reduces a filled bar to a one pixel wide line along its middle', () => {
    const bm = fillPolygons([rect(0.1, 0.4, 0.9, 0.6)], SIZE);
    const out = thin(bm, SIZE);
    expect(count(out)).toBeLessThan(count(bm) / 4);
    // never wider than 1 pixel in the middle column, and sits near y = 0.5
    const col = px(0.5);
    const ys = [];
    for (let y = 0; y < SIZE; y++) if (at(out, SIZE, col, y)) ys.push(y);
    expect(ys.length).toBeLessThanOrEqual(2);
    expect(Math.abs(ys[0] / SIZE - 0.5)).toBeLessThan(0.05);
  });

  it('does not modify its input', () => {
    const bm = fillPolygons([rect(0.1, 0.4, 0.9, 0.6)], SIZE);
    const before = count(bm);
    thin(bm, SIZE);
    expect(count(bm)).toBe(before);
  });
});

describe('skeletonPolylines', () => {
  const plus = () =>
    thin(fillPolygons([rect(0.1, 0.42, 0.9, 0.58), rect(0.42, 0.1, 0.58, 0.9)], SIZE), SIZE);

  it('traces a plus sign to the four arm tips', () => {
    const lines = skeletonPolylines(plus(), SIZE, 4);
    const ends = lines.flatMap((l) => [l[0], l[l.length - 1]]);
    const near = (x, y) => ends.some(([ex, ey]) => Math.hypot(ex - x, ey - y) < 0.1);
    expect(near(0.1, 0.5)).toBe(true);
    expect(near(0.9, 0.5)).toBe(true);
    expect(near(0.5, 0.1)).toBe(true);
    expect(near(0.5, 0.9)).toBe(true);
    for (const l of lines) for (const [x, y] of l) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('prunes a spur shorter than spurLength and keeps a longer one', () => {
    const build = (spur) => {
      const bm = new Uint8Array(SIZE * SIZE);
      for (let x = 8; x <= 55; x++) bm[32 * SIZE + x] = 1; // main line
      for (let i = 1; i <= spur; i++) bm[(32 - i) * SIZE + 30] = 1; // spur up from x=30
      return bm;
    };
    const topY = (lines) => Math.min(...lines.flatMap((l) => l.map((p) => p[1])));
    const mainY = 32.5 / SIZE;
    expect(topY(skeletonPolylines(build(3), SIZE, 6))).toBeGreaterThan(mainY - 0.02);
    expect(topY(skeletonPolylines(build(12), SIZE, 6))).toBeLessThan(mainY - 0.1);
  });

  it('returns a closed polyline for a ring', () => {
    const ring = thin(fillPolygons([rect(0.1, 0.1, 0.9, 0.9), reversed(rect(0.3, 0.3, 0.7, 0.7))], SIZE), SIZE);
    const lines = skeletonPolylines(ring, SIZE, 4);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
    const first = longest[0];
    const last = longest[longest.length - 1];
    expect(Math.hypot(first[0] - last[0], first[1] - last[1])).toBeLessThan(0.05);
  });

  it('returns nothing for an empty bitmap', () => {
    expect(skeletonPolylines(new Uint8Array(SIZE * SIZE), SIZE, 4)).toEqual([]);
  });
});

describe('simplify and pathData', () => {
  it('drops collinear points and keeps corners', () => {
    const out = simplify([[0, 0], [0.5, 0.0001], [1, 0], [1, 1]], 0.01);
    expect(out).toEqual([[0, 0], [1, 0], [1, 1]]);
  });

  it('writes an SVG path on a 0..100 box, one decimal, closed per polygon', () => {
    const d = pathData([[[0, 0], [0.5, 0], [0.5, 0.25]]]);
    expect(d).toBe('M0 0L50 0L50 25Z');
  });
});
