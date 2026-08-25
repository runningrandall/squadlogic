import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText } from './pdf-test-utils.js';
import type { TeamWaveSchedule, ScheduleAthlete } from '../../domain/race-event.js';

const service = new PdfExportService();

function mkAthlete(firstName: string, lastName: string, bibNumber: string): ScheduleAthlete {
  return { firstName, lastName, bibNumber, callUpNumber: '1', calledUp: false };
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

  it('gives each wave its own panel, titled with the full wave name', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Wave 7 - JD');
    expect(text).toContain('Wave 9 - JD');
  });

  it('shows each category with its start time instead of a per-row wave column', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Advanced Boys');
    expect(text).toContain('2:30 PM');
    expect(text).toContain('Beginner 7th Grade Boys');
    expect(text).toContain('3:50 PM');
  });

  it('prints names as "First Last" instead of "Last, First"', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Zoe Young');
    expect(text).not.toContain('Young, Zoe');
  });

  it('includes each athlete\'s bib number', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    for (const bib of ['1', '2', '3', '4']) {
      expect(text).toContain(bib);
    }
  });

  it('keeps a wave with multiple categories on one panel (2-column layout)', async () => {
    const multiCatWave = {
      waveName: 'Wave 1 - HS',
      categories: [
        { categoryName: 'JV B Boys', stageTime: '07:45', startTime: '08:00', laps: 2,
          athletes: Array.from({ length: 15 }, (_, i) => mkAthlete(`B${i}`, `Last${i}`, String(i))) },
        { categoryName: 'JV C Boys', stageTime: '07:50', startTime: '08:05', laps: 2,
          athletes: Array.from({ length: 15 }, (_, i) => mkAthlete(`C${i}`, `Last${i}`, String(i))) },
      ],
    };
    const oneWaveSchedule: TeamWaveSchedule = { ...schedule, waves: [multiCatWave] };
    const buffer = await service.generatePocketPdf(oneWaveSchedule);
    // A single wave should never need more than one sheet (2 pages).
    expect(await getPdfPageCount(buffer)).toBe(2);
    const text = await getPdfText(buffer);
    expect(text).toContain('JV B Boys');
    expect(text).toContain('JV C Boys');
  });

  it('spills onto an additional sheet once more than 8 waves need panels', async () => {
    const manyWaves = Array.from({ length: 9 }, (_, i) => ({
      waveName: `Wave ${i + 1} - HS`,
      categories: [
        { categoryName: 'Category', stageTime: '08:00', startTime: '08:00', laps: 1,
          athletes: [mkAthlete('A', 'B', '1')] },
      ],
    }));
    const manyWaveSchedule: TeamWaveSchedule = { ...schedule, waves: manyWaves };
    const buffer = await service.generatePocketPdf(manyWaveSchedule);
    // 9 waves > 8 panels/sheet, so this needs a second double-sided sheet (4 pages).
    expect(await getPdfPageCount(buffer)).toBe(4);
  });

  it('breaks ties by last name when two athletes in a category share a first name', async () => {
    const tieWave = {
      waveName: 'Wave 1',
      categories: [
        { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 1,
          athletes: [mkAthlete('Sam', 'Zephyr', '1'), mkAthlete('Sam', 'Adams', '2')] },
      ],
    };
    const tieSchedule: TeamWaveSchedule = { ...schedule, waves: [tieWave] };
    const buffer = await service.generatePocketPdf(tieSchedule);
    const text = await getPdfText(buffer);
    const adamsIdx = text.indexOf('Sam Adams');
    const zephyrIdx = text.indexOf('Sam Zephyr');
    expect(adamsIdx).toBeGreaterThan(-1);
    expect(zephyrIdx).toBeGreaterThan(-1);
    expect(adamsIdx).toBeLessThan(zephyrIdx);
  });

  it('renders an empty schedule (no waves) without error', async () => {
    const emptySchedule: TeamWaveSchedule = { ...schedule, totalAthletes: 0, waves: [] };
    const buffer = await service.generatePocketPdf(emptySchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(await getPdfPageCount(buffer)).toBe(2);
  });

  it('filename uses the pocket variant suffix', () => {
    const filename = service.generateFilename('Wasatch', '2026-08-22', 'pocket');
    expect(filename).toBe('Wasatch_2026-08-22_pocket.pdf');
  });
});
