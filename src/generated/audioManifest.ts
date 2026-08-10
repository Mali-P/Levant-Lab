/**
 * GENERATED FILE — rewritten by `npm run generate-audio`. Do not edit by hand.
 *
 * It is committed so the app builds and validates without anyone needing
 * Google or Gemini credentials. An empty map simply means no clips have been
 * generated yet; every speaker button then falls back to device speech.
 */

/** `azure` appears only on clips recorded before Arabic moved to Gemini. */
export type AudioProvider = 'google' | 'azure' | 'gemini';

export type AudioClipRecord = {
  /** Path under the bundled assets, e.g. `assets/audio/he/x_feminine.mp3`. */
  path: string;
  language: 'hebrew' | 'arabic';
  /**
   * Which form was recorded: `feminine` / `masculine` for a grammatical pair,
   * `neutral` for a word said one way, or the joined perspective keys of a
   * speaker/listener variant — `f2m`, or `f2m+m2m` where two perspectives
   * share one wording and therefore one clip. See `FormName` in `audio/paths`.
   */
  form: string;
  provider: AudioProvider;
  /**
   * How it was said. A provider voice name for Google and Azure, e.g.
   * `he-IL-Wavenet-A`; for Gemini, model, voice and a digest of the dialect
   * instruction — `gemini-2.5-flash-preview-tts/Kore/4f1c8a90` — since all
   * three decide the accent.
   */
  voice: string;
  /** English meaning, for the review screen. */
  english: string;
  /** What the learner sees. */
  text: string;
  /** What was actually sent to the provider. */
  spoken: string;
  transliteration?: string;
  /** Fingerprint of voice + spoken text. A change here forces a regenerate. */
  sourceHash: string;
  bytes: number;
  /** ISO-8601, e.g. `2026-08-06T14:10:20.998Z`. */
  generatedAt: string;
};

export const AUDIO_MANIFEST_VERSION = 1;

