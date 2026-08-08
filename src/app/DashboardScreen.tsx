import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StudySession } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { db } from '../services/database/db';
import { accuracy, statusFor, STATUS_LABELS } from '../features/review/mastery';
import { describeStage, isLadderSession } from '../features/study/engine';
import ThemeToggle from '../components/controls/ThemeToggle';
import Icon from '../components/ornament/Icon';
import {
  EngravedDivider,
  Wordmark,
  categoryIcon,
} from '../components/ornament/Ornament';

/**
 * The engraved mark for a category, falling back to whatever icon is stored
 * on the record — a category the learner created keeps its own.
 */
function CategoryMark({
  category,
}: {
  category?: { name: string; icon: string };
}) {
  if (!category) return null;
  const mark = categoryIcon(category.name);
  return mark ? <Icon name={mark} /> : <>{category.icon}</>;
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const settings = useSettings((s) => s.settings);
  const categories = useData((s) => s.categories);
  const decks = useData((s) => s.decks);
  const cards = useData((s) => s.cards);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);
  const [open, setOpen] = useState<StudySession | null>(null);

  useEffect(() => {
    db.sessions
      .orderBy('updatedAt')
      .reverse()
      // A one-card drill is not a place to be sent back to, so it never takes
      // over the Continue panel from the deck the learner was actually in.
      // A row from before the ladder has no stage to be sent back to either.
      .filter((s) => !s.completedAt && !s.drill && isLadderSession(s))
      .first()
      .then((s) => setOpen(s ?? null));
  }, []);

  const now = new Date().toISOString();
  const progressList = Object.values(cardProgress);

  const hebrewCorrect = progressList.reduce((n, p) => n + p.hebrew.correct, 0);
  const hebrewTotal = progressList.reduce(
    (n, p) => n + p.hebrew.correct + p.hebrew.incorrect, 0);
  const arabicCorrect = progressList.reduce((n, p) => n + p.arabic.correct, 0);
  const arabicTotal = progressList.reduce(
    (n, p) => n + p.arabic.correct + p.arabic.incorrect, 0);

  const hebrewPct = hebrewTotal ? Math.round((hebrewCorrect / hebrewTotal) * 100) : 0;
  const arabicPct = arabicTotal ? Math.round((arabicCorrect / arabicTotal) * 100) : 0;

  const masteredCount = cards.filter(
    (c) => statusFor(cardProgress[c.id], now, settings.enableMasteryDecay) === 'mastered',
  ).length;

  const dueDecks = decks
    .map((deck) => {
      const deckCards = cards.filter((c) => c.deckId === deck.id);
      const due = deckCards.filter((c) => {
        const status = statusFor(cardProgress[c.id], now, settings.enableMasteryDecay);
        return status === 'rusty' || status === 'needs-review' || status === 'forgotten';
      }).length;
      return { deck, due, total: deckCards.length };
    })
    .filter((d) => d.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 4);

  const weakest = cards
    .map((card) => ({ card, p: cardProgress[card.id] }))
    .filter((row) => row.p && row.p.hebrew.incorrect + row.p.arabic.incorrect > 0)
    .sort(
      (a, b) =>
        accuracy(a.p!.hebrew) + accuracy(a.p!.arabic) -
        (accuracy(b.p!.hebrew) + accuracy(b.p!.arabic)),
    )
    .slice(0, 3);

  const openDeck = open ? decks.find((d) => d.id === open.deckId) : undefined;

  return (
    <div className="screen">
      {/* The wordmark leads the app's own screen: the name, then the two
          languages it teaches, each in its own script. The greeting keeps its
          place underneath rather than competing with the brand for the
          heading slot. */}
      <header className="screen-head brand-head">
        <div className="grow">
          <Wordmark />
        </div>
        <ThemeToggle />
      </header>

      <p className="greeting muted">{greeting(new Date().getHours())}</p>

      <EngravedDivider />

      {open && openDeck && (
        <Link className="panel" to={'/study/' + openDeck.id + '?mode=' + open.mode} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="eyebrow">Continue</span>
          <strong style={{ fontSize: '1.2rem' }}>
            {openDeck.name} — {open.mode === 'normal' ? 'Normal' : open.mode === 'hard' ? 'Hard mode' : 'Brutal mode'}
          </strong>
          {/* Where she left the ladder, in the same words the study screen
              uses — "Testing 5 words", not a fraction of ten she never
              agreed to sit. */}
          <span className="small muted">{describeStage(open).label}</span>
        </Link>
      )}

      <div className="tile-grid">
        <div className="tile">
          <span className="eyebrow">Cards mastered</span>
          <span className="value">{masteredCount}</span>
          <span className="small muted">of {cards.length}</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Weakest language</span>
          <span className="value">
            {hebrewTotal + arabicTotal === 0
              ? '—'
              : hebrewPct <= arabicPct
                ? 'Hebrew'
                : 'Arabic'}
          </span>
          <span className="small muted">
            {hebrewTotal + arabicTotal === 0
              ? 'No answers yet'
              : Math.min(hebrewPct, arabicPct) + '% accuracy'}
          </span>
        </div>
      </div>

      <section className="panel">
        <span className="eyebrow">Hebrew versus Arabic</span>
        <div className="spread small">
          <span>Hebrew</span>
          <span>{hebrewPct}%</span>
        </div>
        <div className="bar he"><span style={{ width: hebrewPct + '%' }} /></div>
        <div className="spread small">
          <span>Arabic</span>
          <span>{arabicPct}%</span>
        </div>
        <div className="bar ar"><span style={{ width: arabicPct + '%' }} /></div>
      </section>

      {dueDecks.length > 0 && (
        <section className="stack">
          <span className="eyebrow">Due for review</span>
          <div className="list">
            {dueDecks.map(({ deck, due, total }) => (
              <Link className="list-item" key={deck.id} to={'/study/' + deck.id + '?mode=normal'}>
                <span className="icon" aria-hidden="true">
                  <CategoryMark
                    category={categories.find((c) => c.id === deck.categoryId)}
                  />
                </span>
                <span className="grow">
                  <strong>{deck.name}</strong>
                  <div className="small muted">{due} of {total} need review</div>
                </span>
                <Icon name="forward" className="chevron" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {weakest.length > 0 && (
        <section className="stack">
          <span className="eyebrow">Weakest cards</span>
          {/* Tapping one asks it again. A word answered wrongly is something
              to practise, not something to edit — the editor is a deliberate
              trip through Manage, never where a weak card lands you. */}
          <div className="list">
            {weakest.map(({ card, p }) => (
              <Link
                className="list-item"
                key={card.id}
                to={'/study/' + card.deckId + '?mode=normal&card=' + card.id}
              >
                <span className="grow english">
                  <strong>{card.english}</strong>
                  <div className="small muted">
                    Hebrew {Math.round(accuracy(p!.hebrew) * 100)}% · Arabic{' '}
                    {Math.round(accuracy(p!.arabic) * 100)}% ·{' '}
                    {STATUS_LABELS[statusFor(p, now, settings.enableMasteryDecay)]}
                  </div>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link className="btn btn-primary btn-block" to="/categories">
        Choose a deck
      </Link>

      {Object.keys(deckProgress).length === 0 && (
        <p className="small muted" style={{ textAlign: 'center' }}>
          Nothing studied yet. Pick a category to begin.
        </p>
      )}
    </div>
  );
}
