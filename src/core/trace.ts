/**
 * Scoring for letter tracing. Pure TypeScript, no React Native imports.
 *
 * Coordinates are fractions of the canvas side (0..1), so the tolerance means
 * the same thing on every screen size. The target is the centreline of the
 * printed glyph as polylines; the "target region" is that line thickened by
 * `tolerance`. Stroke count, order and direction are never scored: we have no
 * vetted stroke-order data in vector form.
 */

export interface Point {
  x: number;
  y: number;
}
export type Stroke = Point[];

export interface TraceTarget {
  strokes: Stroke[];
}

export interface TraceOptions {
  /** Largest distance a point may stray from the other line and still count. */
  tolerance: number;
  /** Share of the target that must be covered to pass. */
  minCoverage: number;
  /** Share of the learner's ink that must stay inside the region to pass. */
  minPrecision: number;
  /** Spacing of the sample points on each line. */
  spacing: number;
  /** Ink shorter than this share of the target's length is too short to judge. */
  minInkRatio: number;
}

/**
 * Trace mode: the guide is on screen, so being generous costs nothing. Measured
 * on the 58 glyph skeletons with a smooth wobble of up to 0.07: every wobbly
 * self trace passes.
 */
export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  tolerance: 0.06,
  minCoverage: 0.8,
  minPrecision: 0.8,
  spacing: 0.01,
  minInkRatio: 0.25,
};

/**
 * From-memory mode: there is no guide, so a looser corridor would let one letter
 * pass for another. Measured on the same skeletons: about 1% of wrong-letter
 * pairs pass and 97% of wobbly self traces do (tolerance 0.06 let 2%, 0.08 let 10%).
 */
export const MEMORY_TRACE_OPTIONS: TraceOptions = {
  ...DEFAULT_TRACE_OPTIONS,
  tolerance: 0.05,
  minCoverage: 0.85,
  minPrecision: 0.85,
};

export type TraceFeedback = 'empty' | 'too-short' | 'strayed' | 'incomplete' | 'good' | 'great';

export interface TraceResult {
  /** Share of the target covered, 0..1. */
  coverage: number;
  /** Share of the learner's ink inside the region, 0..1. */
  precision: number;
  /** 1 - precision: how much of the ink strayed. */
  overshoot: number;
  /** 0..100, harmonic mean of coverage and precision. */
  score: number;
  passed: boolean;
  feedback: TraceFeedback;
}

/** Score at or above which a pass is "great" rather than "good". */
const GREAT_SCORE = 95;
/** Slack for floating point when comparing a distance with the tolerance. */
const EPS = 1e-9;

const isFinitePoint = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);
const cleanStrokes = (strokes: Stroke[]): Stroke[] =>
  strokes.map((s) => s.filter(isFinitePoint)).filter((s) => s.length > 0);

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function strokeLength(s: Stroke): number {
  let len = 0;
  for (let i = 1; i < s.length; i++) len += dist(s[i - 1], s[i]);
  return len;
}

/** Smallest spacing we honour; anything finer only costs time. An invalid spacing falls back to the default. */
const MIN_SPACING = 0.002;

