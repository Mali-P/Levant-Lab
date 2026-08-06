# Full-Stack Developer Request: Mobile-First Hebrew and Levantine Arabic Flashcard App

## Project Overview

Build a private, mobile-first flashcard application for learning **Hebrew and Levantine Arabic simultaneously**.

The app should feel more like a visually engaging game than a traditional study tool. It should be strict, repetitive and intentionally difficult. The core learning principle is that a card is not considered correct unless the user recalls the answer in **both Hebrew and Arabic**.

The app is for personal use only. It does not need public accounts, subscriptions, payments, social features or commercial licensing infrastructure.

The primary target is mobile, especially Android, but the interface should also work cleanly on desktop and tablet.

---

# Core Learning Structure

## Categories

The user should first select a vocabulary category.

Initial categories may include:

* Counting and numbers
* Food and drink
* Activities
* Care and hygiene
* Medical
* Emergency
* Household
* Electronics
* Adjectives
* Verbs
* Transport
* Directions
* Shopping
* Body parts
* Work and technology
* Family
* Daily routine

The category system must be expandable without requiring structural code changes.

Each category contains one or more decks. A default deck should contain approximately 10 cards, although the user must be able to create decks of different sizes.

---

# Card Data

Each card should support:

```ts
type Flashcard = {
  id: string;
  categoryId: string;
  deckId: string;

  english: string;
  imageUrl?: string;
  icon?: string;

  hebrew: {
    script: string;
    transliteration?: string;
    pronunciationText?: string;
    gender?: string;
    plural?: string;
    notes?: string;
    exampleSentence?: string;
    exampleTranslation?: string;
  };

  arabic: {
    script: string;
    transliteration?: string;
    pronunciationText?: string;
    dialect?: "Palestinian" | "Jordanian" | "Lebanese" | "Syrian" | "General Levantine";
    gender?: string;
    plural?: string;
    notes?: string;
    exampleSentence?: string;
    exampleTranslation?: string;
  };

  tags?: string[];

  createdAt: string;
  updatedAt: string;
};
```

`pronunciationText` should be optional and may differ from the visible written answer. This allows Hebrew niqqud or adjusted Arabic spelling to be sent to text-to-speech without changing the displayed vocabulary.

---

# Primary Study Screen

The cards should take up most of the screen.

The design must be mobile-first and optimised for one-handed use.

## Screen layout

The study screen should include:

* Category or deck name
* Current card number
* Remaining card count
* Retry pile count
* Current perfect-run progress
* Large central card
* Hebrew answer area
* Arabic answer area
* Reveal, submit or self-assessment controls
* Audio controls
* Optional transliteration and hint controls

Example:

```text
FOOD
Card 4 of 10

┌─────────────────────────┐
│                         │
│          APPLE          │
│            🍎           │
│                         │
│ Hebrew:                 │
│ [____________________]  │
│                         │
│ Arabic:                 │
│ [____________________]  │
│                         │
│ 🔊 Hebrew   🔊 Arabic   │
│                         │
│        SUBMIT           │
└─────────────────────────┘

Retry pile: 2
Perfect runs: 4 / 10
```

The card should remain the dominant visual element.

---

# Swipe Behaviour

Cards must support touch dragging and swiping.

Suggested behaviour:

* Swipe left: incorrect or move to retry pile
* Swipe right: correct
* Swipe up: reveal answer
* Tap audio button: hear pronunciation
* Tap the card: flip between question and answer where applicable

The exact gesture mapping may be adjusted if usability testing shows a better approach, but swiping must remain a central interaction.

Cards should slightly rotate and follow the finger while being dragged.

Use smooth spring animations. Avoid excessive motion that slows the study process.

A reduced-motion accessibility setting must disable large swipe and flip animations.

---

# Answer Modes

The app should support at least three answer methods.

## 1. Self-assessment mode

The user sees the English word, thinks of both translations, reveals the answers and marks the card:

* Both correct
* Hebrew wrong
* Arabic wrong
* Both wrong

## 2. Typed-answer mode

The user types the Hebrew and Arabic answers.

The app checks both independently.

A card only counts as fully correct when both answers are accepted.

The answer checker should:

* Ignore leading and trailing spaces
* Normalise repeated spaces
* Optionally ignore Hebrew niqqud
* Optionally ignore Arabic vowel marks
* Support approved alternate spellings
* Support alternate dialect forms configured on the card
* Never incorrectly treat Hebrew and Arabic punctuation as meaningful errors

