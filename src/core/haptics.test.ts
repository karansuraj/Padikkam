import { describe, expect, it } from 'vitest';
import { ANDROID_HAPTIC, GENERIC_HAPTIC, type HapticKind } from './haptics';

const KINDS: HapticKind[] = ['tap', 'correct', 'wrong'];

describe('haptics tables', () => {
  it('cover every kind on Android and elsewhere', () => {
    for (const k of KINDS) {
      expect(ANDROID_HAPTIC[k]).toBeTruthy();
      expect(GENERIC_HAPTIC[k].value).toBeTruthy();
    }
  });

  it('use a different feel for right and wrong answers', () => {
    expect(ANDROID_HAPTIC.correct).not.toBe(ANDROID_HAPTIC.wrong);
    expect(GENERIC_HAPTIC.correct.value).not.toBe(GENERIC_HAPTIC.wrong.value);
  });

  it('keep the everyday tap light', () => {
    expect(GENERIC_HAPTIC.tap).toEqual({ kind: 'impact', value: 'light' });
  });
});
