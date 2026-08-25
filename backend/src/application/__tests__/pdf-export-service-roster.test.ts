import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText } from './pdf-test-utils.js';
import type { TeamWaveSchedule, ScheduleAthlete } from '../../domain/race-event.js';

const service = new PdfExportService();

function mkAthlete(firstName: string, lastName: string, bibNumber: string, calledUp = false): ScheduleAthlete {
  return {
    firstName,
    lastName,
    bibNumber,
    callUpNumber: '1',
    calledUp,
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

  it('keeps the CALLUP # header readable (not truncated) even at the max column count', async () => {
    const buffer = await service.generateRosterPdf(buildLargeSchedule(150));
    const text = await getPdfText(buffer);
    expect(text).toContain('CALLUP #');
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

  it('prints names as "First Last" instead of "Last, First"', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Alice Adams');
    expect(text).not.toContain('Adams, Alice');
  });

  it('includes the category name and a checkbox for every athlete', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('CHECK-IN ROSTER');
    expect(text).toContain('Advanced Boys');
    expect(buffer.toString('latin1')).toContain('/Type /Page');
  });

  it('includes a callup number column with a header', async () => {
    const buffer = await service.generateRosterPdf(smallSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('CALLUP #');
  });

  it('groups athletes under their category header, keeping each category together', async () => {
    // First names are deliberately interleaved across categories (Amy/Zoe in each) so a
    // pure global first-name sort would interleave categories — grouping should prevent that.
    const twoCategorySchedule: TeamWaveSchedule = {
      teamName: 'Wasatch',
      eventName: 'UTAH HS MTB 2026 - Region 5',
      eventDate: '2026-08-22',
      totalAthletes: 4,
      waves: [
        {
          waveName: 'Wave 1',
          categories: [
            {
              categoryName: 'Advanced Boys',
              stageTime: '14:15', startTime: '14:30', laps: 1,
              athletes: [mkAthlete('Zoe', 'Advanced1', '1'), mkAthlete('Amy', 'Advanced2', '2')],
            },
            {
              categoryName: 'Beginner Boys',
              stageTime: '14:45', startTime: '15:00', laps: 1,
              athletes: [mkAthlete('Zed', 'Beginner1', '3'), mkAthlete('Ann', 'Beginner2', '4')],
            },
          ],
        },
      ],
    };
    const buffer = await service.generateRosterPdf(twoCategorySchedule);
    const text = await getPdfText(buffer);
    const advancedHdr = text.indexOf('Advanced Boys');
    const amyAdvanced = text.indexOf('Amy Advanced2');
    const zoeAdvanced = text.indexOf('Zoe Advanced1');
    const beginnerHdr = text.indexOf('Beginner Boys');
    expect(advancedHdr).toBeGreaterThan(-1);
    expect(beginnerHdr).toBeGreaterThan(-1);
    // Both Advanced Boys athletes render after their own header and before Beginner Boys' header.
    expect(amyAdvanced).toBeGreaterThan(advancedHdr);
    expect(zoeAdvanced).toBeGreaterThan(advancedHdr);
    expect(amyAdvanced).toBeLessThan(beginnerHdr);
    expect(zoeAdvanced).toBeLessThan(beginnerHdr);
  });

  it('renders without error when an athlete is called up', async () => {
    const calledUpSchedule: TeamWaveSchedule = {
      ...smallSchedule,
      waves: [
        {
          waveName: 'Wave 7 - JD',
          categories: [
            {
              categoryName: 'Advanced Boys',
              stageTime: '14:15', startTime: '14:30', laps: 1,
              athletes: [mkAthlete('Alice', 'Adams', '1', true), mkAthlete('Bob', 'Baker', '2')],
            },
          ],
        },
      ],
    };
    const buffer = await service.generateRosterPdf(calledUpSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    const text = await getPdfText(buffer);
    expect(text).toContain('Alice Adams');
  });

  it('renders an empty schedule (no waves) without error', async () => {
    const emptySchedule: TeamWaveSchedule = { ...smallSchedule, totalAthletes: 0, waves: [] };
    const buffer = await service.generateRosterPdf(emptySchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    const text = await getPdfText(buffer);
    expect(text).toContain('CHECK-IN ROSTER (0 athletes)');
  });

  it('breaks ties by last name when two athletes in a category share a first name', async () => {
    const tieSchedule: TeamWaveSchedule = {
      ...smallSchedule,
      waves: [
        {
          waveName: 'Wave 7 - JD',
          categories: [
            {
              categoryName: 'Advanced Boys',
              stageTime: '14:15', startTime: '14:30', laps: 1,
              athletes: [mkAthlete('Sam', 'Zephyr', '1'), mkAthlete('Sam', 'Adams', '2')],
            },
          ],
        },
      ],
    };
    const buffer = await service.generateRosterPdf(tieSchedule);
    const text = await getPdfText(buffer);
    const adamsIdx = text.indexOf('Sam Adams');
    const zephyrIdx = text.indexOf('Sam Zephyr');
    expect(adamsIdx).toBeGreaterThan(-1);
    expect(zephyrIdx).toBeGreaterThan(-1);
    expect(adamsIdx).toBeLessThan(zephyrIdx);
  });

  it('renders an athlete with no logistics and no callup number using em-dash fallbacks', async () => {
    const noDataSchedule: TeamWaveSchedule = {
      ...smallSchedule,
      waves: [
        {
          waveName: 'Wave 7 - JD',
          categories: [
            {
              categoryName: 'Advanced Boys',
              stageTime: '14:15', startTime: '14:30', laps: 1,
              athletes: [{ firstName: 'Alice', lastName: 'Adams', bibNumber: '1', callUpNumber: null, calledUp: false }],
            },
          ],
        },
      ],
    };
    const buffer = await service.generateRosterPdf(noDataSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    const text = await getPdfText(buffer);
    expect(text).toContain('Alice Adams');
    expect(text).toContain('—');
  });

  it('spreads many small categories across multiple columns without splitting a category', async () => {
    const manyCategoriesSchedule: TeamWaveSchedule = {
      teamName: 'Wasatch',
      eventName: 'UTAH HS MTB 2026 - Region 5',
      eventDate: '2026-08-22',
      totalAthletes: 60,
      waves: [
        {
          waveName: 'Wave 1',
          categories: Array.from({ length: 20 }, (_, c) => ({
            categoryName: `Category ${c}`,
            stageTime: '08:00', startTime: '08:00', laps: 1,
            athletes: Array.from({ length: 3 }, (_, i) => mkAthlete(`F${c}_${i}`, `L${c}_${i}`, String(c * 10 + i))),
          })),
        },
      ],
    };
    // pdfjs detaches the source ArrayBuffer after loading, so a fresh buffer is generated
    // per assertion rather than reusing one buffer across two loads.
    expect(await getPdfPageCount(await service.generateRosterPdf(manyCategoriesSchedule))).toBe(1);
    const text = await getPdfText(await service.generateRosterPdf(manyCategoriesSchedule));
    expect(text).toContain('Category 0');
    expect(text).toContain('Category 19');
  });

  it('filename uses the roster variant suffix', () => {
    const filename = service.generateFilename('Wasatch', '2026-08-22', 'roster');
    expect(filename).toBe('Wasatch_2026-08-22_roster.pdf');
  });
});
