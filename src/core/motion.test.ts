import { describe, expect, it } from 'vitest';
import { ENTER, PRESS, REACTION, pressTargets, pressedOpacity, shakeOffsets } from './motion';

describe('pressTargets', () => {
  it('scales down a little by default', () => {
    const t = pressTargets(false);
    expect(t.scale).toBeLessThan(1);
    expect(t.scale).toBeGreaterThanOrEqual(0.9);
  });

  it('does not move with reduced motion', () => {
    expect(pressTargets(true).scale).toBe(1);
    expect(pressTargets(true, 0.9).scale).toBe(1);
  });

  it('clamps a custom scale so a button never shrinks too far or grows', () => {
    expect(pressTargets(false, 0.2).scale).toBe(0.8);
    expect(pressTargets(false, 1.5).scale).toBe(1);
    expect(pressTargets(false, 0.9).scale).toBe(0.9);
  });
});

describe('pressedOpacity', () => {
  it('keeps a dimmed button dimmer, never brighter', () => {
    expect(pressedOpacity(1)).toBe(PRESS.opacity);
    expect(pressedOpacity(0.4)).toBeLessThan(0.4);
  });
});

describe('shakeOffsets', () => {
  it('ends at rest and stays within the amplitude', () => {
    const offsets = shakeOffsets();
    expect(offsets[offsets.length - 1]).toBe(0);
    for (const o of offsets) expect(Math.abs(o)).toBeLessThanOrEqual(REACTION.shakeAmplitude);
  });

  it('alternates direction and decays', () => {
    const [a, b, c, d] = shakeOffsets(10);
    expect(a).toBeLessThan(0);
    expect(b).toBeGreaterThan(0);
    expect(Math.abs(c)).toBeLessThan(Math.abs(a));
    expect(Math.abs(d)).toBeLessThan(Math.abs(b));
  });

  it('keeps the whole shake brief', () => {
    expect(shakeOffsets().length * REACTION.shakeStepMs).toBeLessThanOrEqual(250);
  });
});

describe('timings', () => {
  it('keep every animation short', () => {
    for (const ms of [PRESS.inMs, PRESS.outMs, ENTER.ms, REACTION.popMs, REACTION.shakeStepMs]) {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(200);
    }
  });
});
