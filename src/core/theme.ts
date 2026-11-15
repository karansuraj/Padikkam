// Pure theme logic: palettes, preference resolution and contrast maths. No React Native imports,
// so it runs in Node tests. The React side lives in src/theme/.

export type ColorScheme = 'light' | 'dark';
/** What the learner picks in Settings. `system` follows the phone. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/**
 * Semantic colour tokens. Screens ask for a role ("card", "muted text"), never a raw colour,
 * so both schemes stay in step. Every token exists in both palettes (the tests enforce it).
 */
export interface Palette {
  /** Screen background. */
  background: string;
  /** Navigation header background. */
  header: string;
  /** Plain raised surface, for secondary buttons and quiz options. */
  surface: string;
  /** Soft tinted surface, for navigation cards and list rows. */
  tint: string;
  border: string;
  /** Primary text, and the Malayalam glyphs. Readable on background, surface, tint and header. */
  text: string;
  /** Secondary text on the same surfaces. */
  textMuted: string;
  /** Tappable text such as "Start" and source links. */
  link: string;
  /** Filled primary button, and the text on it. */
  primary: string;
  onPrimary: string;
  /** Review grade buttons. `onPrimary` text sits on each. */
  again: string;
  hard: string;
  good: string;
  easy: string;
  /** Quiz feedback. Primary text stays readable on both backgrounds. */
  correctBg: string;
  correctBorder: string;
  wrongBg: string;
  wrongBorder: string;
  /** Shadow colour under raised buttons. */
  shadow: string;
  /** Writing canvas and its drawing colours. Ink and the target outline must stand out on `canvas`. */
  canvas: string;
  canvasLine: string;
  canvasGrid: string;
  /** Faint letter guide, drawn at low opacity (see TraceCanvas). */
  canvasGuide: string;
  ink: string;
  inkTarget: string;
  /** Dim layer behind modals, `#rrggbbaa`. */
  scrim: string;
}

export const LIGHT: Palette = {
  background: '#f2f2f2',
  header: '#ffffff',
  surface: '#ffffff',
  tint: '#eef0ff',
  border: '#c4caf2',
  text: '#16192e',
  textMuted: '#4a4f6a',
  link: '#2b4fc0',
  primary: '#3a4bd0',
  onPrimary: '#ffffff',
  again: '#b3261e',
  hard: '#b45309',
  good: '#1f7a3a',
  easy: '#3a4bd0',
  correctBg: '#d7f2dc',
  correctBorder: '#27893f',
  wrongBg: '#f8d7d7',
  wrongBorder: '#c23b3b',
  shadow: '#000000',
  canvas: '#ffffff',
  canvasLine: '#cccccc',
  canvasGrid: '#dddddd',
  canvasGuide: '#000000',
  ink: '#1d4ed8',
  inkTarget: '#e11d48',
  scrim: '#00000080',
};

export const DARK: Palette = {
  background: '#0f111a',
  header: '#171a29',
  surface: '#252a45',
  tint: '#1b1f33',
  border: '#3a4170',
  text: '#eef0fa',
  textMuted: '#a8aecb',
  link: '#8fa3ff',
  primary: '#4658e0',
  onPrimary: '#ffffff',
  again: '#c4382f',
  hard: '#b45309',
  good: '#1f7a3a',
  easy: '#4658e0',
  correctBg: '#17402a',
  correctBorder: '#43c06f',
  wrongBg: '#4a1f24',
  wrongBorder: '#ec6b70',
  shadow: '#000000',
  canvas: '#161a2b',
  canvasLine: '#4a5280',
  canvasGrid: '#2e3558',
  canvasGuide: '#ffffff',
  ink: '#8fa8ff',
  inkTarget: '#ff7a93',
  scrim: '#000000b3',
};

export const PALETTES: Record<ColorScheme, Palette> = { light: LIGHT, dark: DARK };

/**
 * The scheme to draw. An explicit Light or Dark wins; System follows the phone's current scheme
 * (`os` is what React Native's `useColorScheme()` returns), and light when the phone reports none.
 */
export function resolveScheme(pref: ThemePreference, os: string | null | undefined): ColorScheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return os === 'dark' ? 'dark' : 'light';
}

/** Parse a stored value. Anything unknown or corrupt means System. */
export function parseThemePreference(raw: unknown): ThemePreference {
  return typeof raw === 'string' && (THEME_PREFERENCES as readonly string[]).includes(raw)
    ? (raw as ThemePreference)
    : DEFAULT_THEME_PREFERENCE;
}

function channel(hex: string, start: number): number {
  const c = parseInt(hex.slice(start, start + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG 2.x contrast ratio between two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
