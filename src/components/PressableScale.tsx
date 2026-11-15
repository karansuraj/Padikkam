import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { PRESS, pressTargets, pressedOpacity } from '../core/motion';
import { useReducedMotion } from './useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ExtraTransform = Extract<NonNullable<Animated.WithAnimatedValue<ViewStyle>['transform']>, ReadonlyArray<unknown>>;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** A plain style (not a callback). Layout, borders and `opacity` for a dimmed look all work as before. */
  style?: StyleProp<ViewStyle>;
  /** Set false to keep the button enabled but silent (for example a quiz option after the answer is in). */
  feedback?: boolean;
  /** Scale while held down. Defaults to the app-wide value in `core/motion`. */
  pressedScale?: number;
  /** Extra animated transforms (for example a shake), applied after the press scale. */
  extraTransform?: ExtraTransform;
  ref?: ComponentProps<typeof Pressable>['ref'];
}

/**
 * Drop-in replacement for `Pressable` with press feedback: a quick scale-down and slight fade
 * on press-in, a springy return on release. Scale and opacity run on the native driver and
 * never change layout. A disabled one does not animate. Works as the child of `<Link asChild>`.
 */
export function PressableScale({
  style,
  feedback = true,
  pressedScale,
  extraTransform,
  disabled,
  onPressIn,
  onPressOut,
  ref,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const inactive = !!disabled || !feedback;
  const scale = useRef(new Animated.Value(1)).current;
  const press = useRef(new Animated.Value(0)).current; // 0 at rest, 1 while held

  const baseOpacity = StyleSheet.flatten(style)?.opacity;
  const base = typeof baseOpacity === 'number' ? baseOpacity : 1;
  const opacity = useMemo(
    () => press.interpolate({ inputRange: [0, 1], outputRange: [base, pressedOpacity(base)] }),
    [press, base],
  );

  // A pressable that goes inactive mid-press (for example a quiz option once answered) snaps to rest.
  useEffect(() => {
    if (inactive) {
      scale.setValue(1);
      press.setValue(0);
    }
  }, [inactive, scale, press]);

  const handleIn = (e: GestureResponderEvent) => {
    onPressIn?.(e);
    if (inactive) return;
    const target = pressTargets(reduceMotion, pressedScale);
    Animated.parallel([
      Animated.timing(scale, { toValue: target.scale, duration: PRESS.inMs, useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: PRESS.inMs, useNativeDriver: true }),
    ]).start();
  };

  const handleOut = (e: GestureResponderEvent) => {
    onPressOut?.(e);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, ...PRESS.spring, useNativeDriver: true }),
      Animated.timing(press, { toValue: 0, duration: PRESS.outMs, useNativeDriver: true }),
    ]).start();
  };

  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, { opacity, transform: [{ scale }, ...(extraTransform ?? [])] }]}
    />
  );
}
