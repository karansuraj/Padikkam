import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { summarizeCredits } from './credits';

describe('summarizeCredits', () => {
  it('lists each distinct speaker and each distinct licence with its link', () => {
    const s = summarizeCredits([
      { speaker: 'A', license: 'CC BY-SA 4.0', licenseUrl: 'https://example.org/by-sa' },
      { speaker: 'A', license: 'CC BY-SA 4.0', licenseUrl: 'https://example.org/by-sa' },
      { speaker: 'A', license: 'CC0', licenseUrl: 'https://example.org/cc0' },
    ]);
    expect(s.speakers).toEqual(['A']);
    expect(s.licenses).toEqual([
      { name: 'CC BY-SA 4.0', url: 'https://example.org/by-sa' },
      { name: 'CC0', url: 'https://example.org/cc0' },
    ]);
  });

  it('every licence in the real manifest has a link', () => {
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../assets/audio/letters/manifest.json', import.meta.url)), 'utf8'),
    );
    const { licenses } = summarizeCredits(manifest);
    expect(licenses.length).toBeGreaterThan(0);
    for (const l of licenses) expect(l.url).toMatch(/^https:\/\//);
  });
});
