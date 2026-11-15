import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { REACTION, shakeOffsets } from '../core/motion';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { useReducedMotion } from './useReducedMotion';

interface Props extends PressableScaleProps {
  /** Set only on the option the learner picked: a pop for a right answer, a shake for a wrong one. */
  reaction?: 'pop' | 'shake' | null;
}

/**
 * A quiz answer button. The right/wrong colouring comes from `style` immediately; the reaction
 * is a short transform on top and never delays it.
 */
export function AnswerOption({ reaction = null, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reaction || reduceMotion) return;
    const anim =
      reaction === 'pop'
        ? Animated.sequence([
            Animated.timing(pop, { toValue: REACTION.popScale, duration: REACTION.popMs, useNativeDriver: true }),
            Animated.timing(pop, { toValue: 1, duration: REACTION.popMs, useNativeDriver: true }),
          ])
        : Animated.sequence(
            shakeOffsets().map((toValue) =>
              Animated.timing(shake, { toValue, duration: REACTION.shakeStepMs, useNativeDriver: true }),
            ),
          );
    anim.start();
    return () => anim.stop();
  }, [reaction, reduceMotion, pop, shake]);

  return <PressableScale {...rest} extraTransform={[{ translateX: shake }, { scale: pop }]} />;
}
