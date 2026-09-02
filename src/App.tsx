import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { prepareStarterContent } from './services/database/seed';
import { useData } from './stores/dataStore';
import { useSettings } from './stores/settingsStore';
import { useAppearance } from './hooks/useAppearance';
import DashboardScreen from './app/DashboardScreen';
import CategoriesScreen from './app/CategoriesScreen';
import CategoryScreen from './app/CategoryScreen';
import DeckScreen from './app/DeckScreen';
import MemoriseScreen from './app/MemoriseScreen';
import ReviewHomeScreen from './app/ReviewHomeScreen';
import ReviewCategoryScreen from './app/ReviewCategoryScreen';
import AlphabetReviewScreen from './app/AlphabetReviewScreen';
import StudyScreen from './app/StudyScreen';
import ManageScreen from './app/ManageScreen';
import CardEditorScreen from './app/CardEditorScreen';
import StatsScreen from './app/StatsScreen';
import SettingsScreen from './app/SettingsScreen';
import DataScreen from './app/DataScreen';
import SyncScreen from './app/SyncScreen';
import PronunciationReviewScreen from './app/PronunciationReviewScreen';
import AlphabetsScreen from './app/AlphabetsScreen';
import AlphabetHomeScreen from './app/AlphabetHomeScreen';
import PairedAlphabetScreen from './app/PairedAlphabetScreen';
import PairedDeckScreen from './app/PairedDeckScreen';
import LetterListScreen from './app/LetterListScreen';
import LetterDetailScreen from './app/LetterDetailScreen';
import AlphabetProgressScreen from './app/AlphabetProgressScreen';
import AlphabetPractiseScreen from './app/AlphabetPractiseScreen';
import AlphabetSessionScreen from './app/AlphabetSessionScreen';
import AlphabetWriteScreen from './app/AlphabetWriteScreen';
import AlphabetCardsScreen from './app/AlphabetCardsScreen';
import AlphabetOrderScreen from './app/AlphabetOrderScreen';
import OrderRecallScreen from './app/OrderRecallScreen';
import LevelsScreen from './app/LevelsScreen';
import SentencesScreen from './app/SentencesScreen';
import SentenceGroupScreen from './app/SentenceGroupScreen';
import SentenceChainScreen from './app/SentenceChainScreen';
import ConversationsScreen from './app/ConversationsScreen';
import ConversationGroupScreen from './app/ConversationGroupScreen';
import ConversationExchangeScreen from './app/ConversationExchangeScreen';
import SituationsScreen from './app/SituationsScreen';
import FreeTalkScreen from './app/FreeTalkScreen';
import FreeTalkSessionScreen from './app/FreeTalkSessionScreen';
import SituationScreen from './app/SituationScreen';
import SituationRehearsalScreen from './app/SituationRehearsalScreen';
import PastFutureScreen from './app/PastFutureScreen';
import PastFutureSectionScreen from './app/PastFutureSectionScreen';
import PastFutureLessonScreen from './app/PastFutureLessonScreen';
import TenseTimelineScreen from './app/TenseTimelineScreen';
import TellMeScreen from './app/TellMeScreen';
import TellMeSectionScreen from './app/TellMeSectionScreen';
import TellMeLessonScreen from './app/TellMeLessonScreen';
import ConnectorMapScreen from './app/ConnectorMapScreen';
import StoryBuilderScreen from './app/StoryBuilderScreen';
import ShortStoryScreen from './app/ShortStoryScreen';
import OpinionsScreen from './app/OpinionsScreen';
import OpinionsSectionScreen from './app/OpinionsSectionScreen';
import OpinionsLessonScreen from './app/OpinionsLessonScreen';
import CertaintyScaleScreen from './app/CertaintyScaleScreen';
import OpinionBuilderScreen from './app/OpinionBuilderScreen';
import TakeAStandScreen from './app/TakeAStandScreen';
import SplashScreen from './app/SplashScreen';
import { useAlphabet } from './stores/alphabetStore';
import Icon, { type IconName } from './components/ornament/Icon';

