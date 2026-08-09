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
  const gates = gatePairDecks(settings.pairedLetterRuns ?? {});

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

      {gates.map((gate) => {
        const deck = gate.deck;

        return (
          <section
            className={'panel' + (gate.unlocked ? '' : ' locked')}
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
                {gate.unlocked ? (
                  gate.passed && <span className="chip chip-ok">Passed</span>
                ) : (
                  <span className="chip">
                    <Icon name="lock" /> Locked
                  </span>
                )}
              </div>
            </div>

            <div className="small muted">{deck.description}</div>

            <PerfectRuns completed={gate.runs} required={gate.runsRequired} />

            {gate.unlocked ? (
              <Link
                className="btn btn-primary btn-block"
                to={'/alphabet/both/' + encodeURIComponent(deck.id)}
              >
                {gate.passed ? 'Read it again' : 'Study this deck'}
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