## 3. Audio mode

The user hears one language and must identify or type:

* The English meaning
* The equivalent Hebrew term
* The equivalent Arabic term

Audio mode can be a later phase but the data and service structure should allow it.

---

# Normal Mode

Normal mode uses a retry pile.

Rules:

1. Load the selected deck.
2. Show every card once.
3. If either Hebrew or Arabic is wrong, place the card in the retry pile.
4. After the initial stack is completed, show all retry cards again.
5. Continue cycling failed cards until every card has been answered correctly in both languages.
6. The session is complete only when the active stack and retry pile are both empty.

Example:

```text
Apple

Hebrew: correct
Arabic: incorrect

Result:
Hebrew ✓
Arabic ✗

This card has been added to the retry pile.
```

A partially correct card must not count as mastered.

---

# Hard Mode

Hard mode should be deliberately unforgiving.

Rules:

1. The deck begins with a full stack.
2. Every card must be answered correctly in both Hebrew and Arabic.
3. One mistake in either language fails the current run.
4. On failure, restart the entire deck from the beginning.
5. Randomise the card order after each failed run.
6. Completing the full deck without a single mistake counts as one perfect run.
7. The user must complete the configured number of perfect runs before passing.

Default requirement:

```text
Deck size: 10 cards
Required perfect runs: 10
Total minimum successful answers: 100
```

The user must therefore achieve **10 out of 10 cards correctly, ten times**.

The deck only receives a hard-mode pass after all ten perfect runs are complete.

The required number of perfect runs should be configurable per deck.

## Hard-mode failure screen

The failure state should be firm but not demoralising.

Example:

```text
RUN FAILED

Hebrew ✓
Arabic ✗

Perfect run progress remains:
4 / 10

The deck has been reshuffled.
Start again.
```

Do not erase previously completed perfect runs unless an optional “brutal reset” setting is enabled.

---

# Brutal Mode

Include an optional mode more severe than hard mode.

Possible rules:

* One mistake resets the current run.
* One mistake may also reset completed perfect-run progress to zero.
* Transliteration is disabled.
* Hints are disabled.
* Typed answers are mandatory.
* Card order changes every run.
* Answer time limits may be enabled.
* Audio may be used without displaying script.
* The app may alternate prompt direction.

Brutal mode should be opt-in and clearly labelled.

---

# Prompt Directions

The app should support multiple study directions:

* English → Hebrew and Arabic
* Hebrew → English and Arabic
* Arabic → English and Hebrew
* Hebrew audio → identify Hebrew and provide Arabic
* Arabic audio → identify Arabic and provide Hebrew
* English audio or image → provide both languages

The user should be able to enable or disable prompt directions for each deck.

The default should be:

```text
English → Hebrew + Arabic
```

---

# Progress and Mastery

Track each language independently.

A card should contain separate statistics for Hebrew and Arabic.

```ts
type CardProgress = {
  cardId: string;

  hebrew: {
    correct: number;
    incorrect: number;
    currentStreak: number;
    longestStreak: number;
    lastReviewedAt?: string;
  };

  arabic: {
    correct: number;
    incorrect: number;
    currentStreak: number;
    longestStreak: number;
    lastReviewedAt?: string;
  };

  bothCorrectCount: number;
  consecutiveBothCorrect: number;

  masteryScore: number;
  nextReviewAt?: string;
};
```

The interface should clearly show cases where one language is stronger.

Example:

```text
Apple

Hebrew
24 correct
5 wrong
83% accuracy

Arabic
11 correct
22 wrong
33% accuracy
```

---

# Perfect-Run Progress

Hard-mode progress should be shown visually.

Example:

```text
Perfect runs

■ ■ ■ ■ □ □ □ □ □ □

4 / 10
```

Each completed flawless run fills one segment.

Only a complete flawless deck run should fill a segment.

Progress must persist if the app closes.

---

# Mastery Decay and Review

Passed decks should gradually become due for review.

Suggested statuses:

* Mastered
* Strong
* Rusty
* Needs review
* Forgotten

The review system should consider:

* Time since last session
* Hebrew accuracy
* Arabic accuracy
* Number of incorrect attempts
* Current streak
* Previous mastery level
* Hard-mode completion

The app should resurface older decks automatically on the dashboard.

Example:

```text
FOOD
Mastered 12 days ago
Status: Rusty
Review recommended
```

A simple spaced-repetition implementation is acceptable initially. The architecture should allow the review algorithm to become more advanced later.

