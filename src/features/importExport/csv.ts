/** Minimal RFC-4180 reader: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const text = input.replace(/^﻿/, '');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // Swallowed; the \n that follows ends the row.
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export function toCsv(rows: string[][]): string {
  const escape = (cell: string) =>
    /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
  return rows.map((r) => r.map(escape).join(',')).join('\r\n');
}

export const CSV_COLUMNS = [
  'category',
  'deck',
  'english',
  'hebrew',
  'hebrew_transliteration',
  'hebrew_pronunciation',
  // A gendered pair is optional. Fill the feminine and masculine columns to
  // split a word; leave them empty and `hebrew` / `arabic` is the single form
  // everybody uses.
  'hebrew_feminine',
  'hebrew_feminine_transliteration',
  'hebrew_masculine',
  'hebrew_masculine_transliteration',
  'arabic',
  'arabic_transliteration',
  'arabic_pronunciation',
  'arabic_feminine',
  'arabic_feminine_transliteration',
  'arabic_masculine',
  'arabic_masculine_transliteration',
  'arabic_dialect',
  'notes',
  'tags',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];
