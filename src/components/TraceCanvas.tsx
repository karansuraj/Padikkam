import { memo, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import type { Point, Stroke } from '../core/trace';
import { useTheme } from '../theme';

interface Props {
  /** Side of the square canvas in dp. */
  size: number;
  /** The learner's strokes, in canvas fractions (0..1). Controlled by the parent. */
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
  /** Outline of the letter on a 0..100 box, drawn faintly under the ink. */
  guidePath?: string;
  /** Centreline of the letter, drawn over the ink to show what the target was. */
  overlay?: Stroke[];
  /** When true the canvas ignores touches. */
  disabled?: boolean;
}

/** Ignore touch samples closer together than this (canvas fractions); keeps strokes light. */
const MIN_STEP = 0.004;
const INK_WIDTH = 0.03;

/** One finished or in-progress stroke. Memoised on the stroke array, so only the stroke being drawn re-renders. */
const Ink = memo(function Ink({ stroke, color, width }: { stroke: Stroke; color: string; width: number }) {
  return (
    <Path
      d={pathOf(stroke)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
});

const pathOf = (stroke: Stroke): string => {
  const pts = stroke.length === 1 ? [stroke[0], stroke[0]] : stroke; // a tap draws a dot
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join('');
};

/**
 * A square drawing surface. Touches are collected with React Native's PanResponder (no native module beyond
 * react-native-svg) and reported as strokes in canvas fractions, so scoring does not depend on screen size.
 * The Svg sits in a View that ignores touches so every event is measured against the outer View.
 */
export function TraceCanvas({ size, strokes, onChange, guidePath, overlay, disabled }: Props) {
  const { colors } = useTheme();
  const latest = useRef({ size, onChange, disabled: !!disabled });
  latest.current = { size, onChange, disabled: !!disabled };
  // Mirror of the strokes that handlers can read and write between renders.
  const live = useRef<Stroke[]>(strokes);
  live.current = strokes;

  const pan = useMemo(() => {
    const at = (e: { nativeEvent: { locationX: number; locationY: number } }): Point => ({
      x: e.nativeEvent.locationX / latest.current.size,
      y: e.nativeEvent.locationY / latest.current.size,
    });
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      // Nothing else on the screen may take the touch away mid-stroke.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.current = [...live.current, [at(e)]];
        latest.current.onChange(live.current);
      },
      onPanResponderMove: (e, gesture) => {
        // With a second finger down, locationX/Y can jump between the two; ignore until one is left.
        if (gesture.numberActiveTouches > 1) return;
        const strokesNow = live.current;
        const last = strokesNow[strokesNow.length - 1];
        if (!last) return;
        const p = at(e);
        const prev = last[last.length - 1];
        if (Math.hypot(p.x - prev.x, p.y - prev.y) < MIN_STEP) return;
        live.current = [...strokesNow.slice(0, -1), [...last, p]];
        latest.current.onChange(live.current);
      },
    });
  }, []);

  return (
    <View
      {...pan.panHandlers}
      style={{ width: size, height: size, backgroundColor: colors.canvas, borderRadius: 12, overflow: 'hidden' }}
    >
      <View pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 1 1">
        <Rect x={0} y={0} width={1} height={1} fill="none" stroke={colors.canvasLine} strokeWidth={0.006} />
        <Line x1={0.5} y1={0} x2={0.5} y2={1} stroke={colors.canvasGrid} strokeWidth={0.004} strokeDasharray="0.02 0.02" />
        <Line x1={0} y1={0.5} x2={1} y2={0.5} stroke={colors.canvasGrid} strokeWidth={0.004} strokeDasharray="0.02 0.02" />
        {guidePath ? (
          <G scale={0.01}>
            <Path d={guidePath} fill={colors.canvasGuide} fillOpacity={0.13} fillRule="nonzero" />
          </G>
        ) : null}
        {strokes.map((s, i) => (
          <Ink key={i} stroke={s} color={colors.ink} width={INK_WIDTH} />
        ))}
        {overlay?.map((s, i) => (
          <Ink key={`o${i}`} stroke={s} color={colors.inkTarget} width={0.008} />
        ))}
      </Svg>
      </View>
    </View>
  );
}
