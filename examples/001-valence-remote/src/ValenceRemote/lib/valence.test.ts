import { describe, expect, it } from 'vitest';
import { detected, nextDetection, tiltReadings, touchValence, upOf } from './valence.ts';
import type { Vec } from './valence.ts';

function up(beta: number, gamma: number): Vec {
  const vec = upOf(beta, gamma);
  if (!vec) {
    throw new Error('expected a reading');
  }
  return vec;
}

describe('flip', () => {
  it.each([
    ['face up', 0, 0, 1],
    ['face down', 180, 0, -1],
    ['edge on (upright)', 90, 0, 0],
    ['edge on (sideways)', 0, 90, 0],
  ])('reads %s', (_name, beta, gamma, expected) => {
    expect(detected('flip', up(beta, gamma))).toBeCloseTo(expected);
  });
});

describe('invert', () => {
  it('reads upright as +1 and upside down as −1', () => {
    expect(detected('invert', up(90, 0))).toBeCloseTo(1);
    expect(detected('invert', up(-90, 0))).toBeCloseTo(-1);
  });
});

describe('spin', () => {
  it('reads upright as +1 and landscape as 0', () => {
    expect(detected('spin', up(90, 0))).toBeCloseTo(1);
    expect(detected('spin', [1, 0, 0])).toBeCloseTo(0);
  });

  it('is null near flat', () => {
    expect(detected('spin', up(5, 0))).toBeNull();
  });
});

describe('tiltReadings', () => {
  it('reads every tilt detection from one reading', () => {
    const readings = tiltReadings(up(90, 0));
    expect(readings.flip).toBeCloseTo(0);
    expect(readings.invert).toBeCloseTo(1);
    expect(readings.spin).toBeCloseTo(1);
  });

  it('leaves spin null near flat, while flip still reads', () => {
    const readings = tiltReadings(up(0, 0));
    expect(readings.flip).toBeCloseTo(1);
    expect(readings.spin).toBeNull();
  });
});

describe('upOf', () => {
  it('is null without beta or gamma', () => {
    expect(upOf(null, 0)).toBeNull();
  });
});

describe('touchValence', () => {
  it.each([
    ['the top', 0, 1],
    ['the high mark', 0.15, 1],
    ['the middle', 0.5, 0],
    ['the low mark', 0.85, -1],
    ['the bottom', 1, -1],
  ])('reads %s', (_name, y, expected) => {
    expect(touchValence(y)).toBeCloseTo(expected);
  });
});

describe('nextDetection', () => {
  it('steps through every detection and wraps around', () => {
    expect(nextDetection('flip')).toBe('invert');
    expect(nextDetection('spin')).toBe('touch');
    expect(nextDetection('touch')).toBe('flip');
  });
});
