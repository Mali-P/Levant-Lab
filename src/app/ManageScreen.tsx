import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { statusFor } from '../features/review/mastery';
import { accuracy } from '../features/review/mastery';
import { uid } from '../utils/random';
import ScreenHeader from '../components/controls/ScreenHeader';
import WordForms from '../components/cards/WordForms';
import { wordForms } from '../utils/wordForms';
import { sortCards } from '../utils/cardOrder';

type Filter =
  | 'none'
  | 'all'
  | 'arabic-weakest'
  | 'hebrew-weakest'
  | 'never-studied'
  | 'due'
  | 'most-missed'
  | 'missing-transliteration';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'none', label: 'Select…' },
  { value: 'all', label: 'All cards' },
  { value: 'arabic-weakest', label: 'Arabic weakest' },
  { value: 'hebrew-weakest', label: 'Hebrew weakest' },
  { value: 'never-studied', label: 'Never studied' },
  { value: 'due', label: 'Due for review' },
  { value: 'most-missed', label: 'Most frequently missed' },
  { value: 'missing-transliteration', label: 'Missing transliteration' },
];

export default function ManageScreen() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const cardProgress = useData((s) => s.cardProgress);
  const saveCard = useData((s) => s.saveCard);

  const [query, setQuery] = useState('');
  // Defaults to nothing: rendering every card on entry stalls the screen once
  // the collection grows into the thousands.
  const [filter, setFilter] = useState<Filter>('none');
  const [deckFilter, setDeckFilter] = useState('all');
  const now = new Date().toISOString();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    // Nothing picked and nothing narrowed down: stay empty rather than paint
    // the whole collection.
    if (filter === 'none' && !needle && deckFilter === 'all') return [];

    // Deck order first; the weakest / most-missed filters below re-sort what
    // they keep, and the rest are left reading the way the deck teaches.
    let rows = sortCards(cards).filter((card) => {
      if (deckFilter !== 'all' && card.deckId !== deckFilter) return false;
      if (!needle) return true;
      // Both gendered forms are searchable: typing the feminine word found
      // nothing while only the masculine-mirroring `script` was indexed.
      const forms = [...wordForms(card.hebrew), ...wordForms(card.arabic)];
      return [
        card.english,
        ...forms.map((f) => f.script),
        ...forms.map((f) => f.transliteration),
        card.arabic.dialect,
        ...(card.tags ?? []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    const p = (id: string) => cardProgress[id];

    switch (filter) {
      case 'arabic-weakest':
        rows = rows
          .filter((c) => p(c.id))
          .sort((a, b) => accuracy(p(a.id)!.arabic) - accuracy(p(b.id)!.arabic));
        break;
      case 'hebrew-weakest':
        rows = rows
          .filter((c) => p(c.id))
          .sort((a, b) => accuracy(p(a.id)!.hebrew) - accuracy(p(b.id)!.hebrew));
        break;
      case 'never-studied':
        rows = rows.filter((c) => !p(c.id));
        break;
      case 'due':
        rows = rows.filter((c) => {
          const status = statusFor(p(c.id), now, settings.enableMasteryDecay, languages);
          return status === 'rusty' || status === 'needs-review' || status === 'forgotten';
        });
        break;
      case 'most-missed':
        rows = rows
          .filter((c) => p(c.id))
          .sort(
            (a, b) =>
              p(b.id)!.hebrew.incorrect + p(b.id)!.arabic.incorrect -
              (p(a.id)!.hebrew.incorrect + p(a.id)!.arabic.incorrect),
          );
        break;
      case 'missing-transliteration':
        // A gendered card counts as incomplete when either form lacks its
        // transliteration, not just the masculine one `script` mirrors.
        rows = rows.filter((c) =>
          [...wordForms(c.hebrew), ...wordForms(c.arabic)].some(
            (f) => !f.transliteration,
          ),
        );
        break;
      default:
        break;
    }

    return rows;
  }, [cards, cardProgress, query, filter, deckFilter, now, settings.enableMasteryDecay]);

  async function addCard() {
    const deck = decks.find((d) => d.id === deckFilter) ?? decks[0];
    if (!deck) return;
    const id = uid('card');
    const stamp = new Date().toISOString();
    await saveCard({
      id,
      deckId: deck.id,
      categoryId: deck.categoryId,
      english: '',
      hebrew: { script: '' },
      arabic: { script: '', dialect: 'General Levantine' },
      createdAt: stamp,
      updatedAt: stamp,
    });
    navigate('/manage/card/' + id);
  }

  return (
    <div className="screen">
      <ScreenHeader
        title="Cards"
        eyebrow={cards.length + ' total'}
        back
        action={
          <button className="btn btn-primary" onClick={addCard} disabled={decks.length === 0}>
            New
          </button>
        }
      />

      <input
        className="input"
        placeholder="Search English, Hebrew, Arabic, transliteration, tags"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search cards"
      />

      <div className="row">
        <select
          className="input grow"
          value={deckFilter}
          onChange={(e) => setDeckFilter(e.target.value)}
          aria-label="Filter by deck"
        >
          <option value="all">Every deck</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {categories.find((c) => c.id === deck.categoryId)?.name} — {deck.name}
            </option>
          ))}
        </select>
        <select
          className="input grow"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filter cards"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <Link className="btn btn-block" to="/data">Import, export and backup</Link>

      <p className="small muted">
        {filter === 'none' && !query.trim() && deckFilter === 'all'
          ? 'Search, pick a deck, or choose a filter to list cards'
          : visible.length + ' shown'}
      </p>

      <div className="list">
        {visible.map((card) => (
          <Link className="list-item" key={card.id} to={'/manage/card/' + card.id}>
            <span className="grow english">
              <strong>{card.english || 'Untitled card'}</strong>
              <div className="small muted">
                {decks.find((d) => d.id === card.deckId)?.name}
              </div>
            </span>
            <WordForms side={card.hebrew} language="hebrew" />
            <WordForms side={card.arabic} language="arabic" />
          </Link>
        ))}
      </div>

      {decks.length === 0 && (
        <div className="empty">
          <p>Create a category and deck first.</p>
        </div>
      )}
    </div>
  );
}
