import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  isNotApplicable,
  isSameAs,
  SPEECH_PERSPECTIVES,
  SPEECH_PERSPECTIVE_MARKERS,
  SPEECH_PERSPECTIVE_SHORT,
  type ArabicDialect,
  type ArabicHalf,
  type Flashcard,
  type GenderedForm,
  type GenderedForms,
  type SpeechForms,
  type SpeechPerspective,
  type SpeechVariant,
} from '../types';
import { useData } from '../stores/dataStore';
import { useSettings } from '../stores/settingsStore';
import { useSpeech } from '../hooks/useSpeech';
import Icon from '../components/ornament/Icon';
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
      script: forms.feminine.script,
      transliteration: forms.feminine.transliteration,
    });
  };

  /** Drops the pair back to a single word, keeping the feminine form. */
  const clearForms = (language: 'hebrew' | 'arabic') =>
    patchSide(language, { forms: undefined });

  /**
   * How one perspective is filled in. `shared` is the absence of an entry —
   * the perspective simply uses the card's own wording — which is what keeps a
   * phrase that does not vary from sprouting four identical strings.
   */
  type SpeechMode = 'shared' | 'own' | 'sameAs' | 'notApplicable';

  const speechModeOf = (variant: SpeechVariant | undefined): SpeechMode => {
    if (!variant) return 'shared';
    if (isNotApplicable(variant)) return 'notApplicable';
    if (isSameAs(variant)) return 'sameAs';
    return 'own';
  };

  const patchSpeech = (
    language: 'hebrew' | 'arabic',
    perspective: SpeechPerspective,
    variant: SpeechVariant | undefined,
  ) => {
    const side = draft![language];
    const next: SpeechForms = { ...(side.speechForms ?? {}) };
    if (variant) next[perspective] = variant;
    else delete next[perspective];

    const empty = Object.keys(next).length === 0;
    patchSide(language, { speechForms: empty ? undefined : next });
  };

  /**
   * Switching a perspective's mode.
   *
   * Moving to "its own wording" seeds the boxes from whatever the perspective
   * already resolved to, so the editor never blanks a field the content author
   * was about to reuse. "Same as" defaults to ♀→♂, the perspective everything
   * else here is ordered around.
   */
  const setSpeechMode = (
    language: 'hebrew' | 'arabic',
    perspective: SpeechPerspective,
    mode: SpeechMode,
  ) => {
    const side = draft![language];
    const existing = side.speechForms?.[perspective];

    if (mode === 'shared') return patchSpeech(language, perspective, undefined);
    if (mode === 'notApplicable') {
      return patchSpeech(language, perspective, { notApplicable: true });
    }
    if (mode === 'sameAs') {
      const target: SpeechPerspective =
        perspective === 'femaleToMale' ? 'femaleToFemale' : 'femaleToMale';
      return patchSpeech(language, perspective, { sameAs: target });
    }

    const seed =
      existing && !isSameAs(existing) && !isNotApplicable(existing)
        ? existing
        : { script: side.script, transliteration: side.transliteration };
    patchSpeech(language, perspective, { ...seed });
  };

  /**
   * The speaker/listener variants, ♀→♂ first.
   *
   * Hidden behind a button until a card needs them: most words do not change
   * with who is talking, and four empty boxes on every card would invite
   * exactly the fabricated distinctions this is meant to avoid.
   */
  const speechFields = (language: 'hebrew' | 'arabic') => {
    const side = draft![language];
    const scriptClass = 'input ' + language;
    const tag = language === 'hebrew' ? 'he' : 'ar';

    if (!side.speechForms) {
      return (
        <button
          type="button"
          className="btn"
          onClick={() => setSpeechMode(language, 'femaleToMale', 'own')}
        >
          Add speaker and listener variants
        </button>
      );
    }

    return (
      <>
        <p className="small muted">
          Who is speaking, and who is being spoken to. Leave a row on “same for
          everyone” unless the wording really changes — the card only shows
          differences.
        </p>

        {SPEECH_PERSPECTIVES.map((perspective) => {
          const variant = side.speechForms![perspective];
          const mode = speechModeOf(variant);
          const own =
            variant && !isSameAs(variant) && !isNotApplicable(variant)
              ? variant
              : undefined;

          return (
            <div className="field" key={perspective}>
              <span>
                {SPEECH_PERSPECTIVE_MARKERS[perspective]}{' '}
                {SPEECH_PERSPECTIVE_SHORT[perspective]}
              </span>

              <select
                className="input"
                value={mode}
                onChange={(e) =>
                  setSpeechMode(language, perspective, e.target.value as SpeechMode)
                }
              >
                <option value="shared">Same for everyone</option>
                <option value="own">Its own wording</option>
                <option value="sameAs">Same as another variant</option>
                <option value="notApplicable">Not said this way</option>
              </select>

              {mode === 'sameAs' && (
                <select
                  className="input"
                  value={(variant as { sameAs: SpeechPerspective }).sameAs}
                  onChange={(e) =>
                    patchSpeech(language, perspective, {
                      sameAs: e.target.value as SpeechPerspective,
                    })
                  }
                >
                  {SPEECH_PERSPECTIVES.filter((p) => p !== perspective).map((p) => (
                    <option key={p} value={p}>
                      {SPEECH_PERSPECTIVE_MARKERS[p]} {SPEECH_PERSPECTIVE_SHORT[p]}
                    </option>
                  ))}
                </select>
              )}

              {mode === 'own' && (
                <div className="row">
                  <input
                    className={scriptClass + ' grow'}
                    dir="rtl"
                    lang={tag}
                    placeholder="Script"
                    value={own?.script ?? ''}
                    onChange={(e) =>
                      patchSpeech(language, perspective, {
                        ...own,
                        script: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input english grow"
                    placeholder="Transliteration"
                    value={own?.transliteration ?? ''}
                    onChange={(e) =>
                      patchSpeech(language, perspective, {
                        script: own?.script ?? '',
                        ...own,
                        transliteration: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="btn"
          onClick={() => patchSide(language, { speechForms: undefined })}
        >
          Remove speaker and listener variants
        </button>
      </>
    );
  };

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
            <Icon name="speaker" />
          </button>
        </div>
        {wordFields('hebrew')}
        {speechFields('hebrew')}
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
            <Icon name="speaker" />
          </button>
        </div>
        {wordFields('arabic')}
        {speechFields('arabic')}
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
