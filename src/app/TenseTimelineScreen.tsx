import { Link, useNavigate } from 'react-router-dom';
import type { Language } from '../types';
import { TENSE_TRIADS, type TenseTriad } from '../constants/pastfuture';
import type { SeedCard, SeedSide } from '../constants/seed';
import { useSettings } from '../stores/settingsStore';
import { useData } from '../stores/dataStore';
import { contrastCategory, lessonsOf } from '../features/pastfuture/pastfuture';
import { wordForms } from '../utils/wordForms';
import ScreenHeader from '../components/controls/ScreenHeader';
import Transliteration from '../components/cards/Transliteration';
import Icon from '../components/ornament/Icon';
import { EngravedDivider } from '../components/ornament/Ornament';

/**
 * The timeline: one idea at a time, in its three times, laid left to right.
 *
 * The level's picture rather than another drill. Nothing here is scored and
 * nothing is hidden — the whole value is that "I went / I go / I will go" sit
 * on one line with the same English verb over them, so what changed is visibly
 * the time and nothing else. The practise links at the foot hand over to the
 * ordinary decks, which teach these very cards.
 *
 * Read straight off `TENSE_TRIADS` rather than off the installed cards. The
 * three times of one verb live in three different decks once installed, and
 * nothing on a deck row says which three lines belong to one idea; the authored
 * structure is the only place that knows, and it is the same structure the
 * decks were built from, so the two cannot drift.
 */
const COLUMNS: { key: keyof Omit<TenseTriad, 'idea'>; label: string; when: string }[] = [
  { key: 'past', label: 'Before', when: 'yesterday' },
  { key: 'present', label: 'Now', when: 'today' },
  { key: 'future', label: 'Later', when: 'tomorrow' },
];

export default function TenseTimelineScreen() {
  const navigate = useNavigate();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const languages = useSettings((s) => s.languages);

  const contrast = contrastCategory(categories);
  const lessons = contrast
    ? lessonsOf(decks.filter((deck) => deck.categoryId === contrast.id))
    : [];

  return (
    <div className="screen">
      <ScreenHeader
        title="Before, now and later"
        eyebrow="The same idea, moved along the line"
        back
        onBack={() => navigate('/pastfuture')}
      />

      <div className="timeline-rule" aria-hidden="true">
        <span className="timeline-end">PAST</span>
        <span className="timeline-arrow">&#8592;</span>
        <span className="timeline-now">NOW</span>
        <span className="timeline-arrow">&#8594;</span>
        <span className="timeline-end">FUTURE</span>
      </div>

      <p className="small muted">
        Ten verbs you already use, each said three times over. Read across a row
        rather than down a column: the English changes by one word, and so does
        each language. Nothing here is scored.
      </p>

      <div className="stack">
        {TENSE_TRIADS.map((triad) => (
          <TriadRow key={triad.idea} triad={triad} languages={languages} />
        ))}
      </div>

      {lessons.length > 0 && (
        <>
          <EngravedDivider />
          <div className="eyebrow">Practise it</div>
          <p className="small muted">
            The same ten verbs dealt one time at a time, so the shape of each
            one comes clear before the next.
          </p>
          <div className="list">
            {lessons.map((lesson) => {
              const way = lesson.hebrew ?? lesson.decks[0];
              if (!way) return null;
              return (
                <Link
                  className="list-item"
                  key={lesson.key}
                  to={'/pastfuture/lesson/' + way.id}
                >
                  <span className="grow">
                    <strong>{lesson.name}</strong>
                  </span>
                  <Icon name="forward" className="chevron" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** One verb across its three times. */
function TriadRow({
  triad,
  languages,
}: {
  triad: TenseTriad;
  languages: readonly Language[];
}) {
  return (
    <section className="panel">
      <div className="eyebrow">{triad.idea}</div>
      <div className="timeline-row">
        {COLUMNS.map((column) => (
          <div className="timeline-cell" key={column.key}>
            <div className="timeline-cell-head">
              <strong>{column.label}</strong>
              <span className="small muted">{column.when}</span>
            </div>
            <div className="english">{triad[column.key].english}</div>
            {languages.map((language) => (
              <TriadSide
                key={language}
                card={triad[column.key]}
                language={language}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One language of one cell.
 *
 * An authored side rather than a stored one, so it is narrowed to the learner's
 * perspectives by the same `wordForms` every other surface reads through — a
 * `SeedSide` carries exactly the fields that function needs.
 */
function TriadSide({ card, language }: { card: SeedCard; language: Language }) {
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const showTransliteration = useSettings((s) => s.settings.showTransliteration);

  const side: SeedSide = language === 'hebrew' ? card.hebrew : card.arabic;
  if (!side.script) return null;

  return (
    <div className="stack" style={{ gap: 2 }}>
      {wordForms(side, perspectives, lead).map((form) => (
        <div key={form.key}>
          {form.marker && (
            <span className="form-marker" aria-label={form.label}>
              {form.marker}
            </span>
          )}{' '}
          <span className={language}>{form.script}</span>
          {showTransliteration && form.transliteration && (
            <Transliteration
              block
              text={form.transliteration}
              language={language}
            />
          )}
        </div>
      ))}
    </div>
  );
}
