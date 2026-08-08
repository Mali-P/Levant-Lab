import { useMemo, useState } from 'react';
import { allClips } from '../services/audio/manifest';
import SpeakerButton from '../components/controls/SpeakerButton';
import ScreenHeader from '../components/controls/ScreenHeader';

type Filter = 'all' | 'hebrew' | 'arabic';

/**
 * Internal review list for the generated recordings.
 *
 * Every clip is playable beside the meaning, the displayed word, its form, the
 * transliteration, the exact text sent to the provider and the voice that said
 * it — which is what a Levantine speaker needs in order to sign the Arabic off
 * or send back a correction. Corrections go into PRONUNCIATION_OVERRIDES, not
 * into the visible vocabulary.
 */
export default function PronunciationReviewScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const clips = useMemo(() => allClips(), []);

  const shown = clips.filter((clip) => {
    if (filter !== 'all' && clip.language !== filter) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      clip.english.toLowerCase().includes(needle) ||
      clip.text.includes(query.trim()) ||
      clip.key.includes(needle)
    );
  });

  return (
    <div className="screen">
      <ScreenHeader
        title="Pronunciation review"
        eyebrow="Internal"
        back
      />

      {clips.length === 0 ? (
        <div className="empty">
          <p>No recordings have been generated yet.</p>
          <p className="small muted">
            Run <code>npm run generate-audio</code> with Google and Gemini
            credentials in <code>.env</code>, then reload.
          </p>
        </div>
      ) : (
        <>
          <p className="small muted">
            {clips.length} clip(s). The Arabic is Gemini asked for a Palestinian
            Levantine accent, which it can drift from, so it must be checked by a
            Palestinian speaker before it is treated as final. Record any fix in{' '}
            <code>src/constants/pronunciationOverrides.ts</code>{' '}
            and re-run <code>npm run generate-audio -- --force</code>.
          </p>

          <div className="row">
            {(['all', 'hebrew', 'arabic'] as Filter[]).map((option) => (
              <button
                key={option}
                type="button"
                className={'btn' + (filter === option ? ' btn-primary' : '')}
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
              >
                {option === 'all' ? 'Both' : option === 'hebrew' ? 'Hebrew' : 'Arabic'}
              </button>
            ))}
          </div>

          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by meaning or word"
            aria-label="Filter recordings"
          />

          <ul className="review-list">
            {shown.map((clip) => (
              <li className="panel review-row" key={clip.key}>
                <div className="review-head">
                  <span className="eyebrow">{clip.english}</span>
                  <span className="chip">{clip.form}</span>
                  <span className="chip">
                    {clip.language === 'hebrew' ? 'Hebrew' : 'Arabic'}
                  </span>
                  <SpeakerButton
                    form={{
                      script: clip.text,
                      transliteration: clip.transliteration,
                      audioPath: clip.path,
                      key: clip.form,
                      // Only a grammatical pair carries a gender. A
                      // speaker/listener variant names itself in `clip.form`
                      // instead, and the explicit label below reads it out.
                      gender:
                        clip.form === 'feminine' || clip.form === 'masculine'
                          ? clip.form
                          : undefined,
                    }}
                    language={clip.language}
                    label={
                      'Play the ' +
                      clip.language +
                      ' ' +
                      clip.form +
                      ' recording of ' +
                      clip.english
                    }
                  />
                </div>

                <div className={clip.language + ' script-lg'} dir="rtl">
                  {clip.text}
                </div>
                {clip.transliteration && (
                  <div className="translit">{clip.transliteration}</div>
                )}

                <dl className="review-meta small muted">
                  <dt>Sent to TTS</dt>
                  <dd dir="rtl" lang={clip.language === 'hebrew' ? 'he' : 'ar'}>
                    {clip.spoken}
                    {clip.spoken !== clip.text && ' (override)'}
                  </dd>
                  <dt>Voice</dt>
                  <dd>
                    {clip.voice} ({clip.provider})
                  </dd>
                  <dt>File</dt>
                  <dd>{clip.path}</dd>
                </dl>
              </li>
            ))}
          </ul>

          {shown.length === 0 && <p className="muted">Nothing matches that filter.</p>}
        </>
      )}
    </div>
  );
}
