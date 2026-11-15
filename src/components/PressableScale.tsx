import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { playHaptic } from '../haptics';
import { PRESS, RAISED, pressTargets, pressedOpacity } from '../core/motion';
import { useReducedMotion } from './useReducedMotion';

// Android draws the shadow from `elevation` and needs an opaque background, which the raised
// buttons all have. The iOS shadow props are there for completeness.
const shadowRest: ViewStyle = {
  elevation: RAISED.elevation,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.22,
  shadowRadius: 3,
};
const shadowPressed: ViewStyle = {
  elevation: RAISED.pressedElevation,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ExtraTransform = Extract<NonNullable<Animated.WithAnimatedValue<ViewStyle>['transform']>, ReadonlyArray<unknown>>;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** A plain style (not a callback). Layout, borders and `opacity` for a dimmed look all work as before. */
  style?: StyleProp<ViewStyle>;
  /**
   * Run `onPress` a moment after release (not with reduced motion) so the button visibly lifts
   * before the next screen mounts. Use it on buttons that navigate, not on ones that need an
   * instant reaction such as quiz answers or sound playback. A second tap while one is pending is ignored.
   */
  deferPress?: boolean;
  /** Play a light haptic when the press registers. Default true. */
  haptic?: boolean;
  /** Draw a soft shadow so it reads as a raised button, and sink it while pressed. Default true. A disabled or silent one is flat. */
  raised?: boolean;
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
 * never change layout. A disabled one does not animate and is flat. Works as the child of `<Link asChild>`.
 */
export function PressableScale({
  style,
  feedback = true,
  raised = true,
  deferPress = false,
  haptic = true,
  pressedScale,
  extraTransform,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ref,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const inactive = !!disabled || !feedback;
  const [down, setDown] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const press = useRef(new Animated.Value(0)).current; // 0 at rest, 1 while held

  const baseOpacity = StyleSheet.flatten(style)?.opacity;
  const base = typeof baseOpacity === 'number' ? baseOpacity : 1;
  const opacity = useMemo(
    () => press.interpolate({ inputRange: [0, 1], outputRange: [base, pressedOpacity(base)] }),
    [press, base],
  );

  const sink = pressTargets(reduceMotion, pressedScale).sink;
  const translateY = useMemo(
    () => press.interpolate({ inputRange: [0, 1], outputRange: [0, sink] }),
    [press, sink],
  );

  // A pressable that goes inactive mid-press (for example a quiz option once answered) snaps to rest.
  useEffect(() => {
    if (inactive) {
      scale.setValue(1);
      press.setValue(0);
      setDown(false);
    }
  }, [inactive, scale, press]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  const handlePress = (e: GestureResponderEvent) => {
    if (!onPress) return;
    if (haptic) playHaptic('tap');
    if (!deferPress || reduceMotion) {
      onPress(e);
      return;
    }
    if (pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      onPress(e);
    }, PRESS.deferMs);
  };

  const handleIn = (e: GestureResponderEvent) => {
    onPressIn?.(e);
    if (inactive) return;
    setDown(true);
    const target = pressTargets(reduceMotion, pressedScale);
    Animated.parallel([
      Animated.timing(scale, { toValue: target.scale, duration: PRESS.inMs, useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: PRESS.inMs, useNativeDriver: true }),
    ]).start();
  };

  const handleOut = (e: GestureResponderEvent) => {
    onPressOut?.(e);
    setDown(false);
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
      onPress={onPress ? handlePress : undefined}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[
        raised && !inactive ? (down ? shadowPressed : shadowRest) : null,
        style,
        { opacity, transform: [{ translateY }, { scale }, ...(extraTransform ?? [])] },
      ]}
    />
  );
}
