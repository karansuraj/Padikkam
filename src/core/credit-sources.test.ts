import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CREDIT_SOURCES } from '../data/credit-sources';

const at = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

describe('credit sources', () => {
  it('gives every source a name, what it is used for, an author and a licence', () => {
    for (const s of CREDIT_SOURCES) {
      expect(s.title.length, s.id).toBeGreaterThan(0);
      expect(s.usedFor.length, s.id).toBeGreaterThan(10);
      expect(s.by.length, s.id).toBeGreaterThan(0);
      expect(s.licenses.length, s.id).toBeGreaterThan(0);
    }
  });

  it('uses unique ids and only https links', () => {
    expect(new Set(CREDIT_SOURCES.map((s) => s.id)).size).toBe(CREDIT_SOURCES.length);
    for (const s of CREDIT_SOURCES) {
      for (const l of s.licenses) expect(l.url, `${s.id} ${l.name}`).toMatch(/^https:\/\//);
      for (const l of s.links) expect(l.url, `${s.id} ${l.label}`).toMatch(/^https:\/\//);
    }
  });

  it('credits every third-party resource the app uses', () => {
    const ids = CREDIT_SOURCES.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['noto-sans-malayalam', 'ut-austin-clips', 'wikidata', 'fsrs']));
  });

  it('names the licences the docs record for the font and the clips', () => {
    const noto = CREDIT_SOURCES.find((s) => s.id === 'noto-sans-malayalam')!;
    const ut = CREDIT_SOURCES.find((s) => s.id === 'ut-austin-clips')!;
    expect(noto.licenses[0].name).toContain('OFL');
    expect(noto.by).toContain('Noto Project Authors');
    expect(ut.licenses[0].name).toContain('CC BY 4.0');
    expect(ut.by).toContain('Donald R. Davis');
    const docs = readFileSync(at('../../docs/third-party/README.md'), 'utf8');
    expect(docs).toContain('SIL Open Font License 1.1');
    expect(docs).toContain('CC BY 4.0');
  });

  it('never claims a verified or scored stroke order', () => {
    const text = JSON.stringify(CREDIT_SOURCES).toLowerCase();
    expect(text).not.toMatch(/verified stroke order|stroke order is (checked|scored)/);
  });
});
