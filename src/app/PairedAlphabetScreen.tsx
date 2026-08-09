import { Link } from 'react-router-dom';
import { useSettings } from '../stores/settingsStore';
import { gatePairDecks } from '../features/alphabet/pairDecks';
import ScreenHeader from '../components/controls/ScreenHeader';
import PerfectRuns from '../components/progress/PerfectRuns';
import Icon from '../components/ornament/Icon';

/**
 * Both alphabets at once, as a ladder of decks.
 *
 * The single-script modules are a menu: every deck is open, and a learner picks
 * whatever they feel like drilling. This one is not, and deliberately — it is
 * the vocabulary categories' shape, because taking on Hebrew and Arabic
 * together only works if the letters arrive in sittings and each sitting is
 * finished before the next begins. Ten sounds, twenty letterforms, then the
 * next ten.
 *
 * It still gates nothing outside itself. A learner can leave at any point and
 * study either alphabet on its own, and the letters scored here are the same
 * letters, in the same progress rows, as the ones scored there.
 */
export default function PairedAlphabetScreen() {
  const settings = useSettings((s) => s.settings);
  const languages = useSettings((s) => s.languages);
  const gates = gatePairDecks(settings.pairedLetterRuns ?? {});

  /*
   * Reference, not a course, for a learner studying one language.
   *
   * This screen is no longer offered in the Alphabets list when a single
   * language is on, but the address still works and should: the other script's
   * material is hidden, never made inaccessible. What changes is that nothing
   * here can be banked — see `PairedDeckScreen` — and a ladder that gates each
   * deck behind a clean run through the last would then gate every deck behind
   * a run that can no longer be recorded. A reference nobody can open past the
   * first page is not a reference, so here every deck is open and none of them
   * is passed.
   */
  const reference = languages.length === 1;

  return (
    <div className="screen">
      <ScreenHeader
        title="Both Alphabets"
        eyebrow="Hebrew and Arabic side by side"
        back
      />

      <p className="small muted">
        The same abjad twice: ג is ج and ק is ق, letter for letter, because both
        alphabets descend from the same order. Each deck is ten sounds, written
        both ways.
      </p>

      {reference && (
        <section className="panel">
          <span className="eyebrow">Reference only</span>
          <p className="small muted">
            You are studying one language, so this course is here to be read
            rather than run. Nothing on these decks is marked, scored or
            counted — for either alphabet — and no letter's progress moves.
            Choose Both in Settings to take it as a course.
          </p>
        </section>
      )}

      {gates.map((gate) => {
        const deck = gate.deck;
        const open = gate.unlocked || reference;

        return (
          <section
            className={'panel' + (open ? '' : ' locked')}
            key={deck.id}
          >
            <div className="spread">
              <div>
                <div className="eyebrow">
                  Deck {deck.position} of {gates.length} · {deck.title}
                </div>
                <div className="small muted">
                  {deck.pairIds.length} pairs · {deck.letterCount} letters
                </div>
              </div>
              <div className="deck-marks">
                {reference ? (
                  <span className="chip">Reference</span>
                ) : gate.unlocked ? (
                  gate.passed && <span className="chip chip-ok">Passed</span>
                ) : (
                  <span className="chip">
                    <Icon name="lock" /> Locked
                  </span>
                )}
              </div>
            </div>

            <div className="small muted">{deck.description}</div>

            {/* No run tally in reference mode: the pips would be counting
                towards something that can no longer be earned. */}
            {!reference && (
              <PerfectRuns completed={gate.runs} required={gate.runsRequired} />
            )}

            {open ? (
              <Link
                className="btn btn-primary btn-block"
                to={'/alphabet/both/' + encodeURIComponent(deck.id)}
              >
                {reference
                  ? 'Read this deck'
                  : gate.passed
                    ? 'Read it again'
                    : 'Study this deck'}
              </Link>
            ) : (
              <p className="small muted">
                Opens once <strong>{gate.blockedBy!.title}</strong> has been run
                through without a single miss.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
