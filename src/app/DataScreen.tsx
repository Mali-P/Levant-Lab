import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Flashcard, Snapshot } from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { db } from '../services/database/db';
import {
  buildBackup,
  createSnapshot,
  downloadJson,
  parseBackup,
  restoreBackup,
} from '../services/backup/backup';
import {
  archiveCards,
  installStarterCards,
  OFFICIAL_CARD_COUNT,
  retiredStarterCards,
  starterCoverage,
  type StarterCoverage,
} from '../services/database/seed';
import { previewCsvImport, type ImportPreview } from '../features/importExport/importCards';
import { toCsv, CSV_COLUMNS } from '../features/importExport/csv';
import { uid } from '../utils/random';
import ScreenHeader from '../components/controls/ScreenHeader';
import WordForms from '../components/cards/WordForms';

export default function DataScreen() {
  const load = useData((s) => s.load);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const createCategory = useData((s) => s.createCategory);
  const createDeck = useData((s) => s.createDeck);
  const createCards = useData((s) => s.createCards);
  const resetAllProgress = useData((s) => s.resetAllProgress);
  const deleteCard = useData((s) => s.deleteCard);
  const settings = useSettings((s) => s.settings);
  const loadSettings = useSettings((s) => s.load);

  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  // `null` means the leftovers panel has not been opened yet; an empty array
  // means it was checked and there is nothing to clean up.
  const [retired, setRetired] = useState<Flashcard[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [coverage, setCoverage] = useState<StarterCoverage | null>(null);

  useEffect(() => {
    void starterCoverage().then(setCoverage);
  }, [cards]);

  async function refreshStarterState() {
    const [left, cover] = await Promise.all([
      retiredStarterCards(),
      starterCoverage(),
    ]);
    setRetired(left);
    setCoverage(cover);
    setChosen(new Set());
  }

  async function exportAll() {
    downloadJson('flashcards-backup-' + Date.now() + '.json', await buildBackup());
    setMessage('Backup downloaded.');
  }

  async function exportCategory(categoryId: string) {
    const backup = await buildBackup({ categoryId });
    downloadJson('flashcards-' + categoryId + '.json', backup);
    setMessage('Exported ' + backup.cards.length + ' cards.');
  }

  function exportCsv() {
    const rows: string[][] = [[...CSV_COLUMNS]];
    for (const card of cards) {
      const deck = decks.find((d) => d.id === card.deckId);
      const category = categories.find((c) => c.id === card.categoryId);
      rows.push([
        category?.name ?? '',
        deck?.name ?? '',
        card.english,
        card.hebrew.script,
        card.hebrew.transliteration ?? '',
        card.hebrew.pronunciationText ?? '',
        card.hebrew.forms?.feminine.script ?? '',
        card.hebrew.forms?.feminine.transliteration ?? '',
        card.hebrew.forms?.masculine.script ?? '',
        card.hebrew.forms?.masculine.transliteration ?? '',
        card.arabic.script,
        card.arabic.transliteration ?? '',
        card.arabic.pronunciationText ?? '',
        card.arabic.forms?.feminine.script ?? '',
        card.arabic.forms?.feminine.transliteration ?? '',
        card.arabic.forms?.masculine.script ?? '',
        card.arabic.forms?.masculine.transliteration ?? '',
        card.arabic.dialect ?? '',
        [card.hebrew.notes, card.arabic.notes].filter(Boolean).join(' | '),
        (card.tags ?? []).join(';'),
      ]);
    }
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'flashcards.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage('Exported ' + cards.length + ' cards as CSV.');
  }

  async function onJsonFile(file: File) {
    try {
      const backup = parseBackup(await file.text());
      const mode = window.confirm(
        'Replace everything with this backup?\n\nOK replaces all data. Cancel merges it in.',
      )
        ? 'replace'
        : 'merge';
      const report = await restoreBackup(backup, mode);
      await Promise.all([load(), loadSettings()]);
      setMessage(
        'Restored ' + report.cards + ' cards, ' + report.decks + ' decks, ' +
        report.progress + ' progress records.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed.');
    }
  }

  async function commitCsvImport() {
    if (!preview) return;
    const stamp = new Date().toISOString();
    const newCards: Flashcard[] = [];

    // Categories and decks named in the file are created on demand.
    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const deckByKey = new Map(
      decks.map((d) => [d.categoryId + '|' + d.name.toLowerCase(), d]),
    );

    for (const row of preview.importable) {
      let category = categoryByName.get(row.category.toLowerCase());
      if (!category) {
        category = await createCategory(row.category, '🗂️');
        categoryByName.set(row.category.toLowerCase(), category);
      }

      const deckKey = category.id + '|' + row.deck.toLowerCase();
      let deck = deckByKey.get(deckKey);
      if (!deck) {
        deck = await createDeck(
          category.id, row.deck, settings.defaultPerfectRunsRequired,
        );
        deckByKey.set(deckKey, deck);
      }

      newCards.push({
        id: uid('card'),
        categoryId: category.id,
        deckId: deck.id,
        english: row.english,
        hebrew: {
          script: row.hebrew,
          transliteration: row.hebrewTransliteration,
          pronunciationText: row.hebrewPronunciation,
          forms: row.hebrewForms,
          notes: row.notes,
        },
        arabic: {
          script: row.arabic,
          transliteration: row.arabicTransliteration,
          pronunciationText: row.arabicPronunciation,
          forms: row.arabicForms,
          dialect: row.arabicDialect ?? 'General Levantine',
          notes: row.notes,
        },
        tags: row.tags.length ? row.tags : undefined,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }

    await createCards(newCards);
    setMessage('Imported ' + newCards.length + ' cards.');
    setPreview(null);
  }

  async function refreshSnapshots() {
    setSnapshots((await db.snapshots.orderBy('createdAt').reverse().toArray()));
  }

  return (
    <div className="screen">
      <ScreenHeader title="Data" eyebrow="Backup, import, export" back />

      {message && <div className="panel"><p className="small">{message}</p></div>}

      <section className="panel">
        <span className="eyebrow">Export</span>
        <button className="btn btn-block" onClick={exportAll}>Export everything as JSON</button>
        <button className="btn btn-block" onClick={exportCsv}>Export all cards as CSV</button>
        <label className="field">
          <span>Export one category</span>
          <select className="input" defaultValue="" onChange={(e) => {
            if (e.target.value) void exportCategory(e.target.value);
            e.target.value = '';
          }}>
            <option value="">Choose a category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </section>

      <section className="panel">
        <span className="eyebrow">Import</span>
        <label className="field">
          <span>Restore a JSON backup</span>
          <input className="input" type="file" accept="application/json,.json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onJsonFile(f); }} />
        </label>
        <label className="field">
          <span>Import cards from CSV</span>
          <input className="input" type="file" accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(previewCsvImport(await file.text()));
            }} />
          <span className="small muted">Columns: {CSV_COLUMNS.join(', ')}</span>
        </label>
      </section>

      {preview && (
        <section className="panel">
          <span className="eyebrow">Import preview</span>
          <p className="small">
            {preview.rows.length} rows read · {preview.importable.length} ready to import ·{' '}
            {preview.issues.filter((i) => i.severity === 'error').length} blocked
          </p>

          {preview.issues.length > 0 && (
            <div className="list">
              {preview.issues.slice(0, 12).map((issue, i) => (
                <div className="list-item" key={i}>
                  <span className={'chip ' + (issue.severity === 'error' ? 'chip-bad' : '')}>
                    {issue.severity === 'error' ? 'Blocked' : 'Warning'}
                  </span>
                  <span className="grow small">
                    Line {issue.line}, {issue.field}: {issue.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="list">
            {preview.importable.slice(0, 8).map((row) => (
              <div className="list-item" key={row.line}>
                <span className="grow english"><strong>{row.english}</strong></span>
                <WordForms
                  side={{ script: row.hebrew, forms: row.hebrewForms }}
                  language="hebrew"
                />
                <WordForms
                  side={{ script: row.arabic, forms: row.arabicForms }}
                  language="arabic"
                />
              </div>
            ))}
          </div>

          <div className="row">
            <button className="btn btn-primary grow" onClick={commitCsvImport}
              disabled={preview.importable.length === 0}>
              Import {preview.importable.length} cards
            </button>
            <button className="btn grow" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </section>
      )}

      <section className="panel">
        <span className="eyebrow">Local snapshots</span>
        <p className="small muted">
          A snapshot is taken automatically before any restore. Keep one before big edits too.
        </p>
        <div className="row">
          <button className="btn grow" onClick={async () => {
            await createSnapshot('Manual snapshot');
            await refreshSnapshots();
            setMessage('Snapshot saved.');
          }}>
            Take a snapshot
          </button>
          <button className="btn grow" onClick={refreshSnapshots}>Show snapshots</button>
        </div>
        <div className="list">
          {snapshots.map((snap) => (
            <div className="list-item" key={snap.id}>
              <span className="grow">
                <strong>{snap.label}</strong>
                <div className="small muted">
                  {new Date(snap.createdAt).toLocaleString()} · {snap.payload.cards.length} cards
                </div>
              </span>
              <button className="btn" onClick={async () => {
                if (!window.confirm('Replace all current data with this snapshot?')) return;
                await restoreBackup(snap.payload, 'replace');
                await Promise.all([load(), loadSettings()]);
                setMessage('Restored the snapshot.');
              }}>
                Restore
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Starter cards</span>
        <p className="small">
          This updates official starter cards, keeps your progress, adds
          missing starter cards, and does not delete your own cards.
        </p>
        <p className="small muted">
          The official set is {OFFICIAL_CARD_COUNT} cards across seventeen
          categories, each word with its feminine and masculine form in Hebrew
          and Palestinian Arabic.
          {coverage && coverage.missing > 0 && (
            <> This device has {coverage.present} of them; {coverage.missing} are
            missing.</>
          )}
          {coverage && coverage.missing === 0 && (
            <> This device has all {coverage.total}.</>
          )}
        </p>
        <button className="btn btn-block" onClick={async () => {
          await createSnapshot('Before starter card install');
          const report = await installStarterCards();
          await load();
          await refreshStarterState();
          setMessage(
            'Starter cards installed: ' + report.added + ' added, ' +
            report.updated + ' refreshed. Your progress and your own cards are ' +
            'untouched.',
          );
        }}>
          Install or refresh starter cards
        </button>
        <button className="btn btn-block" onClick={refreshStarterState}>
          Check for old starter leftovers
        </button>
      </section>

      {retired !== null && (
        <section className="panel">
          <span className="eyebrow">Old starter leftovers</span>
          {retired.length === 0 ? (
            <p className="small muted">
              Nothing to review — every card in a starter deck is part of the
              official {OFFICIAL_CARD_COUNT}.
            </p>
          ) : (
            <>
              <p className="small">
                {retired.length} card{retired.length === 1 ? '' : 's'} sit in a
                starter deck but {retired.length === 1 ? 'is' : 'are'} not in the
                official {OFFICIAL_CARD_COUNT}. These are usually words from an
                earlier starter set. Nothing here has been deleted, and nothing
                will be until you choose.
              </p>
              <p className="small muted">
                Check the list first — a word you added to a starter deck
                yourself also shows up here. Archiving moves a card to
                “Archived → Retired starter words” and keeps its progress.
              </p>

              <div className="list">
                {retired.map((card) => (
                  <label className="list-item" key={card.id}>
                    <input
                      type="checkbox"
                      checked={chosen.has(card.id)}
                      onChange={(e) => {
                        const next = new Set(chosen);
                        if (e.target.checked) next.add(card.id);
                        else next.delete(card.id);
                        setChosen(next);
                      }}
                      aria-label={'Select ' + (card.english || 'untitled card')}
                    />
                    <span className="grow english">
                      <strong>{card.english || 'Untitled card'}</strong>
                      <div className="small muted">
                        {categories.find((c) => c.id === card.categoryId)?.name} ·{' '}
                        {decks.find((d) => d.id === card.deckId)?.name}
                      </div>
                    </span>
                    <WordForms side={card.hebrew} language="hebrew" />
                    <WordForms side={card.arabic} language="arabic" />
                  </label>
                ))}
              </div>

              <div className="row">
                <button className="btn grow" onClick={() =>
                  setChosen(new Set(retired.map((c) => c.id)))
                }>
                  Select all
                </button>
                <button className="btn grow" onClick={() => setChosen(new Set())}>
                  Select none
                </button>
              </div>

              <div className="row">
                <button
                  className="btn btn-primary grow"
                  disabled={chosen.size === 0}
                  onClick={async () => {
                    await createSnapshot('Before archiving old starter words');
                    const moved = await archiveCards([...chosen]);
                    await load();
                    await refreshStarterState();
                    setMessage('Archived ' + moved + ' cards. Their progress was kept.');
                  }}
                >
                  Archive {chosen.size || ''}
                </button>
                <button
                  className="btn btn-danger grow"
                  disabled={chosen.size === 0}
                  onClick={async () => {
                    if (!window.confirm(
                      'Delete ' + chosen.size + ' cards and their progress permanently?',
                    )) return;
                    await createSnapshot('Before deleting old starter words');
                    for (const id of chosen) await deleteCard(id);
                    await load();
                    await refreshStarterState();
                    setMessage('Deleted ' + chosen.size + ' cards. A snapshot was kept above.');
                  }}
                >
                  Delete {chosen.size || ''}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="panel">
        <span className="eyebrow">Pronunciation</span>
        <p className="small muted">
          Play back every generated recording next to the word, the form and the
          voice that said it. The Arabic needs a Levantine speaker's ear before
          it counts as final.
        </p>
        <Link className="btn btn-block" to="/audio-review">
          Review pronunciation audio
        </Link>
      </section>

      <section className="panel">
        <span className="eyebrow">Destructive</span>
        <button className="btn btn-danger btn-block" onClick={async () => {
          if (!window.confirm('Erase all study progress? Cards are kept.')) return;
          await createSnapshot('Before progress reset');
          await resetAllProgress();
          setMessage('Progress reset. Your cards are untouched.');
        }}>
          Reset all progress
        </button>
        <button className="btn btn-danger btn-block" onClick={async () => {
          if (!window.confirm('Delete every card, deck and statistic on this device?')) return;
          if (!window.confirm('This cannot be undone. Export a backup first. Continue?')) return;
          await createSnapshot('Before delete all');
          await db.transaction('rw',
            [db.categories, db.decks, db.cards, db.cardProgress, db.deckProgress, db.sessions],
            async () => {
              await Promise.all([
                db.categories.clear(), db.decks.clear(), db.cards.clear(),
                db.cardProgress.clear(), db.deckProgress.clear(), db.sessions.clear(),
              ]);
            });
          await load();
          setMessage('Everything deleted. A snapshot was kept above.');
        }}>
          Delete all data
        </button>
      </section>
    </div>
  );
}
