import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseCallUpList } from '../callup-list-parser.js';

async function buildWorkbook(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  for (const row of rows) {
    sheet.addRow(row);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

const HEADER_ROW = ['STAGING', 'CALLUP', 'PLATE', 'Region', 'NAME', 'DIV', 'GRD', 'TEAM', 'CONTEST'];

describe('parseCallUpList', () => {
  it('parses categories with staging/start times and participants', async () => {
    const buffer = await buildWorkbook([
      HEADER_ROW,
      ['Advanced Boys'],
      ['STAGING TIME: 09/20/2025 @ 7:45 AM'],
      ['START TIME: 09/20/2025 @ 8:00 AM'],
      ['7:45 AM', 1, '15003', '5', 'CONNOR ROWLEY', '2', '8', 'Lone Peak Jr Devo', 'Advanced Boys'],
      ['7:45 AM', 2, '15001', '5', 'LEDGER EDWARDS', '2', '8', 'Lone Peak Jr Devo', 'Advanced Boys'],
      ['Intermediate 8th Grade Boys'],
      ['STAGING TIME: 09/20/2025 @ 7:50 AM'],
      ['START TIME: 09/20/2025 @ 8:05 AM'],
      ['7:50 AM', 1, '35019', '5', 'JULIAN STRANGIS', '2', '8', 'Wasatch Mountain Bike Team', 'Intermediate 8th Grade Boys'],
    ]);

    const result = await parseCallUpList(buffer);

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
    expect(intBoys.stageTime).toBe('07:50');
    expect(intBoys.startTime).toBe('08:05');
    expect(intBoys.participants).toHaveLength(1);
  });

  it('handles PM times', async () => {
    const buffer = await buildWorkbook([
      HEADER_ROW,
      ['JV B Boys'],
      ['STAGING TIME: 09/20/2025 @ 12:45 PM'],
      ['START TIME: 09/20/2025 @ 1:00 PM'],
      ['12:45 PM', 1, '20001', '5', 'JOHN SMITH', '2', '10', 'Lehi HS', 'JV B Boys'],
    ]);

    const result = await parseCallUpList(buffer);
    expect(result.categories[0].stageTime).toBe('12:45');
    expect(result.categories[0].startTime).toBe('13:00');
  });

  it('tolerates blank rows between category blocks', async () => {
    const buffer = await buildWorkbook([
      HEADER_ROW,
      ['Varsity Boys'],
      ['STAGING TIME: 09/20/2025 @ 10:05 AM'],
      ['START TIME: 09/20/2025 @ 10:20 AM'],
      ['10:05 AM', 1, '10001', '5', 'MAX POWER', '2', '11', 'Lehi HS', 'Varsity Boys'],
      [],
      ['Varsity Girls'],
      ['STAGING TIME: 09/20/2025 @ 11:25 AM'],
      ['START TIME: 09/20/2025 @ 11:40 AM'],
      ['11:25 AM', 1, '10101', '5', 'JANE DOE', '2', '11', 'Lehi HS', 'Varsity Girls'],
    ]);

    const result = await parseCallUpList(buffer);
    expect(result.categories.map((c) => c.categoryName)).toEqual(['Varsity Boys', 'Varsity Girls']);
  });

  it('throws when no categories are found', async () => {
    const buffer = await buildWorkbook([HEADER_ROW]);
    await expect(parseCallUpList(buffer)).rejects.toThrow('No categories found');
  });

  it('drops a data row missing a team', async () => {
    const buffer = await buildWorkbook([
      HEADER_ROW,
      ['SLR Boys'],
      ['STAGING TIME: 09/20/2025 @ 3:10 PM'],
      ['START TIME: 09/20/2025 @ 3:25 PM'],
      ['3:10 PM', 1, '40001', '5', 'NO TEAM RIDER', '2', '9', '', 'SLR Boys'],
      ['3:10 PM', 2, '40002', '5', 'HAS TEAM RIDER', '2', '9', 'Lehi HS', 'SLR Boys'],
    ]);

    const result = await parseCallUpList(buffer);
    expect(result.categories[0].participants).toHaveLength(1);
    expect(result.categories[0].participants[0].lastName).toBe('Rider');
  });
});
