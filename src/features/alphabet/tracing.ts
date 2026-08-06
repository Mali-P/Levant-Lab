/**
 * Scoring a traced letter against the sequence it was meant to follow.
 *
 * Pure geometry over polylines in the authored 100x100 viewBox, so it can be
 * tested without a browser. The caller flattens the target's SVG paths into
 * polylines first — that is the one step that genuinely needs the DOM, and
 * keeping it outside means the rules below are testable with hand-written
 * coordinates.
 *
 * What it judges, in the order a teacher would: did the pen cover the shape,
 * did it stay on it, did the strokes go the right way, and were they made in
 * the right order. Nothing here guesses at a target that was not supplied —
 * where a letter ships no stroke sequence, the writing screen self-assesses
 * instead of pretending to measure.
 */

export type Point = { x: number; y: number };
export type Polyline = Point[];

/** How far off the line a pen may stray, in viewBox units, and still count. */
export const DEFAULT_TOLERANCE = 12;

/** Sample points per stroke. Enough to catch a skipped middle at this size. */
const SAMPLES = 40;

/**
 * At or above this the attempt is accepted and the skill scores a hit.
 *
 * Set above the coverage a half-drawn stroke earns. Tolerance reaches
 * `DEFAULT_TOLERANCE` past wherever the pen stopped, so a learner who traced
 * only the first half of a stroke still scores around 0.7 — high enough to
 * pass a laxer bar, and plainly not the letter.
 */
export const PASS_THRESHOLD = 0.8;

export type StrokeVerdict = {
  /** Which target stroke this attempt was compared against. */
  targetIndex: number;
  /** Fraction of the target covered by the pen, 0-1. */
  coverage: number;
  /** Fraction of the pen's travel that was nowhere near the target, 0-1. */
  stray: number;
  /** Drawn end to start. Worth telling the learner: direction is the lesson. */
  reversed: boolean;
  /** Nothing was drawn for this stroke at all. */
  missing: boolean;
};

export type TracingScore = {
  /** Overall 0-1: coverage, less what strayed, less the ordering penalties. */
  accuracy: number;
  strokeCountMatches: boolean;
  /** True when each drawn stroke's nearest target is the one in that position. */
  orderCorrect: boolean;
  reversedCount: number;
  verdicts: StrokeVerdict[];
  passed: boolean;
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Length of a polyline, in viewBox units. */
export function polylineLength(line: Polyline): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distance(line[i - 1], line[i]);
  return total;
}