/*
 * The destinations, each with its engraved mark: a temple front for home, a
 * scroll for the decks, a codex for the flip-through, carved columns for the
 * figures, and a rosette for the settings. The label stays under every one of
 * them — the icons are a second cue, never the only one.
 *
 * Review takes the seat next to Home, in the order the work is actually done:
 * meet the words, then be asked about them. The letters live inside Practice,
 * where the rest of the choosing happens — they are optional and gate nothing,
 * so they do not need a permanent seat in the bar.
 *
 * The marks stayed where they were when the two destinations swapped seats.
 * Neither is a picture of what it leads to so precisely that moving it would
 * clarify anything, and re-cutting the icons as well would have changed
 * everything about the bar at once.
 */
const TABS: { to: string; icon: IconName; label: string; also?: string[] }[] = [
  { to: '/', icon: 'temple', label: 'Home' },
  { to: '/memorise', icon: 'scroll', label: 'Review' },
  { to: '/categories', icon: 'codex', label: 'Practice' },
  // The levels beyond the words — sentences, conversations, situations, free
  // talk, the same things said about yesterday and tomorrow, several of those
  // said in one breath, and what she thinks of any of it — share one seat: a
  // staircase, because they are a
  // progression, and the hub behind it lists them in the order they build on
  // each other. `also` keeps the seat lit while the learner is inside any of
  // those areas, whose routes kept their own names when they moved under this
  // roof.
  {
    to: '/levels',
    icon: 'steps',
    label: 'Levels',
    also: [
      '/sentences',
      '/conversations',
      '/situations',
      '/freetalk',
      '/pastfuture',
      '/tellme',
      '/opinions',
    ],
  },
  { to: '/stats', icon: 'columns', label: 'Stats' },
  { to: '/settings', icon: 'rosette', label: 'Settings' },
];

/*
 * How long the opening screen is held even when the database opens instantly,
 * and how long its fade-out runs afterwards. The floor is there so the mark is
 * something you see rather than something that flickers; it is a floor and not
 * a delay, because a slow open simply keeps the splash up for longer.
 *
 * It is shown once per load of the page and never between screens. That falls
 * out of where this component sits — mounted above `Routes`, so navigating
 * does not remount it and the state below survives — rather than out of any
 * check, so keep the splash state here. Moved into a route element, or given
 * a changing `key`, it would fire on every move between the study areas.
 */
