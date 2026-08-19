import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText } from './pdf-test-utils.js';
import type { TeamWaveSchedule, ScheduleAthlete } from '../../domain/race-event.js';

const service = new PdfExportService();

function mkAthlete(firstName: string, lastName: string, bibNumber: string): ScheduleAthlete {
  return {
    firstName,
    lastName,
    bibNumber,
    callUpNumber: '1',
    logistics: {
      waveMeetingTime: '13:30',
      warmupStart: '13:40',
      warmupEnd: '14:10',
      stagingTime: '14:15',
      raceStart: '14:30',
    },
  };
}

const smallSchedule: TeamWaveSchedule = {
  teamName: 'Wasatch',
  eventName: 'UTAH HS MTB 2026 - Region 5',
  eventDate: '2026-08-22',
  totalAthletes: 3,
  waves: [
    {
      waveName: 'Wave 7 - JD',
      categories: [
        {
          categoryName: 'Advanced Boys',
          stageTime: '14:15',
          startTime: '14:30',
          laps: 1,
          athletes: [
            mkAthlete('Charlie', 'Zephyr', '3'),
            mkAthlete('Alice', 'Adams', '1'),
            mkAthlete('Bob', 'Baker', '2'),
          ],
        },
      ],
    },
  ],
};

function buildLargeSchedule(athleteCount: number): TeamWaveSchedule {
  return {
    teamName: 'Wasatch',
    eventName: 'UTAH HS MTB 2026 - Region 5',
    eventDate: '2026-08-22',
    totalAthletes: athleteCount,
    waves: [
      {
        waveName: 'Wave 1 - HS',
        categories: [
          {
            categoryName: 'JV B Boys',
            stageTime: '07:45',
            startTime: '08:00',
            laps: 2,
            athletes: Array.from({ length: athleteCount }, (_, i) =>
              mkAthlete(`First${i}`, `Last${i}`, String(1000 + i)),
            ),
          },
        ],
      },
    ],
  };
}

describe('PdfExportService.generateRosterPdf', () => {
  it('generates a valid single-page PDF', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('stays on a single page even for a large roster (150+ athletes)', async () => {
    const buffer = await service.generateRosterPdf(buildLargeSchedule(150));
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('sorts athletes alphabetically by first name, then last name', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    const text = await getPdfText(buffer);
    const aliceIdx = text.indexOf('Adams');
    const bobIdx = text.indexOf('Baker');
    const charlieIdx = text.indexOf('Zephyr');
    expect(aliceIdx).toBeGreaterThan(-1);
    expect(bobIdx).toBeGreaterThan(-1);
    expect(charlieIdx).toBeGreaterThan(-1);
    expect(aliceIdx).toBeLessThan(bobIdx);
    expect(bobIdx).toBeLessThan(charlieIdx);
  });

  it('includes the category name and a checkbox for every athlete', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('CHECK-IN ROSTER');
    expect(text).toContain('Advanced Boys');
    expect(buffer.toString('latin1')).toContain('/Type /Page');
  });

  it('filename uses the roster variant suffix', () => {
    const filename = service.generateFilename('Wasatch', '2026-08-22', 'roster');
    expect(filename).toBe('Wasatch_2026-08-22_roster.pdf');
  });
});
