import { describe, expect, it } from 'vitest';
import {
  DARK,
  LIGHT,
  PALETTES,
  THEME_PREFERENCES,
  contrastRatio,
  parseThemePreference,
  resolveScheme,
  type Palette,
} from './theme';

describe('resolveScheme', () => {
  it('follows the system scheme for System', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('falls back to light when the system reports nothing', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  it('lets an explicit choice override the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('dark', null)).toBe('dark');
  });
});

describe('parseThemePreference', () => {
  it('accepts the three known values', () => {
    for (const p of THEME_PREFERENCES) expect(parseThemePreference(p)).toBe(p);
  });

  it('falls back to System for anything else', () => {
    for (const bad of [null, undefined, '', 'Dark', 'DARK', ' dark', 'auto', 'sepia', 0, 1, {}, [], true]) {
      expect(parseThemePreference(bad)).toBe('system');
    }
  });
});

describe('palettes', () => {
  const lightKeys = Object.keys(LIGHT).sort();
  const darkKeys = Object.keys(DARK).sort();

  it('define the same tokens in both schemes', () => {
    expect(darkKeys).toEqual(lightKeys);
  });

  it('use valid #rrggbb colours for every token (scrim may carry an alpha byte)', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const [token, value] of Object.entries(palette)) {
        expect(value, `${name}.${token}`).toMatch(token === 'scrim' ? /^#[0-9a-f]{8}$/i : /^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('are keyed by scheme', () => {
    expect(PALETTES.light).toBe(LIGHT);
    expect(PALETTES.dark).toBe(DARK);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // The classic #777 on white sits just under 4.5.
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#3a4bd0', '#eef0ff')).toBeCloseTo(contrastRatio('#eef0ff', '#3a4bd0'), 10);
  });

  it('rejects colours that are not #rrggbb', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow();
    expect(() => contrastRatio('#fff', '#ffffff')).toThrow();
  });
});

type Token = keyof Palette;

// Body text must reach AA (4.5:1). Non-text UI (borders of state colours) needs 3:1.
const TEXT_PAIRS: [Token, Token][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'tint'],
  ['text', 'header'],
  ['text', 'correctBg'],
  ['text', 'wrongBg'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'tint'],
  ['link', 'background'],
  ['link', 'tint'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'again'],
  ['onPrimary', 'hard'],
  ['onPrimary', 'good'],
  ['onPrimary', 'easy'],
];

const UI_PAIRS: [Token, Token][] = [
  ['correctBorder', 'background'],
  ['wrongBorder', 'background'],
  ['correctBorder', 'correctBg'],
  ['wrongBorder', 'wrongBg'],
  ['primary', 'background'],
  ['ink', 'canvas'],
  ['inkTarget', 'canvas'],
];

describe.each(Object.entries(PALETTES))('%s palette contrast', (_name, palette) => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s against %s is at least 3:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
  });

  it('keeps the right and wrong answer colours distinct', () => {
    expect(palette.correctBg).not.toBe(palette.wrongBg);
    expect(palette.correctBorder).not.toBe(palette.wrongBorder);
  });

  it('keeps the Malayalam glyph text near the top of the range on cards', () => {
    expect(contrastRatio(palette.text, palette.tint)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(7);
  });
});
