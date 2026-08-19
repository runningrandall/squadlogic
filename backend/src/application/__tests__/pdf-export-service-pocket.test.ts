import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText } from './pdf-test-utils.js';
import type { TeamWaveSchedule, ScheduleAthlete } from '../../domain/race-event.js';

const service = new PdfExportService();

function mkAthlete(firstName: string, lastName: string, bibNumber: string): ScheduleAthlete {
  return { firstName, lastName, bibNumber, callUpNumber: '1' };
}

const schedule: TeamWaveSchedule = {
  teamName: 'Wasatch',
  eventName: 'UTAH HS MTB 2026 - Region 5',
  eventDate: '2026-08-22',
  totalAthletes: 4,
  waves: [
    {
      waveName: 'Wave 7 - JD',
      categories: [
        {
          categoryName: 'Advanced Boys',
          stageTime: '14:15',
          startTime: '14:30',
          laps: 1,
          athletes: [mkAthlete('Zoe', 'Young', '1'), mkAthlete('Amy', 'Ames', '2')],
        },
      ],
    },
    {
      waveName: 'Wave 9 - JD',
      categories: [
        {
          categoryName: 'Beginner 7th Grade Boys',
          stageTime: '15:35',
          startTime: '15:50',
          laps: 1,
          athletes: [mkAthlete('Cal', 'Clark', '3'), mkAthlete('Bea', 'Best', '4')],
        },
      ],
    },
  ],
};

describe('PdfExportService.generatePocketPdf', () => {
  it('generates a valid two-page (double-sided) Letter PDF for a small team', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(await getPdfPageCount(buffer)).toBe(2);
  });

  it('includes every athlete somewhere in the document', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    for (const name of ['Young', 'Ames', 'Clark', 'Best']) {
      expect(text).toContain(name);
    }
  });

  it('spills onto additional sheets when one team has a very large roster', async () => {
    const bigWave = {
      waveName: 'Wave 1 - HS',
      categories: [
        {
          categoryName: 'JV B Boys',
          stageTime: '07:45',
          startTime: '08:00',
          laps: 2,
          athletes: Array.from({ length: 400 }, (_, i) => mkAthlete(`First${i}`, `Last${i}`, String(i))),
        },
      ],
    };
    const bigSchedule: TeamWaveSchedule = { ...schedule, waves: [bigWave] };
    const buffer = await service.generatePocketPdf(bigSchedule);
    const pageCount = await getPdfPageCount(buffer);
    expect(pageCount).toBeGreaterThan(2);
    expect(pageCount % 2).toBe(0); // always front+back pairs
  });

  it('filename uses the pocket variant suffix', () => {
    const filename = service.generateFilename('Wasatch', '2026-08-22', 'pocket');
    expect(filename).toBe('Wasatch_2026-08-22_pocket.pdf');
  });
});