---

# Text-to-Speech

The app should support separate Hebrew and Arabic text-to-speech.

## Hebrew

Use:

```text
he-IL
```

## Arabic

Prefer a Levantine locale when available, such as:

```text
ar-PS
ar-JO
ar-LB
ar-SY
```

The app should not assume every device has these voices installed.

Create a TTS abstraction layer that can support:

1. Device or browser speech synthesis
2. Azure Speech
3. Pre-generated local audio files
4. Manually recorded audio files

Example service interface:

```ts
interface SpeechService {
  getAvailableVoices(): Promise<SpeechVoice[]>;
  speak(text: string, options: SpeechOptions): Promise<void>;
  stop(): void;
}
```

The user must be able to select:

* Preferred Hebrew voice
* Preferred Arabic voice
* Speech rate
* Auto-play on reveal
* Repeat audio
* Use card-specific pronunciation text

Arabic text-to-speech must read the stored Levantine wording. The app should not automatically replace it with Modern Standard Arabic.

---

# RTL and Language Display

Hebrew and Arabic must render right-to-left.

English remains left-to-right.

The app must support mixed-direction content without layout corruption.

Each language field should have an explicit direction:

```css
.hebrew,
.arabic {
  direction: rtl;
  text-align: right;
}

.english {
  direction: ltr;
  text-align: left;
}
```

Do not depend only on automatic direction detection.

Arabic and Hebrew answers should use large, highly legible type.

Transliteration should be visually secondary.

---

# Visual Direction

The app should be visually engaging but not childish.

Desired feel:

* Bold
* Clean
* Slightly playful
* Rewarding
* Tactile
* Focused
* High contrast
* Minimal clutter

The cards should resemble premium physical index cards.

Suggested elements:

* Rounded card corners
* Layered card-stack shadow
* Slight card tilt during swiping
* Large category icons
* Animated progress rings or segments
* Distinct success and failure states
* Satisfying haptic feedback
* Subtle sound effects
* Confetti only for meaningful achievements

Avoid:

* Constant confetti
* Excessive gradients
* Tiny controls
* Dense dashboards
* Childlike mascots
* Too many colours at once
* Long blocking animations

The visual design should make hard repetition feel satisfying rather than punishing.

---

# Feedback and Rewards

## Correct answer

Show exactly which languages were correct.

Example:

```text
Hebrew ✓
Arabic ✓

Perfect.
```

## Partial failure

Example:

```text
Hebrew ✓
Arabic ✗

Correct Arabic answer:
تفاحة
tuffāḥa

Added to retry pile.
```

## Full failure

Example:

```text
Hebrew ✗
Arabic ✗

Review both answers.
```

## Hard-mode perfect run

Example:

```text
PERFECT RUN

10 / 10 correct

Run 5 of 10 complete.
```

## Deck mastery

Use a stronger completion state:

```text
DECK MASTERED

10 perfect runs
100 flawless answers
```

Confetti, haptics and a short achievement animation are appropriate here.

---

# Haptics and Sound

Provide optional feedback:

* Light vibration when a card is accepted
* Stronger vibration when a hard-mode run fails
* Distinct sounds for correct and incorrect answers
* Deck completion sound
* Perfect-run sound

All sounds and haptics must be individually disableable.

Do not rely on sound alone to convey results.

---

# Dashboard

The home screen should show:

* Continue current session
* Categories
* Decks due for review
* Recently studied decks
* Hard-mode progress
* Weakest cards
* Hebrew versus Arabic performance
* Overall streak
* Total mastered cards

Example:

```text
Good afternoon

Continue:
Food — Hard Mode
Run 4 / 10

Due for review:
Care and Hygiene
Counting

Weakest language:
Arabic — 61%

Cards mastered:
143
```

Keep the dashboard concise and touch-friendly.

---

# Category Screen

Each category should show:

* Category name
* Icon
* Number of cards
* Number mastered
* Review status
* Normal-mode completion
* Hard-mode progress
* Start or continue button

Example:

```text
CARE AND HYGIENE

24 cards
18 mastered
6 need review

Hard mode:
3 / 10 perfect runs

[CONTINUE]
```

---

# Deck and Card Management

The user needs a private content-management interface.

Allow the user to:

* Create categories
* Edit categories
* Create decks
* Edit deck names
* Set deck size
* Add cards
* Edit cards
* Delete cards
* Duplicate cards
* Move cards between decks
* Import cards
* Export cards
* Add accepted alternate answers
* Add notes
* Add images
* Add manually recorded audio
* Set Arabic dialect
* Set hard-mode run requirements

