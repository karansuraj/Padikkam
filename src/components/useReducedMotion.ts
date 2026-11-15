import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// One shared subscription for the whole app, so hundreds of list rows do not each listen.
let current = false;
let started = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (value === current) return;
  current = value;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .then(set)
    .catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', set);
}

// Begin reading the setting as soon as this module loads.
start();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** True when the system asks for reduced motion. Animations should skip movement when it is. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => current, () => false);
}
