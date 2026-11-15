import { Platform } from 'react-native';
import { ANDROID_HAPTIC, GENERIC_HAPTIC, type HapticKind } from './core/haptics';

/**
 * Light haptic feedback. To turn it off for the whole app, set this to false, or call
 * `setHapticsEnabled(false)` at runtime.
 */
export const HAPTICS_ENABLED_BY_DEFAULT = true;

let enabled = HAPTICS_ENABLED_BY_DEFAULT;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

// Load lazily and defensively: if the native module is ever missing, the app just goes silent
// instead of failing to start.
type HapticsModule = typeof import('expo-haptics');
let mod: HapticsModule | null | undefined;
function load(): HapticsModule | null {
  if (mod === undefined) {
    try {
      mod = require('expo-haptics') as HapticsModule;
    } catch (e) {
      console.warn('Haptics unavailable', e);
      mod = null;
    }
  }
  return mod;
}

/** Fire and forget. Never throws and never blocks the caller. */
export function playHaptic(kind: HapticKind) {
  if (!enabled) return;
  const H = load();
  if (!H) return;
  try {
    const pending =
      Platform.OS === 'android'
        ? H.performAndroidHapticsAsync(ANDROID_HAPTIC[kind] as import('expo-haptics').AndroidHaptics)
        : GENERIC_HAPTIC[kind].kind === 'impact'
          ? H.impactAsync(GENERIC_HAPTIC[kind].value as import('expo-haptics').ImpactFeedbackStyle)
          : H.notificationAsync(GENERIC_HAPTIC[kind].value as import('expo-haptics').NotificationFeedbackType);
    pending.catch(() => {});
  } catch {
    // Some devices have no haptics hardware; that is fine.
  }
}