Bulk import should support CSV and JSON.

Example CSV columns:

```text
category
deck
english
hebrew
hebrew_transliteration
hebrew_pronunciation
arabic
arabic_transliteration
arabic_pronunciation
arabic_dialect
notes
tags
```

The import process should include a preview and validation stage before saving.

---

# Session Persistence

Study sessions must survive:

* App closure
* Browser refresh
* Device restart
* Temporary loss of connection

Persist:

* Current deck
* Current mode
* Current card order
* Current card position
* Retry pile
* Current hard-mode run
* Completed perfect runs
* Session answers
* Selected voices
* App settings

The user should be able to resume exactly where they stopped.

---

# Offline-First Behaviour

The app should work offline after initial installation.

Core offline features:

* Load categories and decks
* Study cards
* Save progress
* Use installed device voices
* View statistics
* Add and edit cards
* Resume sessions

Cloud synchronisation is not required for the first version.

The app should use local persistent storage.

Recommended options:

* IndexedDB for a web or PWA build
* SQLite for React Native or Expo
* Local filesystem for images and audio
* Optional JSON backup export

---

# Backup and Restore

Provide:

* Export all data as JSON
* Import full backup
* Export selected category
* Export selected deck
* Automatic local backup snapshots
* Restore from previous snapshot

A backup should include:

* Cards
* Categories
* Decks
* Progress
* Settings
* Audio references
* Images where practical

Because this is a personal learning database, data loss prevention is important.

---

# Search and Filters

The user should be able to search cards by:

* English
* Hebrew
* Arabic
* Transliteration
* Category
* Deck
* Tag
* Dialect
* Mastery
* Error rate

Useful filters:

* Arabic weakest
* Hebrew weakest
* Never studied
* Due for review
* Most frequently missed
* Hard-mode failures
* Missing audio
* Missing transliteration

---

# Accessibility

Include:

* Large touch targets
* Screen-reader labels
* High-contrast mode
* Reduced-motion mode
* Adjustable text size
* Disable haptics
* Disable sounds
* Keyboard support on desktop
* Clear focus indicators
* Colour-independent success and failure indicators

Correct and incorrect results must use text and icons, not only green and red.

---

# Settings

The settings screen should include:

## Study

* Default study mode
* Default deck size
* Required hard-mode perfect runs
* Shuffle cards
* Shuffle after failure
* Show transliteration
* Show hints
* Require typing
* Ignore diacritics
* Accept alternate answers
* Enable mastery decay
* Automatically start retry pile

## Audio

* Hebrew voice
* Arabic voice
* Speech speed
* Auto-play Hebrew
* Auto-play Arabic
* Repeat count
* Sound effects
* Haptics

## Appearance

* Light theme
* Dark theme
* System theme
* High contrast
* Reduced motion
* Font size
* Card animation intensity

## Data

* Export backup
* Import backup
* Reset progress
* Delete all data

Destructive actions must require confirmation.

---

# Recommended Technology Stack

The developer may choose an equivalent stack, but the preferred direction is:

## Mobile-first option

* React Native
* Expo
* TypeScript
* Expo Router
* SQLite
* Zustand or Redux Toolkit
* React Native Reanimated
* React Native Gesture Handler
* Expo Speech or an abstracted native TTS service
* Expo Haptics
* Expo AV or equivalent audio handling
* Zod for validation

## PWA option

* React
* TypeScript
* Vite
* PWA service worker
* IndexedDB with Dexie
* Zustand
* Framer Motion or Motion
* Pointer Events
* Web Speech API
* Zod

A React Native or Expo application is preferred if native mobile behaviour, local storage, gestures, haptics and offline access are the priority.

The architecture should keep the study engine independent from the visual components.

---

# Suggested Project Structure

```text
src/
  app/
  components/
    cards/
    controls/
    feedback/
    progress/
    forms/
  features/
    categories/
    decks/
    study/
    hardMode/
    review/
    statistics/
    settings/
    importExport/
  services/
    database/
    speech/
    audio/
    backup/
    answerValidation/
  stores/
  hooks/
  types/
  utils/
  constants/
  assets/
```

---

# Study Engine Requirements

The study engine should be implemented as deterministic logic separate from the UI.

Suggested state:

