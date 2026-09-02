import { describe, it, expect } from 'vitest';
import { parseCallUpListPdf } from '../callup-list-pdf-parser.js';

async function buildPdf(lines: string[]): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.fontSize(9);
  for (const line of lines) {
    doc.text(line, doc.page.margins.left, doc.y, { lineBreak: false });
    doc.moveDown(0.6);
  }
  doc.end();
  return done;
}

const TITLE_LINE = 'UTAH HS MTB 2026 - REGION 5 - BEAVER MOUNTAIN Callup List';
const COLUMN_HEADER_LINE = 'STAGING CALLUP PLATE Region NAME DIV GRD TEAM CONTEST';

describe('parseCallUpListPdf', () => {
  it('parses categories with staging/start times and participants, skipping title/header/footer noise', async () => {
    const buffer = await buildPdf([
      TITLE_LINE,
      COLUMN_HEADER_LINE,
      'Advanced Boys',
      'STAGING TIME: 09/20/2025 @ 7:45 AM',
      'START TIME: 09/20/2025 @ 8:00 AM',
      '7:45 AM 1 15003 5 CONNOR ROWLEY 2 8 Lone Peak Jr Devo Advanced Boys',
      '7:45 AM 2 15001 5 LEDGER EDWARDS 2 8 Lone Peak Jr Devo Advanced Boys',
      TITLE_LINE,
      '1',
      COLUMN_HEADER_LINE,
      'Intermediate 8th Grade Boys',
      'STAGING TIME: 09/20/2025 @ 7:50 AM',
      'START TIME: 09/20/2025 @ 8:05 AM',
      '7:50 AM 1 35019 5 JULIAN STRANGIS 2 8 Wasatch Mountain Bike Team Intermediate 8th Grade Boys',
      'Number of records: 3',
      '2',
    ]);

    const result = await parseCallUpListPdf(buffer);

    expect(result.eventDate).toBe('2025-09-20');
    expect(result.categories).toHaveLength(2);

    const [advBoys, intBoys] = result.categories;
    expect(advBoys.categoryName).toBe('Advanced Boys');
    expect(advBoys.stageTime).toBe('07:45');
    expect(advBoys.startTime).toBe('08:00');
    expect(advBoys.participants).toHaveLength(2);
    expect(advBoys.participants[0]).toEqual({
      firstName: 'Connor',
      lastName: 'Rowley',
      team: 'Lone Peak Jr Devo',
      category: 'Advanced Boys',
      bibNumber: '15003',
      callUpNumber: '1',
    });

    expect(intBoys.categoryName).toBe('Intermediate 8th Grade Boys');
    expect(intBoys.participants).toHaveLength(1);
  });

  it('handles PM times', async () => {
    const buffer = await buildPdf([
      'JV B Boys',
      'STAGING TIME: 09/20/2025 @ 12:45 PM',
      'START TIME: 09/20/2025 @ 1:00 PM',
      '12:45 PM 1 20001 5 JOHN SMITH 2 10 Lehi HS JV B Boys',
    ]);

    const result = await parseCallUpListPdf(buffer);
    expect(result.categories[0].stageTime).toBe('12:45');
    expect(result.categories[0].startTime).toBe('13:00');
  });

  it('starts a new category on consecutive header lines with no blank separator', async () => {
    const buffer = await buildPdf([
      'Varsity Boys',
      'STAGING TIME: 09/20/2025 @ 10:05 AM',
      'START TIME: 09/20/2025 @ 10:20 AM',
      '10:05 AM 1 10001 5 MAX POWER 2 11 Lehi HS Varsity Boys',
      'Varsity Girls',
      'STAGING TIME: 09/20/2025 @ 11:25 AM',
      'START TIME: 09/20/2025 @ 11:40 AM',
      '11:25 AM 1 10101 5 JANE DOE 2 11 Lehi HS Varsity Girls',
    ]);

    const result = await parseCallUpListPdf(buffer);
    expect(result.categories.map((c) => c.categoryName)).toEqual(['Varsity Boys', 'Varsity Girls']);
  });

  it('throws when no categories are found', async () => {
    const buffer = await buildPdf([TITLE_LINE, COLUMN_HEADER_LINE, '1']);
    await expect(parseCallUpListPdf(buffer)).rejects.toThrow('No categories found');
  });

  it('drops a data row missing a team', async () => {
    const buffer = await buildPdf([
      'SLR Boys',
      'STAGING TIME: 09/20/2025 @ 3:10 PM',
      'START TIME: 09/20/2025 @ 3:25 PM',
      '3:10 PM 2 40002 5 HAS TEAM RIDER 2 9 Lehi HS SLR Boys',
    ]);

    const result = await parseCallUpListPdf(buffer);
    expect(result.categories[0].participants).toHaveLength(1);
    expect(result.categories[0].participants[0].lastName).toBe('Rider');
  });

  it('keeps a "Split N" section\'s own header name while still matching its rows (no "Split N" suffix themselves)', async () => {
    const buffer = await buildPdf([
      'Beginner 7th Grade Boys Split 1',
      'STAGING TIME: 09/20/2025 @ 3:40 PM',
      'START TIME: 09/20/2025 @ 3:55 PM',
      '3:40 PM 1 85098 5 OWEN UPSHAW 2 7 Lone Peak Jr Devo Beginner 7th Grade Boys',
      '3:40 PM 2 85008 5 BENSON BAXTER 2 7 Lehi Junior Devo Beginner 7th Grade Boys',
      'Beginner 7th Grade Boys Split 2',
      'STAGING TIME: 09/20/2025 @ 3:45 PM',
      'START TIME: 09/20/2025 @ 4:00 PM',
      '3:45 PM 55 85076 5 JAY PARKES 2 7 Skyridge Junior Devo Beginner 7th Grade Boys',
    ]);

    const result = await parseCallUpListPdf(buffer);

    // Each split keeps its own distinct categoryName (with the "Split N" suffix) and its own
    // stage/start time, so the two sections still print as separate groups — but the rows
    // beneath each (which never carry "Split N" themselves) are no longer silently dropped.
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].categoryName).toBe('Beginner 7th Grade Boys Split 1');
    expect(result.categories[0].stageTime).toBe('15:40');
    expect(result.categories[0].participants).toHaveLength(2);
    expect(result.categories[0].participants[0].category).toBe('Beginner 7th Grade Boys Split 1');
    expect(result.categories[1].categoryName).toBe('Beginner 7th Grade Boys Split 2');
    expect(result.categories[1].stageTime).toBe('15:45');
    expect(result.categories[1].participants).toHaveLength(1);
    expect(result.categories[1].participants[0].lastName).toBe('Parkes');
  });

  it('ignores a data-shaped row whose trailing category name does not match the current header', async () => {
    const buffer = await buildPdf([
      'JV A Boys',
      'STAGING TIME: 09/20/2025 @ 8:35 AM',
      'START TIME: 09/20/2025 @ 8:55 AM',
      '8:35 AM 1 5001 5 SOME RIDER 1 10 Lehi HS Wrong Category Name',
      '8:35 AM 2 5002 5 OTHER RIDER 1 10 Lehi HS JV A Boys',
    ]);

    const result = await parseCallUpListPdf(buffer);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].participants).toHaveLength(1);
    expect(result.categories[0].participants[0].lastName).toBe('Rider');
    expect(result.categories[0].participants[0].firstName).toBe('Other');
  });
});
