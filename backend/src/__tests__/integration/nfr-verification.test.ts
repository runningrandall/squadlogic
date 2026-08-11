/**
 * NFR-002 — Parsed data accuracy verification
 *
 * NFR-002: 100% field-level accuracy of participants/schedule extracted from an uploaded
 * call-up list against a known baseline.
 *
 * NFR-001 (external fetch latency) is retired along with the RaceResult integration — there is
 * no external fetch left to time; parsing an uploaded workbook is local and synchronous-fast.
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { CallUpListService } from '../../application/callup-list-service.js';

const HEADER_ROW = ['STAGING', 'CALLUP', 'PLATE', 'Region', 'NAME', 'DIV', 'GRD', 'TEAM', 'CONTEST'];

// Known baseline — field-level accuracy is verified against exactly what these rows encode.
const BASELINE_ROWS: (string | number)[][] = [
  ['7:45 AM', 1, '15003', '5', 'CONNOR ROWLEY', '2', '8', 'Lone Peak Jr Devo', 'Advanced Boys'],
  ['7:45 AM', 2, '15001', '5', 'LEDGER EDWARDS', '2', '8', 'Lone Peak Jr Devo', 'Advanced Boys'],
  ['10:05 AM', 1, '10001', '5', 'MAX POWER', '2', '11', 'Lehi HS', 'Varsity Boys'],
];

const BASELINE_PARTICIPANTS = [
  { firstName: 'Connor', lastName: 'Rowley', team: 'Lone Peak Jr Devo', category: 'Advanced Boys', bibNumber: '15003', callUpNumber: '1' },
  { firstName: 'Ledger', lastName: 'Edwards', team: 'Lone Peak Jr Devo', category: 'Advanced Boys', bibNumber: '15001', callUpNumber: '2' },
  { firstName: 'Max', lastName: 'Power', team: 'Lehi HS', category: 'Varsity Boys', bibNumber: '10001', callUpNumber: '1' },
];

async function buildBaselineWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(HEADER_ROW);
  sheet.addRow(['Advanced Boys']);
  sheet.addRow(['STAGING TIME: 09/20/2025 @ 7:45 AM']);
  sheet.addRow(['START TIME: 09/20/2025 @ 8:00 AM']);
  sheet.addRow(BASELINE_ROWS[0]);
  sheet.addRow(BASELINE_ROWS[1]);
  sheet.addRow(['Varsity Boys']);
  sheet.addRow(['STAGING TIME: 09/20/2025 @ 10:05 AM']);
  sheet.addRow(['START TIME: 09/20/2025 @ 10:20 AM']);
  sheet.addRow(BASELINE_ROWS[2]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('NFR Verification', () => {
  describe('NFR-002: Data Accuracy', () => {
    it('TC-088/TC-089: 100% field-level accuracy against baseline', async () => {
      const mockPublisher = { publish: async () => {} };
      const service = new CallUpListService(mockPublisher);
      const buffer = await buildBaselineWorkbook();

      const result = await service.importCallUpList(buffer);

      let matchCount = 0;
      for (const baseline of BASELINE_PARTICIPANTS) {
        const found = result.participants.find(
          (p) =>
            p.firstName === baseline.firstName &&
            p.lastName === baseline.lastName &&
            p.team === baseline.team,
        );

        expect(found).toBeDefined();
        if (found) {
          expect(found.category).toBe(baseline.category);
          expect(found.bibNumber).toBe(baseline.bibNumber);
          expect(found.callUpNumber).toBe(baseline.callUpNumber);
          matchCount++;
        }
      }

      // TC-089: participant count matches exactly (no dropped or duplicated rows)
      expect(result.participants.length).toBe(BASELINE_PARTICIPANTS.length);

      expect(matchCount).toBe(BASELINE_PARTICIPANTS.length);
    });

    it('TC-088: category schedule times are extracted accurately', async () => {
      const mockPublisher = { publish: async () => {} };
      const service = new CallUpListService(mockPublisher);
      const buffer = await buildBaselineWorkbook();

      const result = await service.importCallUpList(buffer);

      expect(result.categorySchedule['Advanced Boys']).toEqual({ stageTime: '07:45', startTime: '08:00' });
      expect(result.categorySchedule['Varsity Boys']).toEqual({ stageTime: '10:05', startTime: '10:20' });
      expect(result.metadata.eventDate).toBe('2025-09-20');
    });
  });
});
