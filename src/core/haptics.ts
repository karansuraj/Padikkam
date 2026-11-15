// Which haptic each kind of event plays. Pure data, so it is testable in Node.

export type HapticKind = 'tap' | 'correct' | 'wrong';

/** Values of expo-haptics' `AndroidHaptics`. Android's own haptic constants, which need no VIBRATE permission. */
export const ANDROID_HAPTIC = {
  tap: 'virtual-key',
  correct: 'confirm',
  wrong: 'reject',
} as const satisfies Record<HapticKind, string>;

/** Fallback for other platforms: values of `ImpactFeedbackStyle` and `NotificationFeedbackType`. */
export const GENERIC_HAPTIC = {
  tap: { kind: 'impact', value: 'light' },
  correct: { kind: 'notification', value: 'success' },
  wrong: { kind: 'notification', value: 'error' },
} as const satisfies Record<HapticKind, { kind: 'impact' | 'notification'; value: string }>;