/** Shortest distance from a point to a line segment. */
function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(p, a);
  // Projection of p onto the segment, clamped to its ends.
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Shortest distance from a point to any part of a polyline. */
export function pointToPolyline(p: Point, line: Polyline): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return distance(p, line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = pointToSegment(p, line[i - 1], line[i]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Evenly spaced points along a polyline.
 *
 * Needed because a pen moving slowly leaves a dense clump of samples and a
 * fast one leaves a sparse trail; comparing raw pointer events would score
 * hesitation rather than accuracy.
 */
export function resample(line: Polyline, count = SAMPLES): Polyline {
  if (line.length === 0) return [];
  if (line.length === 1 || count <= 1) return [line[0]];

  const total = polylineLength(line);
  if (total === 0) return Array.from({ length: count }, () => line[0]);

  const step = total / (count - 1);
  const out: Polyline = [line[0]];
  let segment = 1;
  let walked = 0;

  for (let i = 1; i < count - 1; i++) {
    const target = step * i;
    while (segment < line.length) {
      const segLength = distance(line[segment - 1], line[segment]);
      if (walked + segLength >= target || segment === line.length - 1) {
        const t = segLength === 0 ? 0 : (target - walked) / segLength;
        const a = line[segment - 1];
        const b = line[segment];
        out.push({
          x: a.x + (b.x - a.x) * Math.max(0, Math.min(1, t)),
          y: a.y + (b.y - a.y) * Math.max(0, Math.min(1, t)),
        });
        break;
      }
      walked += segLength;
      segment++;
    }
  }

  out.push(line[line.length - 1]);
  return out;
}

/** Fraction of `from`'s samples lying within `tolerance` of `to`. */
function overlap(from: Polyline, to: Polyline, tolerance: number): number {
  if (from.length === 0) return 0;
  const near = from.filter((p) => pointToPolyline(p, to) <= tolerance).length;
  return near / from.length;
}

/**
 * Which target stroke a drawn stroke is closest to, ignoring direction.
 *
 * Used only to tell "wrong order" apart from "wrong shape": a learner who drew
 * the right two strokes in the wrong order deserves a different sentence from
 * one who drew something else entirely.
 */
function nearestTarget(
  drawn: Polyline,
  targets: Polyline[],
  tolerance: number,
): number {
  let bestIndex = -1;
  let bestScore = -1;
  targets.forEach((target, index) => {
    const score = overlap(drawn, target, tolerance);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function isReversed(drawn: Polyline, target: Polyline): boolean {
  if (drawn.length < 2 || target.length < 2) return false;
  const forward =
    distance(drawn[0], target[0]) +
    distance(drawn[drawn.length - 1], target[target.length - 1]);
  const backward =
    distance(drawn[0], target[target.length - 1]) +
    distance(drawn[drawn.length - 1], target[0]);
  return backward < forward;
}

export type ScoreOptions = {
  /** In viewBox units. Widen it for a small screen, not for a lenient mark. */
  tolerance?: number;
};

/**
 * Compares an attempt with the sequence it was tracing.
 *
 * Strokes are paired by position, because the order is part of what is being
 * taught: the third stroke of the attempt is judged against the third stroke
 * of the letter, not against whichever one it happens to resemble.
 */
export function scoreTracing(
  target: Polyline[],
  drawn: Polyline[],
  opts: ScoreOptions = {},
): TracingScore {
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const targets = target.map((line) => resample(line));
  const attempts = drawn.map((line) => resample(line));

  const verdicts: StrokeVerdict[] = targets.map((targetLine, index) => {
    const attempt = attempts[index];
    if (!attempt || attempt.length === 0) {
      return {
        targetIndex: index,
        coverage: 0,
        stray: 1,
        reversed: false,
        missing: true,
      };
    }
    return {
      targetIndex: index,
      coverage: overlap(targetLine, attempt, tolerance),
      stray: 1 - overlap(attempt, targetLine, tolerance),
      reversed: isReversed(attempt, targetLine),
      missing: false,
    };
  });

  const strokeCountMatches = attempts.length === targets.length;
  const orderCorrect = attempts.every(
    (attempt, index) => nearestTarget(attempt, targets, tolerance) === index,
  );

  const perStroke = verdicts.map((v) => Math.max(0, v.coverage - v.stray));
  const base =
    perStroke.length === 0
      ? 0
      : perStroke.reduce((sum, value) => sum + value, 0) / perStroke.length;

  // Extra strokes are penalised proportionally: one spurious flick on a
  // two-stroke letter is a bigger mistake than on a six-stroke one.
  const extra = Math.max(0, attempts.length - targets.length);
  const extraPenalty =
    targets.length === 0 ? 0 : Math.min(0.5, extra / targets.length) * 0.5;
  const orderPenalty = orderCorrect ? 0 : 0.15;

  const accuracy = Math.max(0, Math.min(1, base - extraPenalty - orderPenalty));

  return {
    accuracy,
    strokeCountMatches,
    orderCorrect,
    reversedCount: verdicts.filter((v) => v.reversed).length,
    verdicts,
    // Order is not a stylistic preference here, it is the lesson: the strokes
    // of a letter are taught in a sequence because the joins depend on it. A
    // shape assembled in the wrong order is not yet a pass.
    passed:
      accuracy >= PASS_THRESHOLD &&
      orderCorrect &&
      !verdicts.some((v) => v.missing),
  };
}

/** One sentence on what went wrong, or what went right. */
export function describeScore(score: TracingScore): string {
  if (score.passed && score.reversedCount === 0) return 'That is the shape.';
  if (score.passed) {
    return score.reversedCount === 1
      ? 'The shape is right, but one stroke went the wrong way.'
      : 'The shape is right, but ' +
          score.reversedCount +
          ' strokes went the wrong way.';
  }
  const missing = score.verdicts.filter((v) => v.missing).length;
  if (missing > 0) {
    return missing === 1 ? 'One stroke is missing.' : missing + ' strokes are missing.';
  }
  if (!score.orderCorrect) return 'Every stroke is there, but not in that order.';
  if (!score.strokeCountMatches) return 'That is more strokes than the letter takes.';
  return 'Close, but the line wandered off the shape.';
}