```ts
type StudySession = {
  id: string;
  deckId: string;

  mode: "normal" | "hard" | "brutal";
  promptDirection: string;

  activeCardIds: string[];
  retryCardIds: string[];
  completedCardIds: string[];

  currentCardId?: string;
  currentIndex: number;

  currentRunCorrect: number;
  currentRunFailed: boolean;

  perfectRunsCompleted: number;
  perfectRunsRequired: number;

  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};
```

Core study logic should have unit tests for:

* Both answers correct
* Hebrew wrong only
* Arabic wrong only
* Both wrong
* Retry-pile insertion
* Duplicate retry prevention
* Normal-mode completion
* Hard-mode reset
* Perfect-run increment
* Hard-mode mastery
* Brutal-mode full reset
* Session restoration
* Answer normalisation
* Alternate-answer acceptance

---

# Answer Validation

The validation service should return separate results.

```ts
type AnswerResult = {
  hebrew: {
    correct: boolean;
    submitted: string;
    expected: string[];
  };

  arabic: {
    correct: boolean;
    submitted: string;
    expected: string[];
  };

  fullyCorrect: boolean;
};
```

Do not reduce the answer to a single true or false value before storing the language-specific result.

Support a list of accepted answers:

```ts
type AcceptedAnswer = {
  value: string;
  label?: string;
  dialect?: string;
};
```

---

# Analytics

All analytics are local.

Track:

* Total study sessions
* Total cards answered
* Hebrew accuracy
* Arabic accuracy
* Both-correct accuracy
* Perfect runs completed
* Hard-mode failures
* Current study streak
* Longest study streak
* Average session length
* Most difficult categories
* Most frequently failed cards
* Review completion
* Time spent studying

Do not add third-party tracking unless explicitly requested later.

---

# Privacy

This is a private personal application.

Requirements:

* No advertising
* No social tracking
* No public profiles
* No external analytics by default
* No automatic upload of vocabulary or recordings
* API keys must not be hardcoded
* Cloud TTS credentials must be stored securely
* Local data should remain local unless the user explicitly exports or syncs it

---

# MVP Scope

The first usable release should include:

1. Mobile-first interface
2. Category and deck selection
3. Card creation and editing
4. English → Hebrew and Arabic study direction
5. Self-assessment mode
6. Typed-answer mode
7. Swipe gestures
8. Normal retry-pile mode
9. Hard mode
10. Ten perfect-run mastery requirement
11. Hebrew and Arabic TTS abstraction
12. Independent Hebrew and Arabic accuracy
13. Local progress storage
14. Session restoration
15. Basic dashboard
16. Dark and light themes
17. JSON export and import
18. RTL support
19. Offline functionality
20. Basic automated tests

---

# Later Features

These should not block the MVP:

* Image prompts
* Audio-only quizzes
* Speech recognition
* Native speaker recordings
* Azure Levantine TTS integration
* Automatic card generation
* Root and cognate comparison
* Hebrew-Arabic similarity mode
* Sentence-building exercises
* Conjugation drills
* Timed mode
* Daily challenges
* Achievement system
* Cloud synchronisation
* Cross-device accounts
* Desktop build
* Smart spaced repetition
* AI-generated example sentences
* Handwriting recognition

---

# Acceptance Criteria

The MVP is accepted when:

* The app is comfortable to use on a phone.
* Cards occupy most of the study screen.
* Cards respond correctly to touch dragging and swiping.
* Hebrew and Arabic render correctly in RTL.
* The user can create, edit and delete cards.
* The user can study a selected category or deck.
* Hebrew and Arabic answers are assessed independently.
* A card with one incorrect language enters the retry pile.
* Normal mode continues until every card is fully correct.
* Hard mode restarts the complete stack after any mistake.
* A flawless full-deck run increments perfect-run progress once.
* A deck can require ten flawless runs before passing.
* Progress is not lost when the app closes.
* Hebrew and Arabic audio can be played independently.
* The app functions without an active internet connection.
* The user can export and restore their data.
* The UI remains visually engaging during repetitive sessions.
* Automated tests cover the central study and reset logic.

---

# Final Product Goal

The final app should create a strict but rewarding learning loop:

See the English prompt
Recall Hebrew
Recall Levantine Arabic
Submit or reveal
Receive separate feedback
Retry any weak language
Complete the entire deck perfectly
Repeat until the vocabulary is genuinely retained

The app should not allow vague familiarity to count as mastery.

It should be difficult enough to force real recall, but polished, tactile and visually satisfying enough that the user wants to keep going.
