// Pure motion constants and helpers. No React Native imports, so they are testable in Node.

/** Press feedback. Durations are in ms and stay inside roughly 80 to 200 ms. */
export const PRESS = {
  /** Scale while a pressable is held down. */
  scale: 0.96,
  /** Opacity multiplier while held down (applied on top of any base opacity). */
  opacity: 0.82,
  /** Press-in time for both scale and opacity. */
  inMs: 80,
  /** Opacity return time on release. */
  outMs: 160,
  /** Spring used for the scale return on release. Slightly bouncy, settles in about 200 ms. */
  spring: { speed: 28, bounciness: 10 },
} as const;

/** Light fade and slide for screen content. */
export const ENTER = {
  ms: 180,
  /** Start offset in px; the content slides up into place. */
  offset: 8,
} as const;

/** Brief reaction on a chosen quiz option. */
export const REACTION = {
  /** Peak scale of the pop shown for a right answer. */
  popScale: 1.06,
  popMs: 90,
  /** Horizontal swing in px for the shake shown on a wrong answer. */
  shakeAmplitude: 7,
  shakeStepMs: 45,
} as const;

export interface PressTargets {
  scale: number;
}

/**
 * Target scale while pressed. With reduced motion it stays at 1 (no movement); the opacity
 * change, which is not motion, still applies via `pressedOpacity`.
 */
export function pressTargets(reduceMotion: boolean, pressedScale: number = PRESS.scale): PressTargets {
  const scale = reduceMotion ? 1 : Math.min(1, Math.max(0.8, pressedScale));
  return { scale };
}

/** Opacity range for a pressable whose resting opacity is `base` (for example 0.4 when dimmed). */
export function pressedOpacity(base: number): number {
  return base * PRESS.opacity;
}

/** Horizontal offsets for a decaying shake that ends at rest (0). */
export function shakeOffsets(amplitude: number = REACTION.shakeAmplitude): number[] {
  return [-amplitude, amplitude, -amplitude * 0.6, amplitude * 0.6, 0];
}
