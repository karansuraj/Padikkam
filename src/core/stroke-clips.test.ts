import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LETTER_BY_ID } from '../data/letters';

// The table uses Metro's `require`, which Node cannot run, so read the source text (as audio-map.test does).
const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const source = readFileSync(at('../data/stroke-clips.ts'), 'utf8');
const entries = [...source.matchAll(/'(letter:[0-9a-f_]+)': require\('([^']+\.mp4)'\)/g)].map((m) => ({
  id: m[1],
  path: m[2],
}));

describe('stroke clips', () => {
  it('maps 50 letters', () => {
    expect(entries.length).toBe(50);
    expect(source.match(/require\(/g)?.length).toBe(50);
  });

  it('only maps real letter ids, once each', () => {
    for (const e of entries) expect(LETTER_BY_ID.has(e.id), e.id).toBe(true);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it('points every require at a clip that exists, used for one letter only', () => {
    for (const e of entries) expect(existsSync(at(`../data/${e.path}`)), e.path).toBe(true);
    expect(new Set(entries.map((e) => e.path)).size).toBe(entries.length);
  });

  it('leaves the chillu letters and the rare letters without a clip', () => {
    const covered = new Set(entries.map((e) => e.id));
    for (const l of LETTER_BY_ID.values()) {
      if (l.tags.includes('chillu') || ['tta', 'nna', 'ttta'].includes(l.roman)) {
        expect(covered.has(l.id), l.roman).toBe(false);
      }
    }
  });
});
