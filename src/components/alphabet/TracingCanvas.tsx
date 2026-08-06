import { useCallback, useEffect, useRef, useState } from 'react';
import type { AlphabetScript, StrokeSequence } from '../../types/alphabet';
import {
  describeScore,
  scoreTracing,
  type Point,
  type Polyline,
  type TracingScore,
} from '../../features/alphabet/tracing';

/**
 * The writing surface.
 *
 * Two honest states, decided by whether a stroke sequence has been drawn for
 * this letter:
 *
 * - With a sequence, the guide shows the strokes in order and the attempt is
 *   measured against them.
 * - Without one, the learner traces the printed glyph itself and judges the
 *   result. No stroke order is invented, and no number is put on an attempt
 *   the app cannot actually measure — a fabricated 82% would be worse than an
 *   honest "did that look right?".
 */

/** Everything is authored on a 100x100 square; the SVG scales it. */
const VIEWBOX = 100;

type GuideProps = {
  sequence: StrokeSequence;
  /** Draw only the first n strokes. Used to walk the sequence step by step. */
  upTo?: number;
  /** Numbered dots at each stroke's starting point. */
  showStarts?: boolean;
  className?: string;
};

/**
 * The demonstration: the strokes of a letter, in order, with their starting
 * points marked. Shown on the letter page and underneath the tracing surface.
 */
export function StrokeGuide({
  sequence,
  upTo,
  showStarts = true,
  className,
}: GuideProps) {
  const strokes = sequence.strokes.slice(0, upTo ?? sequence.strokes.length);
  const box = sequence.viewBox || VIEWBOX;

  return (
    <svg
      className={'stroke-guide' + (className ? ' ' + className : '')}
      viewBox={'0 0 ' + box + ' ' + box}
      role="img"
      aria-label={'Stroke order, ' + sequence.strokes.length + ' strokes'}
    >
      {strokes.map((stroke, index) => (
        <path key={index} className="stroke-guide-path" d={stroke.d} />
      ))}
      {showStarts &&
        strokes.map((stroke, index) => (
          <g key={'start-' + index} className="stroke-guide-start">
            <circle cx={stroke.start[0]} cy={stroke.start[1]} r={6} />
            <text x={stroke.start[0]} y={stroke.start[1] + 2.5}>
              {index + 1}
            </text>
          </g>
        ))}
    </svg>
  );
}

export type TracingResult = {
  /** Whether the attempt counts as a hit for `writingAccuracy`. */
  passed: boolean;
  /** One sentence for the learner. */
  message: string;
  /** Absent when there was no sequence to measure against. */
  score?: TracingScore;
  /** True when the learner marked their own work. */
  selfAssessed: boolean;
};

type Props = {
  script: AlphabetScript;
  /** Shown faintly behind the pen when there is no stroke sequence to follow. */
  glyph: string;
  sequence?: StrokeSequence;
  /** `trace` shows the shape to follow; `free` hides it until the attempt is judged. */
  mode: 'trace' | 'free';
  /** Changing this clears the canvas — pass the letter id. */
  resetKey: string;
  onResult: (result: TracingResult) => void;
};

