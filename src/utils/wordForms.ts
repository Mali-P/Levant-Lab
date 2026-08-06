import type { LanguageSide } from '../types';

export type WordForm = {
  script: string;
  transliteration?: string;
  /** 'feminine' or 'masculine'. Absent when one form serves everyone. */
  gender?: 'feminine' | 'masculine';
  /** Symbol to show beside the word. Absent when there is nothing to contrast. */
  marker?: string;
  /** Read by assistive technology in place of the symbol. */
  label?: string;
  /**
   * Bundled pronunciation clip for this exact form. Absent on cards the
   * learner added themselves, which fall back to device speech.
   */
  audioPath?: string;
  /** Pronunciation override for this form, when the visible text mis-speaks. */
  pronunciationText?: string;
};

/**
 * The forms of one word, in the order they should be read: feminine first,
 * matching how the starter table is written. A word without a gendered pair
 * comes back as a single unmarked form, so callers can render every card the
 * same way without checking for `forms` themselves.
 */
export function wordForms(side: LanguageSide): WordForm[] {
  if (!side.forms) {
    return [
      {
        script: side.script,
        transliteration: side.transliteration,
        audioPath: side.audioPath,
        pronunciationText: side.pronunciationText,
      },
    ];
  }
  return [
    {
      script: side.forms.feminine.script,
      transliteration: side.forms.feminine.transliteration,
      gender: 'feminine',
      marker: '♀',
      label: 'feminine',
      audioPath: side.forms.feminine.audioPath,
      pronunciationText: side.forms.feminine.pronunciationText,
    },
    {
      script: side.forms.masculine.script,
      transliteration: side.forms.masculine.transliteration,
      gender: 'masculine',
      marker: '♂',
      label: 'masculine',
      audioPath: side.forms.masculine.audioPath,
      pronunciationText: side.forms.masculine.pronunciationText,
    },
  ];
}
