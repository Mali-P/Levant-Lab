import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';
import { previewCsvImport } from './importCards';

const HEADER =
  'category,deck,english,hebrew,hebrew_transliteration,arabic,arabic_transliteration,arabic_dialect,tags';

describe('csv parsing', () => {
  it('reads quoted fields containing commas', () => {
    const rows = parseCsv('a,"b,c",d\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b,c', 'd']);
    expect(rows[1]).toEqual(['1', '2', '3']);
  });

  it('reads escaped quotes and CRLF line endings', () => {
    const rows = parseCsv('a,"say ""hi"""\r\nb,c\r\n');
    expect(rows[0]).toEqual(['a', 'say "hi"']);
    expect(rows[1]).toEqual(['b', 'c']);
  });

  it('round-trips through the writer', () => {
    const rows = [
      ['english', 'notes'],
      ['apple', 'has a comma, and "quotes"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('preserves Hebrew and Arabic script', () => {
    const rows = parseCsv('english,hebrew,arabic\napple,תפוח,تفاحة');
    expect(rows[1]).toEqual(['apple', 'תפוח', 'تفاحة']);
  });
});

describe('import preview', () => {
  it('accepts a well-formed file', () => {
    const preview = previewCsvImport(
      HEADER + '\nFood,Fruit,apple,תפוח,tapuach,تفاحة,tuffaha,Palestinian,fruit;food',
    );
    expect(preview.issues).toEqual([]);
    expect(preview.importable).toHaveLength(1);
    expect(preview.importable[0].arabicDialect).toBe('Palestinian');
    expect(preview.importable[0].tags).toEqual(['fruit', 'food']);
  });

  it('blocks rows missing a required language', () => {
    const preview = previewCsvImport(HEADER + '\nFood,Fruit,apple,,tapuach,تفاحة,,,');
    expect(preview.importable).toHaveLength(0);
    expect(preview.issues[0]).toMatchObject({ field: 'hebrew', severity: 'error' });
  });

  it('imports good rows even when another row is broken', () => {
    const preview = previewCsvImport(
      HEADER +
        '\nFood,Fruit,apple,תפוח,,تفاحة,,,' +
        '\nFood,Fruit,,לחם,,خبز,,,',
    );
    expect(preview.rows).toHaveLength(2);
    expect(preview.importable).toHaveLength(1);
    expect(preview.importable[0].english).toBe('apple');
  });

  it('rejects a file with no english column', () => {
    const preview = previewCsvImport('category,deck,hebrew,arabic\nFood,Fruit,תפוח,تفاحة');
    expect(preview.importable).toHaveLength(0);
    expect(preview.issues.some((i) => i.field === 'english')).toBe(true);
  });

  it('warns about an unrecognised dialect but still imports', () => {
    const preview = previewCsvImport(
      HEADER + '\nFood,Fruit,apple,תפוח,,تفاحة,,Egyptian,',
    );
    expect(preview.importable).toHaveLength(1);
    expect(preview.importable[0].arabicDialect).toBeUndefined();
    expect(preview.issues[0].severity).toBe('warning');
  });

  it('reads a feminine and masculine pair for both languages', () => {
    const header =
      'english,hebrew_feminine,hebrew_feminine_transliteration,' +
      'hebrew_masculine,hebrew_masculine_transliteration,' +
      'arabic_feminine,arabic_feminine_transliteration,' +
      'arabic_masculine,arabic_masculine_transliteration';
    const preview = previewCsvImport(
      header + '\ngood,טובה,tova,טוב,tov,منيحة,mniha,منيح,mnih',
    );

    expect(preview.issues).toEqual([]);
    const row = preview.importable[0];
    expect(row.hebrewForms).toEqual({
      feminine: { script: 'טובה', transliteration: 'tova' },
      masculine: { script: 'טוב', transliteration: 'tov' },
    });
    expect(row.arabicForms?.feminine.script).toBe('منيحة');
    // The masculine form stands in as the plain word when no `hebrew` column
    // is given, so the row is importable rather than failing as empty.
    expect(row.hebrew).toBe('טוב');
    expect(row.arabic).toBe('منيح');
  });

  it('leaves a word with no gendered columns unsplit', () => {
    const preview = previewCsvImport(HEADER + '\nFood,Fruit,apple,תפוח,,تفاحة,,,');
    expect(preview.importable[0].hebrewForms).toBeUndefined();
    expect(preview.importable[0].arabicForms).toBeUndefined();
  });

  it('warns when only one of the two gendered forms is filled in', () => {
    const preview = previewCsvImport(
      HEADER + ',hebrew_feminine' + '\nFood,Fruit,apple,תפוח,,تفاحة,,,,תפוחה',
    );
    expect(preview.importable).toHaveLength(1);
    expect(preview.importable[0].hebrewForms).toEqual({
      feminine: { script: 'תפוחה', transliteration: undefined },
      masculine: { script: 'תפוח', transliteration: undefined },
    });
    expect(preview.issues[0]).toMatchObject({
      field: 'hebrew_masculine',
      severity: 'warning',
    });
  });

  it('warns about a duplicate word in the same deck', () => {
    const preview = previewCsvImport(
      HEADER +
        '\nFood,Fruit,apple,תפוח,,تفاحة,,,' +
        '\nFood,Fruit,apple,תפוח,,تفاح,,,',
    );
    expect(preview.importable).toHaveLength(2);
    expect(preview.issues.some((i) => i.message.includes('more than once'))).toBe(true);
  });
});
