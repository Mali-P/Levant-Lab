# Alphabet assets

The alphabet modules ship complete except for two things that cannot be
generated: **authentic handwritten letterforms** and **stroke-order
sequences**. This document is the contract for dropping them in.

Nothing in the code needs to change when they arrive. Every slot is already
typed, every screen already hides the view it cannot honestly show, and
`npm run validate-alphabet` already fails the build on a path that points at
nothing.

## Why they are not just a font

Israeli cursive (כתב) is a different set of letterforms from print (דפוס), not
a slanted version of it — cursive `ל` and printed `ל` share almost no strokes.
Everyday Arabic handwriting simplifies printed detail but keeps the joins and
the dots that decide which letter it is.

So the rule the code enforces is: **the handwritten view is a drawn asset or it
is absent.** Applying `font-style: italic` or a decorative "script" face to the
printed glyph would teach a shape nobody writes, which is worse than teaching
nothing. Where no asset exists the letter card shows the printed form and says
the handwritten form is not available yet, and the progress screen leaves
handwritten recognition unscored rather than crediting it.

## Handwritten letterforms

Drop SVG (preferred) or PNG at:

```
public/assets/alphabets/hebrew/handwritten/<letterId>.svg
public/assets/alphabets/arabic/handwritten/<letterId>-<form>.svg
```

`letterId` is the id in `src/data/alphabets/*.ts` (`alef`, `bet`, … `ba`,
`ta_emphatic`, …) — never the character itself, which is not filename-safe.
Arabic `form` is one of `isolated`, `initial`, `medial`, `final`.

Then declare it on the letter record:

```ts
// Hebrew
handwrittenForm: {
  src: 'assets/alphabets/hebrew/handwritten/alef.svg',
  label: 'handwritten Alef',
},
finalHandwrittenForm: { … },   // for kaf, mem, nun, pe, tsadi

// Arabic
handwrittenForms: {
  isolated: {
    src: 'assets/alphabets/arabic/handwritten/ba-isolated.svg',
    label: 'handwritten Ba, isolated',
  },
  initial: { … },
},
```

Paths are relative to `public/`, matching the audio manifest convention, so the
app keeps working when served from a subdirectory.

Requirements:

- Single colour, `currentColor` where possible, so the form follows the theme.
- Trimmed to the glyph's own bounds; the card handles spacing.
- `label` is read aloud in place of the image — describe the form, not the file.
- Licensed for redistribution inside the app. Record the licence in this file.

## Stroke-order sequences

Authored as data, not as animation frames, so one sequence can drive the
demonstration, the tracing guide and the free-writing comparison:

```ts
strokeOrder: {
  print: {
    viewBox: 100,                       // always a 100x100 box
    strokes: [
      { d: 'M20 20 L80 20', start: [20, 20], hint: 'across the top, right to left' },
      { d: 'M80 20 L80 80', start: [80, 20] },
    ],
  },
  handwritten: { … },                   // a separate sequence, never derived
}
```

Print and handwritten strokes are kept apart deliberately. For Arabic, the
sequences belong to the letter's shapes (`strokeOrder.isolated`, `.initial`, …)
and should show how the letter *connects*, rather than teaching each contextual
shape as an unrelated drawing.

Store any working files under `public/assets/alphabets/<script>/strokes/`.

## Fonts

The printed stacks live in `src/styles/global.css` as `--script-he` and
`--script-ar`, declared separately because one font for both scripts is what
produces collided niqqud or broken Arabic joining.

Currently both resolve to system and Noto faces. If you bundle a face, it must
correctly render Hebrew niqqud and dagesh, Arabic joining and harakat, and the
lam-alif ligature, and it must be licensed for distribution — SIL OFL faces such
as Noto Sans Hebrew, Frank Ruhl Libre and Noto Naskh Arabic qualify. Verify the
licence yourself before shipping; nothing here has been vetted for you.

There is deliberately **no** handwriting font variable. A handwriting face would
reintroduce exactly the fake-cursive problem the asset contract exists to avoid.

## Audio

Alphabet clips are generated separately from the vocabulary:

```
npm run generate-alphabet-audio                  # both scripts
npm run generate-alphabet-audio -- --script=hebrew --dry-run
npm run validate-alphabet                        # no credentials needed
npm run validate-alphabet -- --require-audio     # release check
```

Hebrew uses the Google `he-IL` voice; Arabic uses Gemini TTS under the
Palestinian style direction, from the same `.env` the vocabulary pipeline
reads, so ffmpeg has to be installed for the Arabic half to produce anything.
Clips land in
`public/assets/audio/alphabet/{he,ar}/` under stable ids such as
`letter_alef_name.mp3`, and the app only ever plays bundled files — a letter
with no clip falls back to device speech rather than reaching the network.

The content currently expects **210 clips**: a name, a sound and an example
word for each letter and vowel mark, plus names and examples for the extra
Arabic characters.

## Review still outstanding

The letter names, sounds, example words and Levantine notes in
`src/data/alphabets/` were authored from reference material and have **not**
been reviewed by a native speaker. Before release:

- Hebrew content needs a native or highly fluent Israeli Hebrew speaker.
- Arabic content needs a Palestinian or Jordanian Levantine speaker, checking
  in particular the `levantineNote` fields on ث ذ ظ ق ج and the example words,
  which are written to be colloquial rather than Modern Standard.
