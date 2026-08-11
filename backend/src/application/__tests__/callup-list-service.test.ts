import { describe, it, expect, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { CallUpListService } from '../callup-list-service.js';
import type { EventPublisher } from '../../ports/event-publisher.js';

const HEADER_ROW = ['STAGING', 'CALLUP', 'PLATE', 'Region', 'NAME', 'DIV', 'GRD', 'TEAM', 'CONTEST'];

async function buildWorkbook(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function makeFixture(): Promise<Buffer> {
  return buildWorkbook([
    HEADER_ROW,
    ['Varsity Boys'],
    ['STAGING TIME: 09/20/2025 @ 10:05 AM'],
    ['START TIME: 09/20/2025 @ 10:20 AM'],
    ['10:05 AM', 1, '10001', '5', 'MAX POWER', '2', '11', 'Lehi HS', 'Varsity Boys'],
    ['10:05 AM', 2, '10002', '5', 'SAM SMITH', '2', '11', 'Skyridge HS', 'Varsity Boys'],
    ['Varsity Girls'],
    ['STAGING TIME: 09/20/2025 @ 11:25 AM'],
    ['START TIME: 09/20/2025 @ 11:40 AM'],
    ['11:25 AM', 1, '10101', '5', 'JANE DOE', '2', '11', 'Lehi HS', 'Varsity Girls'],
  ]);
}

function fakePublisher(): EventPublisher {
  return { publish: vi.fn().mockResolvedValue(undefined) };
}

describe('CallUpListService', () => {
  describe('importCallUpList', () => {
    it('flattens participants and builds a category schedule map', async () => {
      const service = new CallUpListService(fakePublisher());
      const result = await service.importCallUpList(await makeFixture());

      expect(result.participants).toHaveLength(3);
      expect(result.categorySchedule).toEqual({
        'Varsity Boys': { stageTime: '10:05', startTime: '10:20' },
        'Varsity Girls': { stageTime: '11:25', startTime: '11:40' },
      });
      expect(result.metadata.eventDate).toBe('2025-09-20');
      expect(result.metadata.teams).toEqual(['Lehi HS', 'Skyridge HS']);
      expect(result.metadata.eventName).toBe('Race Event');
    });

    it('applies eventName/eventLocation overrides', async () => {
      const service = new CallUpListService(fakePublisher());
      const result = await service.importCallUpList(await makeFixture(), {
        eventName: 'UTAH HS MTB 2025 - REGION 5',
        eventLocation: 'Beaver County, UT',
      });

      expect(result.metadata.eventName).toBe('UTAH HS MTB 2025 - REGION 5');
      expect(result.metadata.eventLocation).toBe('Beaver County, UT');
    });

    it('publishes a RaceEventImported event without blocking on failure', async () => {
      const publisher: EventPublisher = { publish: vi.fn().mockRejectedValue(new Error('boom')) };
      const service = new CallUpListService(publisher);
      await expect(service.importCallUpList(await makeFixture())).resolves.toBeDefined();
      expect(publisher.publish).toHaveBeenCalledWith(
        'RaceEventImported',
        expect.objectContaining({ participantCount: 3, teamCount: 2 }),
      );
    });
  });

  describe('getTeamList', () => {
    it('counts participants per team and includes zero-count teams', () => {
      const service = new CallUpListService(fakePublisher());
      const list = service.getTeamList(
        ['Lehi HS', 'Skyridge HS', 'Springville HS'],
        [
          { firstName: 'A', lastName: 'B', team: 'Lehi HS', category: 'x', bibNumber: '1', callUpNumber: '1' },
          { firstName: 'C', lastName: 'D', team: 'Lehi HS', category: 'x', bibNumber: '2', callUpNumber: '2' },
          { firstName: 'E', lastName: 'F', team: 'Skyridge HS', category: 'x', bibNumber: '3', callUpNumber: '1' },
        ],
      );

      expect(list).toEqual([
        { name: 'Lehi HS', count: 2 },
        { name: 'Skyridge HS', count: 1 },
        { name: 'Springville HS', count: 0 },
      ]);
    });
  });
});
