import { useEffect, useState } from 'react';
import type { StudySession } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { db } from '../services/database/db';
import { accuracy, statusFor, STATUS_LABELS } from '../features/review/mastery';
import ScreenHeader from '../components/controls/ScreenHeader';

export default function StatsScreen() {
  const settings = useSettings((s) => s.settings);
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

  const heCorrect = sum((p) => p.hebrew.correct);
  const heWrong = sum((p) => p.hebrew.incorrect);
  const arCorrect = sum((p) => p.arabic.correct);
  const arWrong = sum((p) => p.arabic.incorrect);
  const bothCorrect = sum((p) => p.bothCorrectCount);
  const answered = sessions.reduce((n, s) => n + s.answers.length, 0);

  const perfectRuns = Object.values(deckProgress).reduce(
    (n, d) => n + d.perfectRunsCompleted, 0);
  const hardFailures = Object.values(deckProgress).reduce(
    (n, d) => n + d.hardModeFailures, 0);

  const studyDays = new Set(
    sessions.flatMap((s) => s.answers.map((a) => a.at.slice(0, 10))),
  );

  const pct = (correct: number, wrong: number) =>
    correct + wrong === 0 ? 0 : Math.round((correct / (correct + wrong)) * 100);

  const hardestCategories = categories
    .map((category) => {
      const owned = cards.filter((c) => c.categoryId === category.id);
      const stats = owned.map((c) => cardProgress[c.id]).filter(Boolean);
      const wrong = stats.reduce(
        (n, p) => n + p!.hebrew.incorrect + p!.arabic.incorrect, 0);
      return { category, wrong, studied: stats.length };
    })
    .filter((row) => row.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 5);

  const mostMissed = cards
    .map((card) => ({ card, p: cardProgress[card.id] }))
    .filter((row) => row.p)
    .sort(
      (a, b) =>
        b.p!.hebrew.incorrect + b.p!.arabic.incorrect -
        (a.p!.hebrew.incorrect + a.p!.arabic.incorrect),
    )
    .filter((row) => row.p!.hebrew.incorrect + row.p!.arabic.incorrect > 0)
    .slice(0, 8);

  return (
    <div className="screen">
      <ScreenHeader title="Statistics" eyebrow="All local, never uploaded" />

      <div className="tile-grid">
        <div className="tile">
          <span className="eyebrow">Hebrew accuracy</span>
          <span className="value">{pct(heCorrect, heWrong)}%</span>
          <span className="small muted">{heCorrect} right · {heWrong} wrong</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Arabic accuracy</span>
          <span className="value">{pct(arCorrect, arWrong)}%</span>
          <span className="small muted">{arCorrect} right · {arWrong} wrong</span>
        </div>
        <div className="tile">
          <span className="eyebrow">Both correct</span>
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
                <span className="icon" aria-hidden="true">{category.icon}</span>
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
            {mostMissed.map(({ card, p }) => (
              <div className="list-item" key={card.id}>
                <span className="grow english">
                  <strong>{card.english}</strong>
                  <div className="small muted">
                    Hebrew {p!.hebrew.correct}/{p!.hebrew.correct + p!.hebrew.incorrect}{' '}
                    ({Math.round(accuracy(p!.hebrew) * 100)}%) · Arabic{' '}
                    {p!.arabic.correct}/{p!.arabic.correct + p!.arabic.incorrect}{' '}
                    ({Math.round(accuracy(p!.arabic) * 100)}%)
                  </div>
                </span>
                <span className="chip">
                  {STATUS_LABELS[statusFor(p, now, settings.enableMasteryDecay)]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="empty"><p>Study a deck and the numbers will appear here.</p></div>
      )}
    </div>
  );
}
