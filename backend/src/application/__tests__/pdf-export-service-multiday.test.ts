import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText, getPdfPageText } from './pdf-test-utils.js';
import type { TeamWaveSchedule, WaveGroup } from '../../domain/race-event.js';
import { LogisticsService } from '../logistics-service.js';

const service = new PdfExportService();
const logistics = new LogisticsService();

const D1 = '2026-10-23';
const D2 = '2026-10-24';

// A State-Champs-shaped schedule: two race days, 6 official waves each, every wave made of
// several "Split N" sections — the real 2026 State list's shape (12 waves, 34 sections).
function stateSchedule(opts: { splitsPerWave?: number; ridersPerSplit?: number; longNames?: boolean } = {}): TeamWaveSchedule {
  const { splitsPerWave = 3, ridersPerSplit = 3, longNames = false } = opts;
  const waves: WaveGroup[] = [];
  for (const [dayIdx, date] of [D1, D2].entries()) {
    for (let w = 0; w < 6; w++) {
      const day = dayIdx + 1;
      const hour = 8 + w;
      waves.push({
        waveName: `Day ${day} Wave ${w + 1}`,
        waveNumber: w + 1,
        day,
        date,
        categories: Array.from({ length: splitsPerWave }, (_, s) => ({
          categoryName: `${longNames ? 'Intermediate 8th Grade Boys Category' : `D${day}W${w + 1} Cat`} Split ${s + 1}`,
          stageTime: `${String(hour).padStart(2, '0')}:${String(15 + s * 5).padStart(2, '0')}`,
          startTime: `${String(hour).padStart(2, '0')}:${String(30 + s * 5).padStart(2, '0')}`,
          laps: 2,
          athletes: Array.from({ length: ridersPerSplit }, (_, i) => ({
            firstName: `F${day}${w}${s}${i}`, lastName: `L${day}${w}${s}${i}`,
            bibNumber: String(1000 + i), callUpNumber: String(i + 1), calledUp: i === 0,
          })),
        })),
      });
    }
  }
  const total = waves.reduce((n, w) => n + w.categories.reduce((m, c) => m + c.athletes.length, 0), 0);
  return logistics.enrichSchedule({
    teamName: 'Lone Peak HS', eventName: 'State Champs', eventDate: D1, eventDates: [D1, D2],
    totalAthletes: total, waves,
  });
}

describe('PdfExportService — multi-day race (State Champs)', () => {
  describe('schedule', () => {
    it('fits all 12 waves on the one summary page, with a band per race day', async () => {
      const buffer = await service.generateSchedulePdf(stateSchedule());
      expect(await getPdfPageCount(buffer)).toBe(2);
      const summary = await getPdfPageText(buffer, 1);
      expect(summary).toContain('DAY 1 · FRI OCT 23');
      expect(summary).toContain('DAY 2 · SAT OCT 24');
      expect(summary).toContain('12 waves');
    });

    it('prints the full date range in the page header', async () => {
      const buffer = await service.generateSchedulePdf(stateSchedule());
      expect(await getPdfPageText(buffer, 1)).toContain(`${D1} – ${D2}`);
    });

    it('labels each category on the detail page with its day-prefixed wave', async () => {
      const text = await getPdfText(await service.generateSchedulePdf(stateSchedule()));
      expect(text).toContain('Day 1 Wave 1');
      expect(text).toContain('Day 2 Wave 6');
    });

    it('shrinks rows to keep a summary with long, wrapping category lists on one page', async () => {
      // At full size these 12 three-line category lists need ~1670pt against ~1030pt available.
      const buffer = await service.generateSchedulePdf(stateSchedule({ splitsPerWave: 3, longNames: true }));
      expect(await getPdfPageCount(buffer)).toBe(2);
    });

    it('still spills to another page (never overflows) when even the smallest size cannot fit', async () => {
      const buffer = await service.generateSchedulePdf(stateSchedule({ splitsPerWave: 14, longNames: true }));
      expect(await getPdfPageCount(buffer)).toBeGreaterThan(2);
      const text = await getPdfText(buffer);
      expect(text).toContain('DAY 2');
    });

    it('prints the official wave number, skipping waves this team has no riders in', async () => {
      const schedule = stateSchedule();
      schedule.waves = schedule.waves.filter((w) => !(w.day === 1 && w.waveNumber === 2));
      const summary = await getPdfPageText(await service.generateSchedulePdf(schedule), 1);
      // Day 1 rows read 1, 3, 4… — no renumbering of the remaining waves.
      expect(summary).not.toMatch(/FRI OCT 23\s+2\s/);
      expect(summary).toContain('11 waves');
    });

    it('shows a dash in the WAVE column for an unscheduled category\'s standalone wave', async () => {
      const schedule = stateSchedule();
      schedule.waves.push({
        waveName: 'Mystery', waveNumber: null, day: null, date: '',
        categories: [{ categoryName: 'Mystery', stageTime: '', startTime: '', laps: null, athletes: [] }],
      });
      const summary = await getPdfPageText(await service.generateSchedulePdf(schedule), 1);
      expect(summary).toContain('—   Mystery');
    });
  });

  describe('check-in roster', () => {
    it('keeps a 12-wave, two-day roster on one page with each category\'s wave named', async () => {
      const buffer = await service.generateRosterPdf(stateSchedule());
      expect(await getPdfPageCount(buffer)).toBe(1);
      const text = await getPdfText(buffer);
      expect(text).toContain('DAY 1 WAVE 1');
      expect(text).toContain('DAY 2 WAVE 6');
    });

    it('widens to more columns rather than dropping categories when four cannot hold them', async () => {
      // 48 categories / 240 riders — more than four columns hold even at the smallest row height.
      const buffer = await service.generateRosterPdf(stateSchedule({ splitsPerWave: 4, ridersPerSplit: 5 }));
      expect(await getPdfPageCount(buffer)).toBe(1);
      const text = await getPdfText(buffer);
      expect(text).toContain('D1W1 Cat Split 1');
      expect(text).toContain('D2W6 Cat Split 4');
    });
  });

  describe('pocket', () => {
    it('puts Day 1 on one sheet and Day 2 on the other', async () => {
      const buffer = await service.generatePocketPdf(stateSchedule());
      expect(await getPdfPageCount(buffer)).toBe(4);
      const day1 = (await getPdfPageText(buffer, 1)) + (await getPdfPageText(buffer, 2));
      const day2 = (await getPdfPageText(buffer, 3)) + (await getPdfPageText(buffer, 4));
      for (let w = 1; w <= 6; w++) {
        expect(day1).toContain(`Day 1 Wave ${w}`);
        expect(day2).toContain(`Day 2 Wave ${w}`);
      }
      expect(day1).not.toContain('Day 2');
      expect(day2).not.toContain('Day 1');
    });

    it('shrinks an oversized wave\'s rows so every rider still lands on that wave\'s panel', async () => {
      const buffer = await service.generatePocketPdf(stateSchedule({ splitsPerWave: 4, ridersPerSplit: 12 }));
      expect(await getPdfPageCount(buffer)).toBe(4);
      const text = await getPdfText(buffer);
      // Last rider of Day 1 Wave 1's 4th split — the bottom of the panel's tallest column.
      expect(text).toContain('F10311 L10311');
    });
  });
});
