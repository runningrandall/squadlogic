import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText, getPdfPageText, getFillColorSequence } from './pdf-test-utils.js';
import type { TeamWaveSchedule, ScheduleAthlete } from '../../domain/race-event.js';

// Mirrors the module-private ROW_COLORS palette in pdf-export-service.ts — category header
// bands cycle through these, so seeing 2+ of them confirms two different panels' single
// category each got a distinct color instead of both defaulting to the first palette entry.
const CATEGORY_PALETTE = [
  '#b3e5fc', '#c8e6c9', '#fff9c4', '#ffe0b2', '#f8bbd0', '#e1bee7', '#b2ebf2', '#ffccbc',
];

const service = new PdfExportService();

function mkAthlete(firstName: string, lastName: string, bibNumber: string, callUpNumber = '1'): ScheduleAthlete {
  return { firstName, lastName, bibNumber, callUpNumber, calledUp: false };
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
  it('generates a single-page Letter PDF when a small team fits on one side', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    // No blank back page: only pages with panels on them are emitted.
    expect(await getPdfPageCount(buffer)).toBe(1);
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

  it('shows each category with its labeled stage and start times instead of a per-row wave column', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Advanced Boys');
    expect(text).toContain('STAGE 2:15 PM');
    expect(text).toContain('START 2:30 PM');
    expect(text).toContain('Beginner 7th Grade Boys');
    expect(text).toContain('STAGE 3:35 PM');
    expect(text).toContain('START 3:50 PM');
  });

  it('shows each category\'s lap count in the header near the times', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('1 LAP');
  });

  it('pluralizes the lap count and falls back to an em-dash when laps is unknown', async () => {
    const lapWave = {
      waveName: 'Wave 1',
      categories: [
        { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 3,
          athletes: [mkAthlete('Zoe', 'Young', '1')] },
        { categoryName: 'Beginner Boys', stageTime: '14:45', startTime: '15:00', laps: null,
          athletes: [mkAthlete('Amy', 'Ames', '2')] },
      ],
    };
    const lapSchedule: TeamWaveSchedule = { ...schedule, waves: [lapWave] };
    const buffer = await service.generatePocketPdf(lapSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('3 LAPS');
    expect(text).toContain('—');
  });

  it('includes each athlete\'s call-up (position) number', async () => {
    const positionWave = {
      waveName: 'Wave 1',
      categories: [
        { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 1,
          athletes: [mkAthlete('Zoe', 'Young', '1', '7'), mkAthlete('Amy', 'Ames', '2', '12')] },
      ],
    };
    const positionSchedule: TeamWaveSchedule = { ...schedule, waves: [positionWave] };
    const buffer = await service.generatePocketPdf(positionSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('7');
    expect(text).toContain('12');
  });

  it('labels the athlete columns with a NAME / CALLUP # / PLATE # header row', async () => {
    const buffer = await service.generatePocketPdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('NAME');
    expect(text).toContain('CALLUP #');
    expect(text).toContain('PLATE #');
  });

  it('orders athlete row columns as name, then callup number, then plate number', async () => {
    const orderedWave = {
      waveName: 'Wave 1',
      categories: [
        { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 1,
          athletes: [mkAthlete('Zoe', 'Young', '55555', '77777')] },
      ],
    };
    const orderedSchedule: TeamWaveSchedule = { ...schedule, waves: [orderedWave] };
    const buffer = await service.generatePocketPdf(orderedSchedule);
    const text = await getPdfText(buffer);
    const nameIdx = text.indexOf('Zoe Young');
    const callUpIdx = text.indexOf('77777');
    const plateIdx = text.indexOf('55555');
    expect(nameIdx).toBeGreaterThan(-1);
    expect(callUpIdx).toBeGreaterThan(-1);
    expect(plateIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeLessThan(callUpIdx);
    expect(callUpIdx).toBeLessThan(plateIdx);
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
    // A single wave fits in one panel, so one page.
    expect(await getPdfPageCount(buffer)).toBe(1);
    const text = await getPdfText(buffer);
    expect(text).toContain('JV B Boys');
    expect(text).toContain('JV C Boys');
  });

  it('spills onto additional pages as panels are needed, without trailing blank pages', async () => {
    // 25 riders in a single category fill most of a panel, so no two of these waves can share one.
    const manyWaves = Array.from({ length: 9 }, (_, i) => ({
      waveName: `Wave ${i + 1} - HS`,
      categories: [
        { categoryName: 'Category', stageTime: '08:00', startTime: '08:00', laps: 1,
          athletes: Array.from({ length: 25 }, (_, a) => mkAthlete(`A${a}`, 'B', String(a))) },
      ],
    }));
    const manyWaveSchedule: TeamWaveSchedule = { ...schedule, waves: manyWaves };
    const buffer = await service.generatePocketPdf(manyWaveSchedule);
    // 9 panels at 4 per page = 3 pages — not padded out to a 4th blank page.
    expect(await getPdfPageCount(buffer)).toBe(3);
  });

  it('stacks several small waves in one panel to use its vertical space', async () => {
    const smallWaves = Array.from({ length: 5 }, (_, i) => ({
      waveName: `Wave ${i + 1}`,
      categories: [
        { categoryName: `Category ${i + 1}`, stageTime: '08:00', startTime: '08:15', laps: 1,
          athletes: [mkAthlete('A', 'B', '1'), mkAthlete('C', 'D', '2')] },
      ],
    }));
    const buffer = await service.generatePocketPdf({ ...schedule, waves: smallWaves });
    // One wave per panel would have pushed Wave 5 onto a second page; packed, all five
    // share the front page and no second page is needed.
    const front = await getPdfPageText(buffer, 1);
    for (let i = 1; i <= 5; i++) expect(front).toContain(`Wave ${i}`);
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('never splits a wave across panels: one that does not fit below the others starts the next panel', async () => {
    const big = (name: string, n: number) => ({
      waveName: name,
      categories: [{ categoryName: `${name} Cat`, stageTime: '08:00', startTime: '08:15', laps: 1,
        athletes: Array.from({ length: n }, (_, a) => mkAthlete(`${name}${a}`, 'X', String(a))) }],
    });
    const buffer = await service.generatePocketPdf({ ...schedule, waves: [big('Alpha', 15), big('Bravo', 15)] });
    // Each 15-rider wave takes ~220pt of a ~388pt panel, so Bravo goes in its own panel —
    // with all of its riders present, not cut off at the bottom of Alpha's panel.
    const text = await getPdfText(buffer);
    expect(text).toContain('Bravo14 X');
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('starts each day of a multi-day race on its own page', async () => {
    const dayWave = (day: number, n: number) => ({
      waveName: `Day ${day} Wave ${n}`, waveNumber: n, day, date: `2026-10-2${2 + day}`,
      categories: [{ categoryName: `D${day}W${n}`, stageTime: '08:00', startTime: '08:15', laps: 1,
        athletes: [mkAthlete('A', 'B', '1')] }],
    });
    const twoDay: TeamWaveSchedule = {
      ...schedule,
      eventDates: ['2026-10-23', '2026-10-24'],
      waves: [dayWave(1, 1), dayWave(1, 2), dayWave(2, 1)],
    };
    const buffer = await service.generatePocketPdf(twoDay);
    // Day 1 = page 1, Day 2 = page 2 (the back side), even though all three tiny waves
    // would otherwise fit in a single panel — and no blank pages padding either day.
    expect(await getPdfPageCount(buffer)).toBe(2);
    const page1 = await getPdfPageText(buffer, 1);
    expect(page1).toContain('Day 1 Wave 1');
    expect(page1).toContain('Day 1 Wave 2');
    expect(page1).not.toContain('Day 2');
    expect(await getPdfPageText(buffer, 2)).toContain('Day 2 Wave 1');
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
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('gives two different waves\' single category a distinct header color, not the same one', async () => {
    // Regression: color index used to reset to 0 for every wave (first category in its own
    // wave always got index 0), so two waves with exactly one category each both rendered
    // the same color instead of visibly distinct ones.
    const buffer = await service.generatePocketPdf(schedule);
    const colors = await getFillColorSequence(buffer, 1);
    const paletteHits = colors.filter((c) => CATEGORY_PALETTE.includes(c.toLowerCase()));
    expect(new Set(paletteHits).size).toBeGreaterThanOrEqual(2);
  });

  it('shows an em-dash for an athlete with no call-up number', async () => {
    const noPositionWave = {
      waveName: 'Wave 1',
      categories: [
        { categoryName: 'Advanced Boys', stageTime: '14:15', startTime: '14:30', laps: 1,
          athletes: [{ firstName: 'Zoe', lastName: 'Young', bibNumber: '1', callUpNumber: null, calledUp: false }] },
      ],
    };
    const noPositionSchedule: TeamWaveSchedule = { ...schedule, waves: [noPositionWave] };
    const buffer = await service.generatePocketPdf(noPositionSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Zoe Young');
    expect(text).toContain('—');
  });

  it('filename uses the pocket variant suffix', () => {
    const filename = service.generateFilename('Wasatch', '2026-08-22', 'pocket');
    expect(filename).toBe('Wasatch_2026-08-22_pocket.pdf');
  });
});
