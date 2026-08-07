import type { ArabicDialect, GenderedForms } from '../../types';
import { CSV_COLUMNS, parseCsv, type CsvColumn } from './csv';

export type ImportRow = {
  line: number;
  category: string;
  deck: string;
  english: string;
  hebrew: string;
  hebrewTransliteration?: string;
  hebrewPronunciation?: string;
  hebrewForms?: GenderedForms;
  arabic: string;
  arabicTransliteration?: string;
  arabicPronunciation?: string;
  arabicForms?: GenderedForms;
  arabicDialect?: ArabicDialect;
  notes?: string;
  tags: string[];
};

export type ImportIssue = {
  line: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ImportPreview = {
  rows: ImportRow[];
  issues: ImportIssue[];
  /** Rows with no blocking error; only these are written on confirm. */
  importable: ImportRow[];
};

const DIALECTS: ArabicDialect[] = [
  'Palestinian',
  'Jordanian',
  'Lebanese',
  'Syrian',
  'General Levantine',
];

function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Parses and validates without touching the database. The caller shows this
 * preview and only commits after the user confirms.
 */
export function previewCsvImport(text: string): ImportPreview {
  const table = parseCsv(text);
  const issues: ImportIssue[] = [];

  if (table.length === 0) {
    return { rows: [], importable: [], issues: [
      { line: 0, field: 'file', message: 'The file is empty.', severity: 'error' },
    ] };
  }

  const header = table[0].map(normaliseHeader);
  const index = (col: CsvColumn) => header.indexOf(col);

  // A language can arrive either as one plain column or as a gendered pair,
  // so any one of the three satisfies the requirement.
  const REQUIRED: CsvColumn[][] = [
    ['english'],
    ['hebrew', 'hebrew_feminine', 'hebrew_masculine'],
    ['arabic', 'arabic_feminine', 'arabic_masculine'],
  ];
  for (const alternatives of REQUIRED) {
    if (alternatives.every((col) => index(col) === -1)) {
      issues.push({
        line: 1,
        field: alternatives[0],
        message: 'Missing required column "' + alternatives[0] + '".',
        severity: 'error',
      });
    }
  }
  for (const col of header) {
    if (!CSV_COLUMNS.includes(col as CsvColumn)) {
      issues.push({
        line: 1,
        field: col,
        message: 'Unknown column "' + col + '" will be ignored.',
        severity: 'warning',
      });
    }
  }
  if (issues.some((i) => i.severity === 'error')) {
    return { rows: [], importable: [], issues };
  }

  const cell = (row: string[], col: CsvColumn): string => {
    const i = index(col);
    return i === -1 ? '' : (row[i] ?? '').trim();
  };

  /**
   * Builds the gendered pair for one language. A row that fills only one of
   * the two columns is still usable — the missing side falls back to the
   * plain word — but it is flagged, because a half-filled pair is far more
   * likely to be a typo than a deliberate choice.
   */
  const genderedForms = (
    raw: string[],
    line: number,
    language: 'hebrew' | 'arabic',
    base: string,
    baseTransliteration: string,
  ): GenderedForms | undefined => {
    const at = (suffix: string) => cell(raw, (language + suffix) as CsvColumn);
    const feminine = at('_feminine');
    const masculine = at('_masculine');
    if (!feminine && !masculine) return undefined;

    if (!feminine || !masculine) {
      issues.push({
        line,
        field: language + (feminine ? '_masculine' : '_feminine'),
        message:
          'Only one gendered form was given; the other falls back to "' +
          base +
          '".',
        severity: 'warning',
      });
    }

    const forms: GenderedForms = {
      feminine: {
        script: feminine || base,
        transliteration: at('_feminine_transliteration') || baseTransliteration || undefined,
      },
      masculine: {
        script: masculine || base,
        transliteration: at('_masculine_transliteration') || baseTransliteration || undefined,
      },
    };

    // Two identical forms are one word written twice, not a pair.
    const same =
      forms.feminine.script === forms.masculine.script &&
      forms.feminine.transliteration === forms.masculine.transliteration;
    return same ? undefined : forms;
  };

  const rows: ImportRow[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < table.length; r++) {
    const raw = table[r];
    const line = r + 1;

    // A file may carry only the gendered columns. The feminine form — the
    // headline form everywhere in this app — then stands in as the plain word
    // rather than the row failing as empty, with the masculine one behind it
    // for a file that lists only that.
    const hebrew =
      cell(raw, 'hebrew') || cell(raw, 'hebrew_feminine') || cell(raw, 'hebrew_masculine');
    const arabic =
      cell(raw, 'arabic') || cell(raw, 'arabic_feminine') || cell(raw, 'arabic_masculine');
    const hebrewTransliteration =
      cell(raw, 'hebrew_transliteration') ||
      cell(raw, 'hebrew_feminine_transliteration') ||
      cell(raw, 'hebrew_masculine_transliteration');
    const arabicTransliteration =
      cell(raw, 'arabic_transliteration') ||
      cell(raw, 'arabic_feminine_transliteration') ||
      cell(raw, 'arabic_masculine_transliteration');

    const row: ImportRow = {
      line,
      category: cell(raw, 'category') || 'Imported',
      deck: cell(raw, 'deck') || 'Imported deck',
      english: cell(raw, 'english'),
      hebrew,
      hebrewTransliteration: hebrewTransliteration || undefined,
      hebrewPronunciation: cell(raw, 'hebrew_pronunciation') || undefined,
      hebrewForms: genderedForms(raw, line, 'hebrew', hebrew, hebrewTransliteration),
      arabic,
      arabicTransliteration: arabicTransliteration || undefined,
      arabicPronunciation: cell(raw, 'arabic_pronunciation') || undefined,
      arabicForms: genderedForms(raw, line, 'arabic', arabic, arabicTransliteration),
      notes: cell(raw, 'notes') || undefined,
      tags: cell(raw, 'tags')
        .split(/[;|]/)
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const dialect = cell(raw, 'arabic_dialect');
    if (dialect) {
      const match = DIALECTS.find(
        (d) => d.toLowerCase() === dialect.toLowerCase(),
      );
      if (match) {
        row.arabicDialect = match;
      } else {
        issues.push({
          line,
          field: 'arabic_dialect',
          message: '"' + dialect + '" is not a Levantine dialect option.',
          severity: 'warning',
        });
      }
    }

    let blocked = false;
    for (const field of ['english', 'hebrew', 'arabic'] as const) {
      if (!row[field]) {
        issues.push({
          line,
          field,
          message: 'Required value is empty.',
          severity: 'error',
        });
        blocked = true;
      }
    }

    const key = (row.deck + '|' + row.english).toLowerCase();
    if (seen.has(key)) {
      issues.push({
        line,
        field: 'english',
        message: '"' + row.english + '" appears more than once in this deck.',
        severity: 'warning',
      });
    }
    seen.add(key);

    rows.push(row);
    if (!blocked) continue;
  }

  const blockedLines = new Set(
    issues.filter((i) => i.severity === 'error').map((i) => i.line),
  );

  return {
    rows,
    issues,
    importable: rows.filter((r) => !blockedLines.has(r.line)),
  };
}
