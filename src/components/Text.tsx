import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '../theme';

/**
 * Drop-in replacement for react-native's `Text` that defaults to the theme's text colour.
 * Plain `Text` is black, which vanishes on a dark background. A `color` in `style` still wins.
 */
export function Text({ style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return <RNText {...rest} style={[{ color: colors.text }, style]} />;
}
