import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LETTERS } from '../data/letters';

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

describe('audio map', () => {
  it('covers exactly the letters audio paths and every file exists', () => {
    const text = readFileSync(at('../data/audio.ts'), 'utf8');
    const keys = [...text.matchAll(/^\s*'(letters\/[^']+\.wav)':/gm)].map((m) => m[1]);
    expect([...keys].sort()).toEqual(LETTERS.map((l) => l.audio!).sort());
    for (const k of keys) {
      expect(existsSync(at(`../../assets/audio/${k}`)), k).toBe(true);
      expect(text).toContain(`require('../../assets/audio/${k}')`);
    }
  });

  it('every manifest entry lists speaker, licence and source page', () => {
    const manifest = JSON.parse(readFileSync(at('../../assets/audio/letters/manifest.json'), 'utf8'));
    expect(manifest).toHaveLength(58);
    for (const m of manifest) {
      expect(m.speaker, m.file).toBeTruthy();
      expect(m.license, m.file).toBeTruthy();
      expect(m.sourcePage, m.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\//);
    }
  });
});