const SPLASH_HOLD_MS = 1500;
const SPLASH_FADE_MS = 380;

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [held, setHeld] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const settings = useSettings((s) => s.settings);
  const loadSettings = useSettings((s) => s.load);
  const loadData = useData((s) => s.load);
  const loadAlphabet = useAlphabet((s) => s.load);
  const { pathname } = useLocation();

  useAppearance(settings);

  useEffect(() => {
    (async () => {
      try {
        await prepareStarterContent();
        await Promise.all([loadSettings(), loadData(), loadAlphabet()]);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();
  }, [loadSettings, loadData, loadAlphabet]);

  useEffect(() => {
    const t = setTimeout(() => setHeld(true), SPLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  // The splash is only unmounted once its fade has finished, so the app it
  // uncovers has to be mounted underneath it for that stretch.
  const leaving = held && status === 'ready';
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setSplashGone(true), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  // An error is worth reading straight away — it does not wait out the hold.
  if (status === 'loading' || (!held && status !== 'error')) {
    return <SplashScreen />;
  }

  if (status === 'error') {
    return (
      <div className="app">
        <div className="screen">
          <h1>Could not open the local database</h1>
          <p className="muted">{error}</p>
          <p className="small muted">
            Private browsing can block local storage. Try a normal window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/categories" element={<CategoriesScreen />} />
        <Route path="/category/:categoryId" element={<CategoryScreen />} />
        <Route path="/deck/:deckId" element={<DeckScreen />} />
        {/* Review's own browse, laid out like Practice's but two taps shorter:
            category, deck, cards. No mode picker on the way, because a learner
            who came here has already chosen not to be tested. The two static
            paths are matched ahead of `:deckId` rather than read as deck
            ids. */}
        <Route path="/memorise" element={<ReviewHomeScreen />} />
        <Route
          path="/memorise/category/:categoryId"
          element={<ReviewCategoryScreen />}
        />
        <Route path="/memorise/selection" element={<MemoriseScreen pile />} />
        {/* The letters, read the same way the words are. Static like the two
            above it, so it is matched before `:deckId` rather than looked up
            as a deck that does not exist. */}
        <Route path="/memorise/alphabet" element={<AlphabetReviewScreen />} />
        <Route path="/memorise/:deckId" element={<MemoriseScreen />} />
        {/* The hub for the levels beyond the words, in the order they
            build on each other. The areas below keep their own routes; this
            is the one seat in the tab bar they now share. */}
        <Route path="/levels" element={<LevelsScreen />} />
        {/* Sentence Building: groups, a group's chains, and one chain read as
            it grows. Practising a chain hands over to the ordinary study
            screen — a chain is a deck, and the ladder already deals a deck in
            its own order, which is exactly the expansion. */}
        <Route path="/sentences" element={<SentencesScreen />} />
        <Route
          path="/sentences/group/:categoryId"
          element={<SentenceGroupScreen />}
        />
        <Route
          path="/sentences/chain/:deckId"
          element={<SentenceChainScreen />}
        />
        {/* Conversation Flow: groups, a group's exchanges, and one exchange
            read as the conversation it is. Practising an exchange hands over
            to the ordinary study screen — an exchange is a deck, and the
            ladder growing its active set one card at a time is exactly the
            learner being made responsible for more of the conversation. */}
        <Route path="/conversations" element={<ConversationsScreen />} />
        <Route
          path="/conversations/group/:categoryId"
          element={<ConversationGroupScreen />}
        />
        <Route
          path="/conversations/exchange/:deckId"
          element={<ConversationExchangeScreen />}
        />
        {/* Real Situations: the scenarios, one scenario read whole, and its
            rehearsal — the branching play-through that is this level's own
            machine. Practising a scenario's lines still hands over to the
            ordinary study screen, because its parts are ordinary decks. */}
        <Route path="/situations" element={<SituationsScreen />} />
        <Route
          path="/situations/scenario/:categoryId"
          element={<SituationScreen />}
        />
        <Route
          path="/situations/rehearse/:categoryId"
          element={<SituationRehearsalScreen />}
        />
        {/* Free Conversation: the hub, and one live conversation. The session
            carries its shape in the query string, because a free conversation
            is deliberately ephemeral — there is no deck and no stored session
            to resume, only the record of conversations completed. */}
        <Route path="/freetalk" element={<FreeTalkScreen />} />
        <Route path="/freetalk/session" element={<FreeTalkSessionScreen />} />
        {/* Past & Future: the sections, one section's lessons, one lesson read
            whole, and the timeline the contrast section is drawn on. Practising
            a lesson still hands over to the ordinary study screen, because a
            lesson is an ordinary deck; the timeline is the level's own view and
            scores nothing. The static path is matched ahead of `:deckId`. */}
        <Route path="/pastfuture" element={<PastFutureScreen />} />
        <Route path="/pastfuture/timeline" element={<TenseTimelineScreen />} />
        <Route
          path="/pastfuture/section/:categoryId"
          element={<PastFutureSectionScreen />}
        />
        <Route
          path="/pastfuture/lesson/:deckId"
          element={<PastFutureLessonScreen />}
        />
        {/* Tell Me About It: the sections, one section's lessons, one lesson
            read whole, and the level's three own views — the connector map,
            the story builder, and a short story to listen through. Practising a
            lesson still hands over to the ordinary study screen, because a
            lesson is an ordinary deck; the other three score nothing. The
            static paths are matched ahead of `:deckId`. */}
        <Route path="/tellme" element={<TellMeScreen />} />
        <Route path="/tellme/connectors" element={<ConnectorMapScreen />} />
        <Route path="/tellme/build/:buildId" element={<StoryBuilderScreen />} />
        <Route path="/tellme/story/:storyId" element={<ShortStoryScreen />} />
        <Route
          path="/tellme/section/:categoryId"
          element={<TellMeSectionScreen />}
        />
        <Route path="/tellme/lesson/:deckId" element={<TellMeLessonScreen />} />
        {/* Opinions & Reasons: the sections, one section's lessons, one lesson
            read whole, and the level's three own views — the certainty scale,
            the opinion builder, and taking a position on something. Practising
            a lesson still hands over to the ordinary study screen, because a
            lesson is an ordinary deck; the other three score nothing, and two
            of them could not be scored — there is no right opinion. The static
            paths are matched ahead of `:deckId`. */}
        <Route path="/opinions" element={<OpinionsScreen />} />
        <Route path="/opinions/certainty" element={<CertaintyScaleScreen />} />
        <Route
          path="/opinions/build/:buildId"
          element={<OpinionBuilderScreen />}
        />
        <Route path="/opinions/stand/:standId" element={<TakeAStandScreen />} />
        <Route
          path="/opinions/section/:categoryId"
          element={<OpinionsSectionScreen />}
        />
        <Route
          path="/opinions/lesson/:deckId"
          element={<OpinionsLessonScreen />}
        />
        <Route path="/study/:deckId" element={<StudyScreen />} />
        {/* Putting a deck back in order. Its own route rather than a study
            mode: it asks about the deck's sequence rather than about any one
            card, and it grades neither Hebrew nor Arabic accuracy. */}
        <Route path="/order/:deckId" element={<OrderRecallScreen />} />
        {/* The alphabets sit beside the decks, never in front of them: nothing
            here gates the vocabulary. */}
        <Route path="/alphabets" element={<AlphabetsScreen />} />
        {/* Both alphabets at once, and the only part of the module that is a
            ladder: ten paired sounds a deck, each opening the next. Static, so
            it is matched ahead of `:script` rather than read as one. */}
        <Route path="/alphabet/both" element={<PairedAlphabetScreen />} />
        <Route path="/alphabet/both/:deckId" element={<PairedDeckScreen />} />
        <Route path="/alphabet/:script" element={<AlphabetHomeScreen />} />
        <Route path="/alphabet/:script/letters" element={<LetterListScreen />} />
        <Route
          path="/alphabet/:script/letter/:letterId"
          element={<LetterDetailScreen />}
        />
        <Route
          path="/alphabet/:script/progress"
          element={<AlphabetProgressScreen />}
        />
        <Route
          path="/alphabet/:script/practise"
          element={<AlphabetPractiseScreen />}
        />
        <Route
          path="/alphabet/:script/practise/:mode/:deckId"
          element={<AlphabetSessionScreen />}
        />
        <Route
          path="/alphabet/:script/write/:deckId"
          element={<AlphabetWriteScreen />}
        />
        {/* The two letter modes that are not runs of multiple-choice
            questions: a deck read as self-marked cards, and the alphabet put
            back into its own order. */}
        <Route
          path="/alphabet/:script/cards/:deckId"
          element={<AlphabetCardsScreen />}
        />
        <Route path="/alphabet/:script/order" element={<AlphabetOrderScreen />} />
        <Route path="/manage" element={<ManageScreen />} />
        <Route path="/manage/card/:cardId" element={<CardEditorScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/data" element={<DataScreen />} />
        <Route path="/sync" element={<SyncScreen />} />
        <Route path="/audio-review" element={<PronunciationReviewScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Plain links with the current-page mark worked out by hand, because a
          NavLink only knows its own path: the Levels seat has to stay lit
          while the learner is inside /sentences, /conversations or
          /situations, which live beside /levels rather than under it. The
          matching is NavLink's own — exact for Home, path-prefix for the
          rest — with a tab's `also` prefixes counted as part of its ground. */}
      <nav className="tabbar" aria-label="Main">
        {TABS.map((tab) => {
          const seats = [tab.to, ...(tab.also ?? [])];
          const active =
            tab.to === '/'
              ? pathname === '/'
              : seats.some(
                  (seat) =>
                    pathname === seat || pathname.startsWith(seat + '/'),
                );
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-icon" aria-hidden="true">
                <Icon name={tab.icon} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {!splashGone && <SplashScreen leaving />}
    </div>
  );
}