/** Evenly spaced points along a stroke, keeping both endpoints. */
export function resample(stroke: Stroke, spacing: number): Point[] {
  if (stroke.length <= 1) return stroke.map((p) => ({ ...p }));
  const total = strokeLength(stroke);
  if (total === 0) return [{ ...stroke[0] }];
  const step = Number.isFinite(spacing) && spacing > 0 ? Math.max(spacing, MIN_SPACING) : DEFAULT_TRACE_OPTIONS.spacing;
  const count = Math.max(1, Math.round(total / step));
  const out: Point[] = [];
  let seg = 0;
  let segStart = 0; // arc length at the start of segment `seg`
  for (let i = 0; i <= count; i++) {
    const d = (total * i) / count;
    while (seg < stroke.length - 2 && segStart + dist(stroke[seg], stroke[seg + 1]) < d) {
      segStart += dist(stroke[seg], stroke[seg + 1]);
      seg++;
    }
    const a = stroke[seg];
    const b = stroke[seg + 1];
    const segLen = dist(a, b);
    const t = segLen === 0 ? 0 : Math.min(1, Math.max(0, (d - segStart) / segLen));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}

/** Distance from a point to the nearest part of any of the strokes. */
function distToStrokes(p: Point, strokes: Stroke[]): number {
  let best = Infinity;
  for (const s of strokes) {
    if (s.length === 1) {
      best = Math.min(best, dist(p, s[0]));
      continue;
    }
    for (let i = 1; i < s.length; i++) best = Math.min(best, distToSegment(p, s[i - 1], s[i]));
  }
  return best;
}

const share = (points: Point[], strokes: Stroke[], tolerance: number): number => {
  if (points.length === 0) return 0;
  const inside = points.filter((p) => distToStrokes(p, strokes) <= tolerance + EPS).length;
  return inside / points.length;
};

/**
 * Score the learner's strokes against a target. Coverage is the share of the
 * target within tolerance of the ink; precision is the share of the ink within
 * tolerance of the target. A pass needs both, plus enough ink to judge.
 */
export function scoreTrace(
  target: TraceTarget,
  strokes: Stroke[],
  options: Partial<TraceOptions> = {},
): TraceResult {
  const opt = { ...DEFAULT_TRACE_OPTIONS, ...options };
  const ink = cleanStrokes(strokes);
  const none = (feedback: TraceFeedback): TraceResult => ({
    coverage: 0, precision: 0, overshoot: 1, score: 0, passed: false, feedback,
  });
  if (ink.length === 0) return none('empty');

  const goal = cleanStrokes(target.strokes);
  const goalPoints = goal.flatMap((s) => resample(s, opt.spacing));
  const inkPoints = ink.flatMap((s) => resample(s, opt.spacing));

  const coverage = share(goalPoints, ink, opt.tolerance);
  const precision = share(inkPoints, goal, opt.tolerance);
  const score =
    coverage + precision === 0 ? 0 : Math.round((100 * 2 * coverage * precision) / (coverage + precision));
  const base = { coverage, precision, overshoot: 1 - precision, score };

  const inkLength = ink.reduce((sum, s) => sum + strokeLength(s), 0);
  const goalLength = goal.reduce((sum, s) => sum + strokeLength(s), 0);
  if (inkLength < opt.minInkRatio * goalLength || inkLength === 0) {
    return { ...base, passed: false, feedback: 'too-short' };
  }

  if (coverage >= opt.minCoverage && precision >= opt.minPrecision) {
    return { ...base, passed: true, feedback: score >= GREAT_SCORE ? 'great' : 'good' };
  }
  return { ...base, passed: false, feedback: precision < opt.minPrecision ? 'strayed' : 'incomplete' };
}

function bounds(strokes: Stroke[]) {
  const pts = strokes.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Strokes shorter than this are taps or specks, not part of the letter, when sizing the ink. */
const SPECK_LENGTH = 0.02;

/**
 * For "from memory" mode: scale the learner's ink uniformly and move it so its
 * bounding box is centred on the target's and as large, so the learner is
 * judged on shape rather than on where and how big they drew. Taps and specks
 * are carried along but do not count when measuring the ink, so a resting finger
 * does not shrink the letter.
 */
export function fitToTarget(strokes: Stroke[], target: TraceTarget): Stroke[] {
  const ink = cleanStrokes(strokes);
  const goal = cleanStrokes(target.strokes);
  if (ink.length === 0 || goal.length === 0) return [];
  const body = ink.filter((s) => strokeLength(s) >= SPECK_LENGTH);
  const a = bounds(body.length > 0 ? body : ink);
  const b = bounds(goal);
  const inkSize = Math.max(a.maxX - a.minX, a.maxY - a.minY);
  const goalSize = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  const scale = inkSize === 0 ? 1 : goalSize / inkSize;
  const ax = (a.minX + a.maxX) / 2;
  const ay = (a.minY + a.maxY) / 2;
  const bx = (b.minX + b.maxX) / 2;
  const by = (b.minY + b.maxY) / 2;
  return ink.map((s) => s.map((p) => ({ x: bx + (p.x - ax) * scale, y: by + (p.y - ay) * scale })));
}