export default function TracingCanvas({
  script,
  glyph,
  sequence,
  mode,
  resetKey,
  onResult,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const targetRefs = useRef<Array<SVGPathElement | null>>([]);
  const [strokes, setStrokes] = useState<Polyline[]>([]);
  const [drawing, setDrawing] = useState<Polyline | null>(null);
  const [judged, setJudged] = useState<TracingResult | null>(null);

  const box = sequence?.viewBox || VIEWBOX;

  useEffect(() => {
    setStrokes([]);
    setDrawing(null);
    setJudged(null);
  }, [resetKey, mode]);

  /** Pointer position in viewBox units, whatever size the surface is on screen. */
  const toBox = useCallback(
    (event: React.PointerEvent): Point => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      return {
        x: ((event.clientX - rect.left) / rect.width) * box,
        y: ((event.clientY - rect.top) / rect.height) * box,
      };
    },
    [box],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (judged) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing([toBox(event)]);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drawing) return;
    const point = toBox(event);
    setDrawing((current) => (current ? [...current, point] : [point]));
  };

  const endStroke = () => {
    if (!drawing) return;
    // A tap is not a stroke. Dropping it keeps a stray finger from counting as
    // an extra stroke against the attempt.
    if (drawing.length > 2) setStrokes((current) => [...current, drawing]);
    setDrawing(null);
  };

  const clear = () => {
    setStrokes([]);
    setDrawing(null);
    setJudged(null);
  };

  const undo = () => {
    setStrokes((current) => current.slice(0, -1));
    setJudged(null);
  };

  /**
   * Flattens the target paths into polylines.
   *
   * This is the one step that needs the DOM: the browser already knows how to
   * walk an SVG path, and reimplementing curve maths to avoid it would be a
   * second source of truth for the same shape.
   */
  const targetPolylines = useCallback((): Polyline[] => {
    const lines: Polyline[] = [];
    for (const path of targetRefs.current) {
      if (!path || typeof path.getTotalLength !== 'function') return [];
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length === 0) return [];
      const steps = 40;
      const line: Polyline = [];
      for (let i = 0; i <= steps; i++) {
        const point = path.getPointAtLength((length * i) / steps);
        line.push({ x: point.x, y: point.y });
      }
      lines.push(line);
    }
    return lines;
  }, []);

  const check = () => {
    const target = sequence ? targetPolylines() : [];
    if (target.length === 0) return;

    const score = scoreTracing(target, strokes);
    const result: TracingResult = {
      passed: score.passed,
      message: describeScore(score),
      score,
      selfAssessed: false,
    };
    setJudged(result);
    onResult(result);
  };

  const selfAssess = (passed: boolean) => {
    const result: TracingResult = {
      passed,
      message: passed ? 'Marked as right.' : 'Marked as needing another go.',
      selfAssessed: true,
    };
    setJudged(result);
    onResult(result);
  };

  const hasInk = strokes.length > 0;
  // In free mode the shape is withheld until the attempt is over: showing it
  // would make writing from memory a tracing exercise with extra steps.
  const showTarget = mode === 'trace' || Boolean(judged);

  return (
    <div className="tracing">
      <div className="tracing-surface">
        <svg
          ref={svgRef}
          className="tracing-canvas"
          viewBox={'0 0 ' + box + ' ' + box}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          // The browser would otherwise scroll the page under the pen.
          style={{ touchAction: 'none' }}
          role="application"
          aria-label={
            mode === 'trace' ? 'Trace the letter here' : 'Write the letter here'
          }
        >
          <rect className="tracing-grid" x="0" y="0" width={box} height={box} />
          <line
            className="tracing-guide-line"
            x1="0"
            y1={box / 2}
            x2={box}
            y2={box / 2}
          />
          <line
            className="tracing-guide-line"
            x1={box / 2}
            y1="0"
            x2={box / 2}
            y2={box}
          />

          {showTarget && !sequence && (
            <text
              className={'tracing-ghost ' + script}
              x={box / 2}
              y={box / 2}
              dominantBaseline="central"
              textAnchor="middle"
              aria-hidden="true"
            >
              {glyph}
            </text>
          )}

          {sequence?.strokes.map((stroke, index) => (
            <path
              key={index}
              ref={(node) => {
                targetRefs.current[index] = node;
              }}
              className={'tracing-target' + (showTarget ? '' : ' hidden')}
              d={stroke.d}
            />
          ))}

          {[...strokes, ...(drawing ? [drawing] : [])].map((line, index) => (
            <polyline
              key={index}
              className="tracing-ink"
              points={line.map((p) => p.x + ',' + p.y).join(' ')}
            />
          ))}
        </svg>
      </div>

      {sequence && showTarget && (
        <p className="small muted">
          {sequence.strokes.length} strokes. Start each one at its numbered dot.
        </p>
      )}
      {!sequence && (
        <p className="small muted">
          No stroke sequence has been drawn for this letter yet, so the attempt
          is yours to judge — trace the shape, then say whether it came out
          right.
        </p>
      )}

      <div className="row">
        <button className="btn" onClick={undo} disabled={!hasInk || Boolean(judged)}>
          Undo stroke
        </button>
        <button className="btn" onClick={clear} disabled={!hasInk && !judged}>
          Clear
        </button>
      </div>

      {judged ? (
        <div className={'panel verdict-panel ' + (judged.passed ? 'pass' : 'fail')}>
          <strong>{judged.message}</strong>
          {judged.score && (
            <div className="small muted">
              {Math.round(judged.score.accuracy * 100)}% of the shape
              {judged.score.reversedCount > 0 ? ', direction to watch' : ''}
            </div>
          )}
        </div>
      ) : sequence ? (
        <button className="btn btn-primary btn-block" onClick={check} disabled={!hasInk}>
          Check my writing
        </button>
      ) : (
        <div className="grade-grid">
          <button
            className="btn btn-primary"
            onClick={() => selfAssess(true)}
            disabled={!hasInk}
          >
            ✓ That looks right
          </button>
          <button
            className="btn btn-danger"
            onClick={() => selfAssess(false)}
            disabled={!hasInk}
          >
            ✗ Not yet
          </button>
        </div>
      )}
    </div>
  );
}
