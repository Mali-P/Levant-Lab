import { useCallback, useRef, useState } from 'react';
import type { Flashcard, Language, SpeechPerspective } from '../../types';
import DeckOrdering from './DeckOrdering';

/** What one language's column came to. */
export type OrderingResult = { solved: boolean; slips: number };

type Props = {
  /** The deck in its own order, which for a sequenced deck is the answer. */
  cards: Flashcard[];
  perspectives?: readonly SpeechPerspective[];
  lead: 'feminine' | 'masculine';
  showTransliteration: boolean;
  reducedMotion: boolean;
  /** Sounded on each submission, in either column. */
  onFeedback: (kind: 'accept' | 'reject') => void;
  /** One language finished, the moment it finishes. Called once per column. */
  onLanguageDone?: (language: Language, result: OrderingResult) => void;
  /** Both columns finished and the learner has asked to move on. */
  onDone: (summary: {
    solved: boolean;
    slips: number;
    byLanguage: Record<Language, OrderingResult>;
  }) => void;
  /** What the button underneath says once both columns are in. */
  doneLabel: string;
};

const LANGUAGES: readonly Language[] = ['hebrew', 'arabic'];

/**
 * The same deck put in order twice, side by side.
 *
 * Counting in Hebrew and counting in Arabic are two separate things to know, so
 * they are two separate columns and neither one's state touches the other's:
 * each is jumbled on its own, arranged on its own, submitted on its own and
 * scored on its own. What has changed is only that they are both on the screen
 * at once. Asked one after the other, the second column arrived after the first
 * had been taken away, and the sequence she had just finished proving she knew
 * was the one thing she could no longer look at.
 *
 * They are deliberately not locked together. She can finish Hebrew and leave
 * Arabic half-arranged, or work them a row at a time in parallel; the screen
 * only asks for both before it lets her move on.
 *
 * Side by side is what the narrow board buys. A column is as wide as its
 * longest word and no wider, so two of them fit across a phone — and where they
 * do not, they wrap and the drill still works, which is why this is a wrapping
 * row rather than two fixed halves.
 */
export default function DeckOrderingPair({
  cards,
  perspectives,
  lead,
  showTransliteration,
  reducedMotion,
  onFeedback,
  onLanguageDone,
  onDone,
  doneLabel,
}: Props) {
  const [results, setResults] = useState<
    Partial<Record<Language, OrderingResult>>
  >({});

  // Ticked over by the one Submit. Both columns watch it and hand in whatever
  // round they are on; a column already settled ignores it.
  const [submitSignal, setSubmitSignal] = useState(0);

  const report = useCallback(
    (language: Language, result: OrderingResult) => {
      setResults((current) =>
        current[language] ? current : { ...current, [language]: result },
      );
      onLanguageDone?.(language, result);
    },
    [onLanguageDone],
  );

  /**
   * One press, one sound.
   *
   * Both columns are graded by the same press, so two verdicts arrive in the
   * same commit and sounding both would give her a chord to interpret. They are
   * gathered and sounded once on the microtask after, and a column handed back
   * outranks a column accepted: what she needs to hear is that there is still
   * something to do.
   */
  const pending = useRef<'accept' | 'reject' | null>(null);
  const relayFeedback = useCallback(
    (kind: 'accept' | 'reject') => {
      if (pending.current !== null) {
        if (kind === 'reject') pending.current = 'reject';
        return;
      }
      pending.current = kind;
      queueMicrotask(() => {
        const sound = pending.current;
        pending.current = null;
        if (sound) onFeedback(sound);
      });
    },
    [onFeedback],
  );

  const hebrew = results.hebrew;
  const arabic = results.arabic;
  const both = hebrew && arabic;

  return (
    <>
      {/* The two columns and their button are one object, sized to the columns
          rather than to the screen. */}
      <div className="order-pair-shell">
        <div className="order-pair">
          {LANGUAGES.map((language) => (
            <div className="order-column" key={language}>
              <DeckOrdering
                cards={cards}
                language={language}
                perspectives={perspectives}
                lead={lead}
                showTransliteration={showTransliteration}
                reducedMotion={reducedMotion}
                onFeedback={relayFeedback}
                // No `doneLabel`: the column reports itself finished, and this
                // screen owns the single button that leaves both of them.
                onDone={(result) => report(language, result)}
                submitSignal={submitSignal}
              />
            </div>
          ))}
        </div>

        {/* One button for the screen, not one per column. What she arranges is
            both columns at once, and a Submit under each half asked her to hand
            in the Hebrew as a finished thing while the Arabic beside it was
            still in pieces. It stays until both columns have settled, so a
            column already right simply ignores the presses the other needs. */}
        {!both && (
          <button
            className="btn btn-primary order-submit"
            onClick={() => setSubmitSignal((n) => n + 1)}
          >
            Submit
          </button>
        )}
      </div>

      {both && (
        <div className="panel verdict-panel">
          <strong>
            {hebrew.solved && arabic.solved ? 'Both in order' : 'That is how they run'}
          </strong>
          <div className="small muted">
            {hebrew.solved && arabic.solved
              ? 'Both columns, in the order they are counted in.'
              : 'One of them was shown rather than worked out. Read it through before you go.'}
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() =>
              onDone({
                solved: hebrew.solved && arabic.solved,
                slips: hebrew.slips + arabic.slips,
                byLanguage: { hebrew, arabic },
              })
            }
          >
            {doneLabel}
          </button>
        </div>
      )}
    </>
  );
}
