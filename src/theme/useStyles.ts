import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import type { Palette } from '../core/theme';
import { useTheme } from './ThemeProvider';

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Build a StyleSheet from the current palette, memoised per scheme:
 *
 *   const useStyles = makeStyles((c) => ({ card: { backgroundColor: c.tint } }));
 *   ...
 *   const styles = useStyles();
 *
 * `makeStyles` is called once at module level, like `StyleSheet.create`; the returned hook
 * rebuilds the sheet only when the scheme changes. Screens with no colours in their styles
 * can keep a plain `StyleSheet.create`.
 */
export function makeStyles<const T extends Styles>(factory: (c: Palette) => T): () => T {
  return function useStyles() {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
