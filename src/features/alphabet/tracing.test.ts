import { describe, expect, it } from 'vitest';
import {
  PASS_THRESHOLD,
  describeScore,
  pointToPolyline,
  polylineLength,
  resample,
  scoreTracing,
  type Polyline,
} from './tracing';

/** A straight line from a to b, sampled every `step` units. */
function line(from: [number, number], to: [number, number], step = 5): Polyline {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.max(2, Math.round(length / step) + 1);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { x: from[0] + (to[0] - from[0]) * t, y: from[1] + (to[1] - from[1]) * t };
  });
}

/** The two strokes of a corner: across the top, then down the right side. */
const TARGET: Polyline[] = [line([20, 20], [80, 20]), line([80, 20], [80, 80])];

describe('geometry', () => {
  it('measures the length of a polyline', () => {
    expect(polylineLength(line([0, 0], [30, 40]))).toBeCloseTo(50, 5);
  });

  it('measures to the nearest point on a segment, not to its ends', () => {
    const segment: Polyline = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(pointToPolyline({ x: 50, y: 7 }, segment)).toBeCloseTo(7, 5);
  });

  it('spaces resampled points evenly however unevenly the pen moved', () => {
    // A pen that hesitated at the start: many points there, few after.
    const hesitant: Polyline = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 100, y: 0 },
    ];
    const points = resample(hesitant, 5);

    expect(points).toHaveLength(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[4]).toEqual({ x: 100, y: 0 });
    expect(points[2].x).toBeCloseTo(50, 0);
  });

  it('survives a tap that produced a single point', () => {
    expect(resample([{ x: 5, y: 5 }], 10)).toEqual([{ x: 5, y: 5 }]);
    expect(resample([], 10)).toEqual([]);
  });
});

describe('scoreTracing', () => {
  it('passes a faithful trace', () => {
    const score = scoreTracing(TARGET, [
      line([20, 20], [80, 20]),
      line([80, 20], [80, 80]),
    ]);

    expect(score.accuracy).toBeGreaterThan(0.95);
    expect(score.passed).toBe(true);
    expect(score.orderCorrect).toBe(true);
    expect(score.reversedCount).toBe(0);
    expect(describeScore(score)).toBe('That is the shape.');
  });

  it('forgives a wobble inside the tolerance', () => {
    const wobbly = line([20, 24], [80, 24]);
    const score = scoreTracing([TARGET[0]], [wobbly]);

    expect(score.passed).toBe(true);
  });

  it('fails a line drawn somewhere else entirely', () => {
    const score = scoreTracing([TARGET[0]], [line([20, 90], [80, 90])]);

    expect(score.accuracy).toBeLessThan(PASS_THRESHOLD);
    expect(score.passed).toBe(false);
  });

  it('marks a stroke that stopped halfway as poorly covered', () => {
    const score = scoreTracing([TARGET[0]], [line([20, 20], [50, 20])]);

    // The pen never left the line, so nothing strayed — but half the letter
    // is missing, and that is what has to show up. Tolerance credits the
    // stretch just past where the pen stopped, so this lands near 0.7: the
    // reason the pass mark sits above it.
    expect(score.verdicts[0].stray).toBeLessThan(0.1);
    expect(score.verdicts[0].coverage).toBeLessThan(0.75);
    expect(score.passed).toBe(false);
  });

  it('reports a stroke drawn end to start', () => {
    const score = scoreTracing([TARGET[0]], [line([80, 20], [20, 20])]);

    expect(score.verdicts[0].reversed).toBe(true);
    expect(score.verdicts[0].coverage).toBeGreaterThan(0.95);
    expect(describeScore(score)).toMatch(/wrong way/);
  });

  it('reports a stroke that was never drawn', () => {
    const score = scoreTracing(TARGET, [line([20, 20], [80, 20])]);

    expect(score.verdicts[1].missing).toBe(true);
    expect(score.strokeCountMatches).toBe(false);
    expect(score.passed).toBe(false);
    expect(describeScore(score)).toBe('One stroke is missing.');
  });

  it('notices the right strokes made in the wrong order', () => {
    const score = scoreTracing(TARGET, [
      line([80, 20], [80, 80]),
      line([20, 20], [80, 20]),
    ]);

    expect(score.orderCorrect).toBe(false);
    expect(describeScore(score)).toMatch(/not in that order/);
  });

  it('penalises spurious extra strokes', () => {
    const faithful = [line([20, 20], [80, 20]), line([80, 20], [80, 80])];
    const clean = scoreTracing(TARGET, faithful);
    const messy = scoreTracing(TARGET, [...faithful, line([10, 90], [40, 95])]);

    expect(messy.accuracy).toBeLessThan(clean.accuracy);
    expect(messy.strokeCountMatches).toBe(false);
  });

  it('scores an empty attempt at zero rather than crashing', () => {
    const score = scoreTracing(TARGET, []);

    expect(score.accuracy).toBe(0);
    expect(score.passed).toBe(false);
    expect(score.verdicts.every((verdict) => verdict.missing)).toBe(true);
  });
});
