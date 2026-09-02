import { Link, useParams } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import {
  lessonFinished,
  lessonLines,
  lessonsOf,
  rungsMastered,
} from '../features/opinions/opinions';
import { isOpinionsCategory } from '../features/review/languagePolicy';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif } from '../components/ornament/Ornament';

/**
 * One section laid out as its lessons.
 *
 * Every lesson is open — she picks whichever thing she wants to be able to say
 * next — and each row leads to the lesson's read-through, where the lines are
 * met before any rung of them is practised. The row's preview is the lesson's
 * first and last line, which on this level is often the whole point of it: the
 * lessons that grow one opinion into an argument say so in that single row.
 */
export default function OpinionsSectionScreen() {
  const { categoryId = '' } = useParams();
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const deckProgress = useData((s) => s.deckProgress);
  const languages = useSettings((s) => s.languages);

  const category = categories.find((c) => c.id === categoryId);

  if (!category || !isOpinionsCategory(category)) {
    return (
      <div className="screen">
        <ScreenHeader title="Section not found" back />
        <div className="empty">
          <LevantMotif name="amphora" />
          <p>This Opinions &amp; Reasons section is not on this device.</p>
          <Link className="btn btn-primary" to="/opinions">
            Back to Opinions &amp; Reasons
          </Link>
        </div>
      </div>
    );
  }

  const lessons = lessonsOf(decks.filter((deck) => deck.categoryId === category.id));
  const oneLanguage = languages.length === 1;

  return (
    <div className="screen">
      <ScreenHeader title={category.name} eyebrow="Lessons" back />

      {oneLanguage && (
        <p className="small muted">
          Lessons are practised in Hebrew, then Palestinian Arabic, then both
          together, whatever the language setting says — each rung is its own
          small deck.
        </p>
      )}

      <div className="list">
        {lessons.map((entry) => {
          const lines = lessonLines(entry, cards);
          const first = lines[0]?.english;
          const last = lines[lines.length - 1]?.english;
          const finished = lessonFinished(entry, deckProgress);
          const mastered = rungsMastered(entry, deckProgress);
          const way = entry.hebrew ?? entry.decks[0];

          if (!way) return null;

          return (
            <Link
              className="list-item"
              key={entry.key}
              to={'/opinions/lesson/' + way.id}
            >
              <span className="grow">
                <strong>{entry.name}</strong>
                <div className="small muted">
                  {first && last && first !== last
                    ? '“' + first + '” → “' + last + '”'
                    : (first ?? lines.length + ' lines')}
                </div>
                <div className="small muted">
                  {lines.length} {lines.length === 1 ? 'line' : 'lines'} ·{' '}
                  {mastered} of {entry.decks.length} rungs mastered
                </div>
              </span>
              {finished && <span className="chip chip-ok">Complete</span>}
              <Icon name="forward" className="chevron" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
