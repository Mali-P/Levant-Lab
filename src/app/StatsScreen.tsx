import { useEffect, useState } from 'react';
import type { Language, LanguageProgress, StudySession } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { db } from '../services/database/db';
import { LANGUAGE_LABEL } from '../utils/languageSelection';
import { accuracy, statusFor, STATUS_LABELS } from '../features/review/mastery';
import { askableLanguages, hasSideFor } from '../features/study/prompts';
import ScreenHeader from '../components/controls/ScreenHeader';
import Icon from '../components/ornament/Icon';
import { LevantMotif, categoryIcon } from '../components/ornament/Ornament';

/** The engraved mark for a category, falling back to its stored icon. */
function CategoryMark({ category }: { category: { name: string; icon: string } }) {
  const mark = categoryIcon(category.name);
  return mark ? <Icon name={mark} /> : <>{category.icon}</>;
}

export default function StatsScreen() {
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const cards = useData((s) => s.cards);
  const categories = useData((s) => s.categories);
  const cardProgress = useData((s) => s.cardProgress);
  const deckProgress = useData((s) => s.deckProgress);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    db.sessions.toArray().then(setSessions);
  }, []);

  const now = new Date().toISOString();
  const rows = Object.values(cardProgress);

  const sum = (pick: (p: (typeof rows)[number]) => number) =>
    rows.reduce((n, p) => n + pick(p), 0);

  // Per-language figures are taken card by card, so a word with no Hebrew on it
  // cannot pull the Hebrew accuracy down with answers it was never able to get
  // right. Everything not split by language still comes straight off the rows.
  const scored = cards
    .map((card) => ({ card, p: cardProgress[card.id] }))
    .filter((row) => Boolean(row.p));

  const sideSum = (
    language: Language,
    pick: (side: LanguageProgress) => number,
  ) =>
    scored.reduce(
      (n, row) => (hasSideFor(row.card, language) ? n + pick(row.p![language]) : n),
      0,
    );

  const heCorrect = sideSum('hebrew', (s) => s.correct);
  const heWrong = sideSum('hebrew', (s) => s.incorrect);
  const arCorrect = sideSum('arabic', (s) => s.correct);
  const arWrong = sideSum('arabic', (s) => s.incorrect);
  const bothCorrect = sum((p) => p.bothCorrectCount);
  const answered = sessions.reduce((n, s) => n + s.answers.length, 0);

  const perfectRuns = Object.values(deckProgress).reduce(
    (n, d) => n + d.perfectRunsCompleted, 0);
  const hardFailures = Object.values(deckProgress).reduce(
    (n, d) => n + d.hardModeFailures, 0);

  const studyDays = new Set(
    sessions.flatMap((s) => s.answers.map((a) => a.at.slice(0, 10))),
  );

  // Wrong answers in the languages she is studying. A card missed only in the
  // language she has switched off is not a card she is getting wrong — and nor
  // is one whose misses were all recorded against a half it never carried.
  const misses = (
    p: (typeof rows)[number],
    on: readonly Language[] = languages,
  ) => on.reduce((n, language) => n + p[language].incorrect, 0);

  const pct = (correct: number, wrong: number) =>
    correct + wrong === 0 ? 0 : Math.round((correct / (correct + wrong)) * 100);

  const hardestCategories = categories
    .map((category) => {
      const owned = scored.filter((row) => row.card.categoryId === category.id);
      const wrong = owned.reduce(
        (n, row) => n + misses(row.p!, askableLanguages(row.card, languages)),
        0,
      );
      return { category, wrong, studied: owned.length };
    })
    .filter((row) => row.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 5);

  // Deliberately still a lifetime tally — this list is headed "most frequently
  // missed", and that is a question about her record, not about where a card
  // stands today. The weakest list on the home screen answers the other one.
  const mostMissed = scored
    .map((row) => ({ ...row, on: askableLanguages(row.card, languages) }))
    .sort((a, b) => misses(b.p!) - misses(a.p!))
    .filter((row) => misses(row.p!) > 0)
    .slice(0, 8);

  return (
    <div className="screen">
      <ScreenHeader title="Statistics" eyebrow="All local, never uploaded" />

      <div className="tile-grid">
        {/* One tile per language studied. The other language's figures are
            still on the rows underneath — they are simply not hers today, and
            printing "Arabic 0%" for a language nobody has asked her about
            would read as a failure rather than as an absence. */}
        {languages.includes('hebrew') && (
          <div className="tile">
            <span className="eyebrow">Hebrew accuracy</span>
            <span className="value">{pct(heCorrect, heWrong)}%</span>
            <span className="small muted">{heCorrect} right · {heWrong} wrong</span>
          </div>
        )}
        {languages.includes('arabic') && (
          <div className="tile">
            <span className="eyebrow">Arabic accuracy</span>
            <span className="value">{pct(arCorrect, arWrong)}%</span>
            <span className="small muted">{arCorrect} right · {arWrong} wrong</span>
          </div>
        )}
        <div className="tile">
          <span className="eyebrow">
            {languages.length > 1 ? 'Both correct' : 'Cards correct'}
          </span>
          <span className="value">{bothCorrect}</span>
          <span className="small muted">of {answered} answers</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Perfect runs</span>
          <span className="value">{perfectRuns}</span>
          <span className="small muted">{hardFailures} runs failed</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Sessions</span>
          <span className="value">{sessions.length}</span>
          <span className="small muted">{studyDays.size} days studied</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Cards tracked</span>
          <span className="value">{rows.length}</span>
          <span className="small muted">of {cards.length}</span>
        </div>
      </div>

      {hardestCategories.length > 0 && (
        <section className="stack">
          <span className="eyebrow">Most difficult categories</span>
          <div className="list">
            {hardestCategories.map(({ category, wrong }) => (
              <div className="list-item" key={category.id}>
                <span className="icon" aria-hidden="true">
                  <CategoryMark category={category} />
                </span>
                <span className="grow"><strong>{category.name}</strong></span>
                <span className="chip chip-bad">{wrong} wrong</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {mostMissed.length > 0 && (
        <section className="stack">
          <span className="eyebrow">Most frequently missed</span>
          <div className="list">
            {mostMissed.map(({ card, p, on }) => (
              <div className="list-item" key={card.id}>
                <span className="grow english">
                  <strong>{card.english}</strong>
                  {/* Only the halves the card has. A "Hebrew 0/6 (0%)" against
                      a word with no Hebrew on it described the app's own gap,
                      not hers. */}
                  <div className="small muted">
                    {on
                      .map(
                        (language) =>
                          LANGUAGE_LABEL[language] +
                          ' ' +
                          p![language].correct +
                          '/' +
                          (p![language].correct + p![language].incorrect) +
                          ' (' +
                          Math.round(accuracy(p![language]) * 100) +
                          '%)',
                      )
                      .join(' · ')}
                  </div>
                </span>
                <span className="chip">
                  {STATUS_LABELS[statusFor(p, now, settings.enableMasteryDecay, on)]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="empty">
          <LevantMotif name="rosette" />
          <p>Practise a deck and the numbers will appear here.</p>
        </div>
      )}
    </div>
  );
}
