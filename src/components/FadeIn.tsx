import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { ENTER } from '../core/motion';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Wait this long before starting, in ms. Useful for a light stagger. */
  delay?: number;
}

/**
 * Fades and slides its content up a few pixels when it mounts. Runs on the native driver and
 * does not touch layout. Use it around a screen's content, not around every list row. With
 * reduced motion it renders the content as is. Give it a `key` to replay on content change.
 */
export function FadeIn({ children, style, delay = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: ENTER.ms,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, delay, progress]);

  const translateY = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [ENTER.offset, 0] }),
    [progress],
  );
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
