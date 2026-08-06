import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  ArabicDialect,
  ArabicHalf,
  Flashcard,
  GenderedForm,
  GenderedForms,
} from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { useSpeech } from '../hooks/useSpeech';
import ScreenHeader from '../components/controls/ScreenHeader';

const DIALECTS: ArabicDialect[] = [
  'General Levantine',
  'Palestinian',
  'Jordanian',
  'Lebanese',
  'Syrian',
];

export default function CardEditorScreen() {
  const { cardId = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const cards = useData((s) => s.cards);
  const decks = useData((s) => s.decks);
  const categories = useData((s) => s.categories);
  const saveCard = useData((s) => s.saveCard);
  const deleteCard = useData((s) => s.deleteCard);
  const duplicateCard = useData((s) => s.duplicateCard);
  const moveCard = useData((s) => s.moveCard);
  const { speak } = useSpeech(settings);

  const original = cards.find((c) => c.id === cardId);
  const [draft, setDraft] = useState<Flashcard | null>(original ?? null);

  if (!original || !draft) {
    return (
      <div className="screen">
        <ScreenHeader title="Card not found" back />
      </div>
    );
  }

  const patchSide = (
    language: 'hebrew' | 'arabic',
    patch: Partial<ArabicHalf>,
  ) => setDraft({ ...draft, [language]: { ...draft[language], ...patch } });

  /**
   * Editing either gendered form keeps `script` and `transliteration` in step
   * with the masculine one, so a card never reveals a headline word that
   * contradicts the pair below it.
   */
  const patchForm = (
    language: 'hebrew' | 'arabic',
    gender: 'feminine' | 'masculine',
    patch: Partial<GenderedForm>,
  ) => {
    const side = draft[language];
    const current: GenderedForms = side.forms ?? {
      feminine: { script: side.script, transliteration: side.transliteration },
      masculine: { script: side.script, transliteration: side.transliteration },
    };
    const forms: GenderedForms = {
      ...current,
      [gender]: { ...current[gender], ...patch },
    };
    patchSide(language, {
      forms,
      script: forms.masculine.script,
      transliteration: forms.masculine.transliteration,
    });
  };

  /** Drops the pair back to a single word, keeping the masculine form. */
  const clearForms = (language: 'hebrew' | 'arabic') =>
    patchSide(language, { forms: undefined });

  const alternatesText = (language: 'hebrew' | 'arabic') =>
    (draft[language].accepted ?? []).map((a) => a.value).join(', ');

  const setAlternates = (language: 'hebrew' | 'arabic', text: string) =>
    patchSide(language, {
      accepted: text
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => ({ value })),
    });

  /**
   * The word itself: either one form, or the feminine/masculine pair. Only one
   * of the two is on screen at a time, so there is never a plain "script" box
   * sitting beside a pair it silently shadows.
   */
  const wordFields = (language: 'hebrew' | 'arabic') => {
    const side = draft![language];
    const scriptClass = 'input ' + language;
    const tag = language === 'hebrew' ? 'he' : 'ar';

    if (!side.forms) {
      return (
        <>
          <label className="field">
            <span>Script</span>
            <input className={scriptClass} dir="rtl" lang={tag} value={side.script}
              onChange={(e) => patchSide(language, { script: e.target.value })} />
          </label>
          <label className="field">
            <span>Transliteration</span>
            <input className="input english" value={side.transliteration ?? ''}
              onChange={(e) => patchSide(language, { transliteration: e.target.value || undefined })} />
          </label>
          <button type="button" className="btn"
            onClick={() => patchForm(language, 'feminine', {})}>
            Split into feminine and masculine
          </button>
        </>
      );
    }

    return (
      <>
        {(['feminine', 'masculine'] as const).map((gender) => (
          <div className="row" key={gender}>
            <label className="field grow">
              <span>{gender === 'feminine' ? '♀ Feminine' : '♂ Masculine'}</span>
              <input className={scriptClass} dir="rtl" lang={tag}
                value={side.forms![gender].script}
                onChange={(e) => patchForm(language, gender, { script: e.target.value })} />
            </label>
            <label className="field grow">
              <span>Transliteration</span>
              <input className="input english"
                value={side.forms![gender].transliteration ?? ''}
                onChange={(e) =>
                  patchForm(language, gender, {
                    transliteration: e.target.value || undefined,
                  })
                } />
            </label>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => clearForms(language)}>
          Use one form for everyone
        </button>
      </>
    );
  };

  async function save() {
    await saveCard(draft!);
    navigate(-1);
  }

  async function remove() {
    if (!window.confirm('Delete "' + (draft!.english || 'this card') + '" permanently?')) return;
    await deleteCard(draft!.id);
    navigate('/manage');
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={original.english || 'New card'}
        eyebrow="Edit card"
        back
        action={<button className="btn btn-primary" onClick={save}>Save</button>}
      />

      <section className="panel">
        <label className="field">
          <span>English</span>
          <input
            className="input english"
            value={draft.english}
            onChange={(e) => setDraft({ ...draft, english: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Icon or emoji</span>
          <input
            className="input"
            value={draft.icon ?? ''}
            placeholder="🍎"
            onChange={(e) => setDraft({ ...draft, icon: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Image URL</span>
          <input
            className="input"
            value={draft.imageUrl ?? ''}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Tags, comma separated</span>
          <input
            className="input"
            value={(draft.tags ?? []).join(', ')}
            onChange={(e) =>
              setDraft({
                ...draft,
                tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <label className="field">
          <span>Deck</span>
          <select
            className="input"
            value={draft.deckId}
            onChange={async (e) => {
              await moveCard(draft.id, e.target.value);
              const deck = decks.find((d) => d.id === e.target.value);
              if (deck) setDraft({ ...draft, deckId: deck.id, categoryId: deck.categoryId });
            }}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {categories.find((c) => c.id === deck.categoryId)?.name} — {deck.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="spread">
          <span className="eyebrow">Hebrew</span>
          <button className="btn btn-ghost btn-icon" onClick={() => void speak(draft, 'hebrew')} aria-label="Play Hebrew">
            🔊
          </button>
        </div>
        {wordFields('hebrew')}
        <label className="field">
          <span>Pronunciation text for audio</span>
          <input className="input hebrew" dir="rtl" lang="he" value={draft.hebrew.pronunciationText ?? ''}
            placeholder="With niqqud, if the plain spelling reads badly"
            onChange={(e) => patchSide('hebrew', { pronunciationText: e.target.value || undefined })} />
        </label>
        <label className="field">
          <span>Also accept, comma separated</span>
          <input className="input hebrew" dir="rtl" lang="he" value={alternatesText('hebrew')}
            onChange={(e) => setAlternates('hebrew', e.target.value)} />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Gender</span>
            <input className="input" value={draft.hebrew.gender ?? ''}
              onChange={(e) => patchSide('hebrew', { gender: e.target.value || undefined })} />
          </label>
          <label className="field grow">
            <span>Plural</span>
            <input className="input hebrew" dir="rtl" value={draft.hebrew.plural ?? ''}
              onChange={(e) => patchSide('hebrew', { plural: e.target.value || undefined })} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea className="input" value={draft.hebrew.notes ?? ''}
            onChange={(e) => patchSide('hebrew', { notes: e.target.value || undefined })} />
        </label>
      </section>

      <section className="panel">
        <div className="spread">
          <span className="eyebrow">Levantine Arabic</span>
          <button className="btn btn-ghost btn-icon" onClick={() => void speak(draft, 'arabic')} aria-label="Play Arabic">
            🔊
          </button>
        </div>
        {wordFields('arabic')}
        <label className="field">
          <span>Pronunciation text for audio</span>
          <input className="input arabic" dir="rtl" lang="ar" value={draft.arabic.pronunciationText ?? ''}
            placeholder="Respell if the voice mangles the Levantine form"
            onChange={(e) => patchSide('arabic', { pronunciationText: e.target.value || undefined })} />
        </label>
        <label className="field">
          <span>Also accept, comma separated</span>
          <input className="input arabic" dir="rtl" lang="ar" value={alternatesText('arabic')}
            onChange={(e) => setAlternates('arabic', e.target.value)} />
        </label>
        <label className="field">
          <span>Dialect</span>
          <select className="input" value={draft.arabic.dialect ?? 'General Levantine'}
            onChange={(e) => patchSide('arabic', { dialect: e.target.value as ArabicDialect })}>
            {DIALECTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea className="input" value={draft.arabic.notes ?? ''}
            onChange={(e) => patchSide('arabic', { notes: e.target.value || undefined })} />
        </label>
      </section>

      <div className="row">
        <button className="btn grow" onClick={() => void duplicateCard(draft.id).then(() => navigate('/manage'))}>
          Duplicate
        </button>
        <button className="btn btn-danger grow" onClick={remove}>Delete</button>
      </div>
      <button className="btn btn-primary btn-block" onClick={save}>Save card</button>
    </div>
  );
}