export const AUDIO_CLIPS: Record<string, AudioClipRecord> = {
  "ar/care-and-hygiene__bathroom-shelf__comb_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__comb_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "comb",
    "text": "مشط",
    "spoken": "مشط",
    "transliteration": "mishṭ",
    "sourceHash": "d8695328d6a30f5b",
    "bytes": 12428,
    "generatedAt": "2026-08-09T14:43:08.941Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__deodorant_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__deodorant_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "deodorant",
    "text": "مزيل عرق",
    "spoken": "مزيل عرق",
    "transliteration": "mazīl ʿaraq",
    "sourceHash": "294b1903fc3ec39d",
    "bytes": 10988,
    "generatedAt": "2026-08-09T14:44:17.178Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__hairbrush_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__hairbrush_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "hairbrush",
    "text": "فرشاية شعر",
    "spoken": "فرشاية شعر",
    "transliteration": "firshāyet shaʿar",
    "sourceHash": "9a4dbddbee9dfad8",
    "bytes": 13580,
    "generatedAt": "2026-08-09T14:45:03.850Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__razor_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__razor_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "razor",
    "text": "شفرة حلاقة",
    "spoken": "شفرة حلاقة",
    "transliteration": "shafret ḥalāqa",
    "sourceHash": "d65c4c2e6f131a75",
    "bytes": 14156,
    "generatedAt": "2026-08-09T14:44:05.284Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__shampoo_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__shampoo_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "shampoo",
    "text": "شامبو",
    "spoken": "شامبو",
    "transliteration": "shāmbū",
    "sourceHash": "b4fb3329a58343a3",
    "bytes": 10700,
    "generatedAt": "2026-08-09T14:41:26.225Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__soap_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__soap_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "soap",
    "text": "صابون",
    "spoken": "صابون",
    "transliteration": "ṣābūn",
    "sourceHash": "1fbd1d3e0acc4eb8",
    "bytes": 15596,
    "generatedAt": "2026-08-09T14:41:24.411Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__toilet-paper_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__toilet-paper_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "toilet paper",
    "text": "ورق حمّام",
    "spoken": "ورق حمّام",
    "transliteration": "waraq ḥammām",
    "sourceHash": "3fd1e8e013d45795",
    "bytes": 12140,
    "generatedAt": "2026-08-09T14:43:05.296Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__toothbrush_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__toothbrush_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "toothbrush",
    "text": "فرشاية سنان",
    "spoken": "فرشاية سنان",
    "transliteration": "firshāyet snān",
    "sourceHash": "83179c82d7fe6ab2",
    "bytes": 17036,
    "generatedAt": "2026-08-09T14:41:28.145Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__toothpaste_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__toothpaste_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "toothpaste",
    "text": "معجون سنان",
    "spoken": "معجون سنان",
    "transliteration": "maʿjūn snān",
    "sourceHash": "21abbe402bb55d82",
    "bytes": 17036,
    "generatedAt": "2026-08-09T14:41:29.884Z"
  },
  "ar/care-and-hygiene__bathroom-shelf__towel_neutral": {
    "path": "assets/audio/ar/care-and-hygiene__bathroom-shelf__towel_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/4923dfba",
    "english": "towel",
    "text": "منشفة",
    "spoken": "منشفة",
    "transliteration": "manshafe",
    "sourceHash": "a6d4c01fa2c320ee",
    "bytes": 12428,
    "generatedAt": "2026-08-09T14:43:03.246Z"
  },
  "ar/counting-and-numbers__one-to-ten__eight_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__eight_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "eight",
    "text": "تمانية",
    "spoken": "تْمانْيِة",
    "transliteration": "tmānye",
    "sourceHash": "5fcf22f810a60de2",
    "bytes": 8972,
    "generatedAt": "2026-08-08T21:59:04.445Z"
  },
  "ar/counting-and-numbers__one-to-ten__four_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__four_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "four",
    "text": "أربعة",
    "spoken": "أَرْبَعَة",
    "transliteration": "arbaʿa",
    "sourceHash": "586b4637d70b0f62",
    "bytes": 10988,
    "generatedAt": "2026-08-08T21:41:03.937Z"
  },
  "ar/counting-and-numbers__one-to-ten__one_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__one_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "one",
    "text": "واحد",
    "spoken": "واحَد",
    "transliteration": "wāḥad",
    "sourceHash": "084d7cb47bf4bf05",
    "bytes": 11852,
    "generatedAt": "2026-08-08T21:33:24.743Z"
  },
  "ar/counting-and-numbers__one-to-ten__three_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__three_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "three",
    "text": "تلاتة",
    "spoken": "تَلاتِة",
    "transliteration": "talāte",
    "sourceHash": "2bdb14837f90adca",
    "bytes": 12716,
    "generatedAt": "2026-08-08T21:38:04.685Z"
  },
  "ar/counting-and-numbers__one-to-ten__two_neutral": {
    "path": "assets/audio/ar/counting-and-numbers__one-to-ten__two_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "two",
    "text": "تنين",
    "spoken": "تْنِين",
    "transliteration": "tnēn",
    "sourceHash": "731a7aa7af0caafe",
    "bytes": 10700,
    "generatedAt": "2026-08-08T21:33:26.439Z"
  },
  "ar/medical__at-the-clinic__appointment_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__appointment_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "appointment",
    "text": "موعد",
    "spoken": "مَوْعِدْ",
    "transliteration": "mawʿed",
    "sourceHash": "b6be735820419202",
    "bytes": 12716,
    "generatedAt": "2026-08-10T12:27:04.631Z"
  },
  "ar/medical__at-the-clinic__blood_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__blood_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "blood",
    "text": "دمّ",
    "spoken": "دمّ",
    "transliteration": "damm",
    "sourceHash": "561f933b542d458d",
    "bytes": 8396,
    "generatedAt": "2026-08-10T12:30:04.906Z"
  },
  "ar/medical__at-the-clinic__clinic_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__clinic_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "clinic",
    "text": "عيادة",
    "spoken": "عِيادِه",
    "transliteration": "ʿiyāde",
    "sourceHash": "51b4c58240f246ea",
    "bytes": 9260,
    "generatedAt": "2026-08-10T12:24:05.155Z"
  },
  "ar/medical__at-the-clinic__doctor_feminine": {
    "path": "assets/audio/ar/medical__at-the-clinic__doctor_feminine.mp3",
    "language": "arabic",
    "form": "feminine",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "doctor",
    "text": "دكتورة",
    "spoken": "دكتورة",
    "transliteration": "doktōra",
    "sourceHash": "daa5c4e9fc09fb61",
    "bytes": 11564,
    "generatedAt": "2026-08-10T12:22:27.041Z"
  },
  "ar/medical__at-the-clinic__doctor_masculine": {
    "path": "assets/audio/ar/medical__at-the-clinic__doctor_masculine.mp3",
    "language": "arabic",
    "form": "masculine",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "doctor",
    "text": "دكتور",
    "spoken": "دكتور",
    "transliteration": "doktōr",
    "sourceHash": "3ca1876b1dd716f8",
    "bytes": 8972,
    "generatedAt": "2026-08-10T12:22:28.953Z"
  },
  "ar/medical__at-the-clinic__fever_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__fever_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "fever",
    "text": "حرارة",
    "spoken": "حَرارَه",
    "transliteration": "ḥarāra",
    "sourceHash": "dae461a4567a8e65",
    "bytes": 13868,
    "generatedAt": "2026-08-10T12:25:08.288Z"
  },
  "ar/medical__at-the-clinic__hospital_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__hospital_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "hospital",
    "text": "مستشفى",
    "spoken": "مستشفى",
    "transliteration": "mustashfa",
    "sourceHash": "46839f08f4813d98",
    "bytes": 9836,
    "generatedAt": "2026-08-10T12:24:03.493Z"
  },
  "ar/medical__at-the-clinic__medicine_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__medicine_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "medicine",
    "text": "دوا",
    "spoken": "دوا",
    "transliteration": "dawa",
    "sourceHash": "07da8647ec1e6e78",
    "bytes": 8108,
    "generatedAt": "2026-08-10T12:24:08.623Z"
  },
  "ar/medical__at-the-clinic__nurse_feminine": {
    "path": "assets/audio/ar/medical__at-the-clinic__nurse_feminine.mp3",
    "language": "arabic",
    "form": "feminine",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "nurse",
    "text": "ممرّضة",
    "spoken": "ممرّضه",
    "transliteration": "mumarriḍa",
    "sourceHash": "f119d878b3f76c69",
    "bytes": 9548,
    "generatedAt": "2026-08-10T12:27:25.889Z"
  },
  "ar/medical__at-the-clinic__nurse_masculine": {
    "path": "assets/audio/ar/medical__at-the-clinic__nurse_masculine.mp3",
    "language": "arabic",
    "form": "masculine",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "nurse",
    "text": "ممرّض",
    "spoken": "مُمَرِّضْ",
    "transliteration": "mumarriḍ",
    "sourceHash": "8134e97bf8853632",
    "bytes": 12428,
    "generatedAt": "2026-08-10T12:22:32.974Z"
  },
  "ar/medical__at-the-clinic__pain_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__pain_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "pain",
    "text": "وجع",
    "spoken": "وجع",
    "transliteration": "wajaʿ",
    "sourceHash": "79a7b88294551d57",
    "bytes": 10988,
    "generatedAt": "2026-08-10T12:25:05.636Z"
  },
  "ar/medical__at-the-clinic__pharmacy_neutral": {
    "path": "assets/audio/ar/medical__at-the-clinic__pharmacy_neutral.mp3",
    "language": "arabic",
    "form": "neutral",
    "provider": "gemini",
    "voice": "gemini-2.5-flash-preview-tts/Kore/f1fb7f6a",
    "english": "pharmacy",
    "text": "صيدلية",
    "spoken": "صَيْدَلِيِّه",
    "transliteration": "ṣēdaliyye",
    "sourceHash": "8f4bd5e0512e5cc4",
    "bytes": 12428,
    "generatedAt": "2026-08-10T12:24:07.131Z"
  }
};
