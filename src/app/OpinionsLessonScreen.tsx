import { Link, useParams } from 'react-router-dom';
import type { Flashcard, Language, LanguageSide } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { lessonLines, lessonsOf } from '../features/opinions/opinions';
import { addedPiece } from '../features/sentences/chains';
import {
  deckStage,
  gateCategoryDecks,
  isOpinionsCategory,
} from '../features/review/languagePolicy';
import type { DeckGate } from '../features/review/unlock';
import { wordForms } from '../utils/wordForms';
import ScreenHeader from '../components/controls/ScreenHeader';
import SpeakerButton from '../components/controls/SpeakerButton';
import CardCue from '../components/cards/CardCue';
import Transliteration from '../components/cards/Transliteration';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One lesson read before it is practised: every line in both scripts, with the
 * question it answers where it has one, and the piece each step adds marked.
 *
 * This screen is the pedagogy, exactly as the lesson view is one level down.
 * The study ladder will deal these same cards in this same order, but a learner
 * should first *see* how the opinion grows — on this level the added piece is
 * usually the reason, which is the very thing being taught — before anything is
 * scored. The practise buttons at the foot hand over to the ordinary study
 * screen, one language rung at a time.
 */
export default function OpinionsLessonScreen() {
  const { deckId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  const entry = decks.find((deck) => deck.id === deckId);
  const category = categories.find((c) => c.id === entry?.categoryId);
  const sectionDecks = category
    ? decks.filter((deck) => deck.categoryId === category.id)
    : [];
  const lesson = lessonsOf(sectionDecks).find((lot) =>
    lot.decks.some((deck) => deck.id === deckId),
  );

  if (!entry || !category || !lesson || !isOpinionsCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Lesson not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This lesson is not on this device.</p>
          <Link className="btn btn-primary" to="/opinions">
            Back to Opinions &amp; Reasons
          </Link>
        </div>
      </div>
    );
  }

  const lines = lessonLines(lesson, cards);
  // The rungs' locks, worked out by the same rule every staged lot follows:
  // Hebrew first, then Arabic, then both together.
  const gates = gateCategoryDecks(category, sectionDecks, deckProgress, languages);
  const rungGates = lesson.decks
    .map((deck) => gates.find((gate) => gate.deck.id === deck.id))
    .filter((gate): gate is DeckGate => Boolean(gate));

  const asked = lines.some((line) => line.cue);

  return (
    <div className="screen">
      <ScreenHeader title={lesson.name} eyebrow={category.name} back />

      <p className="small muted">
        {asked
          ? 'Each line answers the question above it. There is no right answer to any of them — these are the wordings, not the verdicts, and the opposite answer would have been just as correct.'
          : 'Read the lines before practising them. Where a line grows the one before it, the added words are marked — on this level they are usually the reason, which is what turns an opinion into an argument.'}
      </p>

      <div className="stack">
        {lines.map((card, index) => (
          <LessonLine
            key={card.id}
            card={card}
            index={index}
            previous={lines[index - 1]?.english}
            showTransliteration={showTransliteration}
          />
        ))}
      </div>

      <section className="panel">
        <span className="eyebrow">Practise this lesson</span>
        {rungGates.map((gate) => (
          <RungRow key={gate.deck.id} gate={gate} />
        ))}
      </section>
    </div>
  );
}

function LessonLine({
  card,
  index,
  previous,
  showTransliteration,
}: {
  card: Flashcard;
  index: number;
  previous?: string;
  showTransliteration: boolean;
}) {
  const languages = useSettings((s) => s.languages);
  const added = addedPiece(previous, card.english);
  const base = added
    ? card.english.slice(0, card.english.length - added.length).trimEnd()
    : card.english;

  return (
    <section className="panel">
      <div className="eyebrow">Line {index + 1}</div>
      {/* The question, where there is one. Rendered by the very component the
          study card uses, so what she reads here is what she meets there. */}
      <CardCue card={card} languages={languages} />
      <div className="english">
        <strong>
          {added ? (
            <>
              <span className="muted">{base}</span> <u>{added}</u>
            </>
          ) : (
            card.english
          )}
        </strong>
      </div>
      <LineSide card={card} language="hebrew" show={showTransliteration} />
      <LineSide card={card} language="arabic" show={showTransliteration} />
    </section>
  );
}

/**
 * One language of one line: every form the learner's own perspectives call for,
 * each with its script, its glossed romanisation, and its speaker.
 */
function LineSide({
  card,
  language,
  show,
}: {
  card: Flashcard;
  language: Language;
  show: boolean;
}) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const languages = useSettings((s) => s.languages);

  if (!languages.includes(language)) return null;

  const side: LanguageSide = card[language];
  if (!side.script) return null;
  const forms = wordForms(side, perspectives, lead);

  return (
    <div className="stack" style={{ gap: 4 }}>
      {forms.map((form) => (
        <div
          className="row"
          key={form.key}
          style={{ alignItems: 'baseline', gap: 8 }}
        >
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}
          <span className="grow">
            <span className={language}>{form.script}</span>
            {show && form.transliteration && (
              <Transliteration
                block
                text={form.transliteration}
                language={language}
              />
            )}
          </span>
          <SpeakerButton form={form} language={language} />
        </div>
      ))}
    </div>
  );
}

/** One rung of the lesson: its state, its runs, and the way in. */
function RungRow({ gate }: { gate: DeckGate }) {
  const stage = deckStage(gate.deck);
  const label =
    stage === 'arabic'
      ? 'Palestinian Arabic'
      : stage === 'both'
        ? 'Both together'
        : 'Hebrew';
  const before =
    gate.blockedBy && deckStage(gate.blockedBy) === 'arabic' ? 'Arabic' : 'Hebrew';

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="spread">
        <span className="row" style={{ gap: 8 }}>
          <strong>{label}</strong>
          {gate.mastered && <span className="chip chip-ok">Mastered</span>}
        </span>
        {gate.unlocked ? (
          <Link
            className="btn btn-primary btn-compact"
            to={'/study/' + gate.deck.id + '?mode=normal'}
          >
            {gate.mastered ? 'Revise' : 'Practise'}
          </Link>
        ) : (
          <span className="chip">
            <Icon name="lock" /> After {before}
          </span>
        )}
      </div>
      {!gate.mastered && gate.perfectRunsCompleted > 0 && (
        <PerfectRuns
          completed={gate.perfectRunsCompleted}
          required={gate.perfectRunsRequired}
        />
      )}
    </div>
  );
}
