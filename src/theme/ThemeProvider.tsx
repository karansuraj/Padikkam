import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { PALETTES, resolveScheme, type ColorScheme, type Palette, type ThemePreference } from '../core/theme';
import { loadThemePreference, saveThemePreference } from '../data/settings';

interface ThemeValue {
  /** The scheme actually drawn now (System already resolved against the phone). */
  scheme: ColorScheme;
  isDark: boolean;
  /** Semantic colour tokens for the current scheme. */
  colors: Palette;
  /** What the learner chose: system, light or dark. */
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Holds the theme choice and resolves it against the phone's scheme. The saved choice is read
 * synchronously on first render, and `useColorScheme()` re-renders this when the phone's setting
 * changes, so System mode follows it live. Also themes React Navigation (headers, screen backgrounds).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const os = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(loadThemePreference);
  const scheme = resolveScheme(preference, os);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    saveThemePreference(pref);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ scheme, isDark: scheme === 'dark', colors: PALETTES[scheme], preference, setPreference }),
    [scheme, preference, setPreference],
  );

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const c = PALETTES[scheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.link,
        background: c.background,
        card: c.header,
        text: c.text,
        border: c.border,
      },
    };
  }, [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
