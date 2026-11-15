// Geometry helpers for turning font glyph outlines into tracing targets.
// Pure functions, no font parsing here (see gen-glyph-targets.mjs), so they can be tested without the font.

/** opentype.js path commands (M L Q C Z) to polygons of [x, y], curves flattened into `steps` segments. */
export function flattenCommands(commands, steps = 12) {
  const polygons = [];
  let cur = [];
  let x0 = 0;
  let y0 = 0;
  const flush = () => {
    if (cur.length) polygons.push(cur);
    cur = [];
  };
  for (const c of commands) {
    if (c.type === 'M') {
      flush();
      cur = [[c.x, c.y]];
      [x0, y0] = [c.x, c.y];
    } else if (c.type === 'L') {
      cur.push([c.x, c.y]);
      [x0, y0] = [c.x, c.y];
    } else if (c.type === 'Q') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        cur.push([u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, u * u * y0 + 2 * u * t * c.y1 + t * t * c.y]);
      }
      [x0, y0] = [c.x, c.y];
    } else if (c.type === 'C') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        cur.push([
          u ** 3 * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
          u ** 3 * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y,
        ]);
      }
      [x0, y0] = [c.x, c.y];
    } else if (c.type === 'Z') {
      flush();
    }
  }
  flush();
  return polygons;
}

/**
 * Flip y (fonts have y up), scale uniformly and centre the polygons in the unit
 * square, leaving `box` of margin on each side.
 */
export function fitPolygons(polygons, box = 0.08) {
  const pts = polygons.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => -p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = (1 - 2 * box) / Math.max(maxX - minX, maxY - minY);
  const ox = 0.5 - ((minX + maxX) / 2) * scale;
  const oy = 0.5 - ((minY + maxY) / 2) * scale;
  return {
    scale,
    polygons: polygons.map((poly) => poly.map(([x, y]) => [x * scale + ox, -y * scale + oy])),
  };
}

/** Non-zero winding scanline fill of unit-square polygons into a size x size bitmap. */
export function fillPolygons(polygons, size) {
  const bitmap = new Uint8Array(size * size);
  for (let row = 0; row < size; row++) {
    const yy = (row + 0.5) / size;
    const crossings = [];
    for (const poly of polygons) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        let dir = 0;
        if (a[1] <= yy && b[1] > yy) dir = 1;
        else if (b[1] <= yy && a[1] > yy) dir = -1;
        if (dir === 0) continue;
        crossings.push([a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), dir]);
      }
    }
    crossings.sort((p, q) => p[0] - q[0]);
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i][1];
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(crossings[i][0] * size - 0.5));
      const to = Math.min(size, Math.ceil(crossings[i + 1][0] * size - 0.5));
      for (let x = from; x < to; x++) bitmap[row * size + x] = 1;
    }
  }
  return bitmap;
}

/** Zhang-Suen thinning. Returns a new bitmap; the input is left alone. */
export function thin(input, size) {
  const g = Uint8Array.from(input);
  const idx = (x, y) => y * size + x;
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const del = [];
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          if (!g[idx(x, y)]) continue;
          // N, NE, E, SE, S, SW, W, NW
          const p = [
            g[idx(x, y - 1)], g[idx(x + 1, y - 1)], g[idx(x + 1, y)], g[idx(x + 1, y + 1)],
            g[idx(x, y + 1)], g[idx(x - 1, y + 1)], g[idx(x - 1, y)], g[idx(x - 1, y - 1)],
          ];
          const b = p.reduce((s, v) => s + v, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) a++;
          if (a !== 1) continue;
          if (pass === 0) {
            if (p[0] && p[2] && p[4]) continue;
            if (p[2] && p[4] && p[6]) continue;
          } else {
            if (p[0] && p[2] && p[6]) continue;
            if (p[0] && p[4] && p[6]) continue;
          }
          del.push(idx(x, y));
        }
      }
      if (del.length) {
        changed = true;
        for (const i of del) g[i] = 0;
      }
    }
  }
  return g;
}

/** Douglas-Peucker simplification of an open polyline of [x, y]. */
export function simplify(points, epsilon) {
  if (points.length < 3) return points.map((p) => [...p]);
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = points[s];
    const [bx, by] = points[e];
    const len = Math.hypot(bx - ax, by - ay);
    let worst = -1;
    let worstD = epsilon;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = points[i];
      const d = len === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([s, worst], [worst, e]);
    }
  }
  return points.filter((_, i) => keep[i]).map((p) => [...p]);
}

