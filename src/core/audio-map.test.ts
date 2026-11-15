import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LETTERS } from '../data/letters';

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const readJson = (rel: string) => JSON.parse(readFileSync(at(rel), 'utf8'));
const WORDS_MANIFEST = '../../assets/audio/words/manifest.json';
const wordClips: { id: string; file: string }[] = existsSync(at(WORDS_MANIFEST)) ? readJson(WORDS_MANIFEST) : [];

describe('audio map', () => {
  it('covers exactly the letters plus the downloaded word clips, and every file exists', () => {
    const text = readFileSync(at('../data/audio.ts'), 'utf8');
    const keys = [...text.matchAll(/^\s*'((?:letters|words)\/[^']+\.(?:wav|ogg))':/gm)].map((m) => m[1]);
    const expected = [...LETTERS.map((l) => l.audio!), ...wordClips.map((w) => `words/${w.file}`)];
    expect([...keys].sort()).toEqual([...expected].sort());
    for (const k of keys) {
      expect(existsSync(at(`../../assets/audio/${k}`)), k).toBe(true);
      expect(text).toContain(`require('../../assets/audio/${k}')`);
    }
  });

  it('every letter manifest entry lists speaker, licence and source page', () => {
    const manifest = readJson('../../assets/audio/letters/manifest.json');
    expect(manifest).toHaveLength(58);
    for (const m of manifest) {
      expect(m.speaker, m.file).toBeTruthy();
      expect(m.license, m.file).toBeTruthy();
      expect(m.sourcePage, m.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\//);
    }
  });
});

describe('audio credits', () => {
  it('has one entry per clip (letters and words), each with a speaker, licence link and source page', () => {
    const credits = readJson('../data/audio-credits.json');
    expect(credits).toHaveLength(58 + wordClips.length);
    for (const c of credits) {
      expect(c.label, JSON.stringify(c)).toBeTruthy();
      expect(c.license, c.label).toBeTruthy();
      expect(c.licenseUrl, c.label).toMatch(/^https:\/\//);
      expect(c.sourcePage, c.label).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\//);
    }
  });
});