/** Polygons in the unit square to an SVG path `d` on a 0..100 box, one decimal. */
export function pathData(polygons) {
  const f = (v) => String(Number((v * 100).toFixed(1)));
  return polygons
    .map((poly) => poly.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`).join('') + 'Z')
    .join('');
}

const N8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

function neighborsOf(g, size, i) {
  const x = i % size;
  const y = (i - x) / size;
  const out = [];
  for (const [dx, dy] of N8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    const j = ny * size + nx;
    if (g[j]) out.push(j);
  }
  return out;
}

const adjacent = (size, a, b) => {
  const ax = a % size;
  const bx = b % size;
  return Math.abs(ax - bx) <= 1 && Math.abs((a - ax) / size - (b - bx) / size) <= 1;
};

/**
 * Remove pixels that are not needed for connectivity: those with two or more
 * neighbours that stay connected to each other without them (staircase corners
 * and clumps at junctions). End points and pixels on a clean line stay.
 */
function dropCorners(g, size) {
  const connectedWithout = (nb) => {
    const seen = new Set([nb[0]]);
    const queue = [nb[0]];
    while (queue.length) {
      const cur = queue.pop();
      for (const q of nb) {
        if (!seen.has(q) && adjacent(size, cur, q)) {
          seen.add(q);
          queue.push(q);
        }
      }
    }
    return seen.size === nb.length;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < g.length; i++) {
      if (!g[i]) continue;
      const nb = neighborsOf(g, size, i);
      if (nb.length >= 2 && connectedWithout(nb)) {
        g[i] = 0;
        changed = true;
      }
    }
  }
}

/** Split the pixel graph into chains running between end points and junctions (or around pure loops). */
function buildChains(g, size) {
  const deg = new Map();
  for (let i = 0; i < g.length; i++) if (g[i]) deg.set(i, neighborsOf(g, size, i).length);
  const isNode = (i) => deg.get(i) !== 2;
  const key = (a, b) => (a < b ? a * g.length + b : b * g.length + a);
  const seen = new Set();
  const chains = [];
  const inChain = new Set();
  for (const [n, d] of deg) {
    if (!isNode(n)) continue;
    if (d === 0) {
      // A lone pixel (a dot) becomes a two point stroke so it still has a line to score against.
      chains.push([n, n]);
      continue;
    }
    for (const m of neighborsOf(g, size, n)) {
      if (seen.has(key(n, m))) continue;
      seen.add(key(n, m));
      const chain = [n];
      let prev = n;
      let cur = m;
      for (;;) {
        chain.push(cur);
        if (isNode(cur)) break;
        const next = neighborsOf(g, size, cur).find((q) => q !== prev);
        if (next === undefined) break;
        seen.add(key(cur, next));
        prev = cur;
        cur = next;
      }
      for (const c of chain) inChain.add(c);
      chains.push(chain);
    }
  }
  // Pure loops have no end point or junction at all.
  for (const [i, d] of deg) {
    if (d !== 2 || inChain.has(i)) continue;
    const chain = [i];
    let prev = i;
    let cur = neighborsOf(g, size, i)[0];
    while (cur !== i) {
      chain.push(cur);
      inChain.add(cur);
      const next = neighborsOf(g, size, cur).find((q) => q !== prev);
      prev = cur;
      cur = next;
    }
    chain.push(i);
    inChain.add(i);
    chains.push(chain);
  }
  return { chains, deg };
}

/**
 * Walk a thinned bitmap into polylines in unit coordinates. Branches that end
 * in a free tip and are shorter than `spurLength` pixels are removed (thinning
 * leaves small whiskers), then each polyline is simplified.
 */
export function skeletonPolylines(thinned, size, spurLength, epsilon = 0.004) {
  const g = Uint8Array.from(thinned);
  dropCorners(g, size);
  let result = buildChains(g, size);
  for (let round = 0; round < 6; round++) {
    let pruned = false;
    for (const chain of result.chains) {
      const a = result.deg.get(chain[0]);
      const b = result.deg.get(chain[chain.length - 1]);
      if (chain.length - 1 >= spurLength) continue;
      if (a === 1 && b >= 3) {
        for (const i of chain.slice(0, -1)) g[i] = 0;
        pruned = true;
      } else if (b === 1 && a >= 3) {
        for (const i of chain.slice(1)) g[i] = 0;
        pruned = true;
      }
    }
    if (!pruned) break;
    dropCorners(g, size);
    result = buildChains(g, size);
  }
  const toPoint = (i) => [((i % size) + 0.5) / size, (Math.floor(i / size) + 0.5) / size];
  const lines = result.chains.map((chain) => simplify(chain.map(toPoint), epsilon));
  return lines;
}
