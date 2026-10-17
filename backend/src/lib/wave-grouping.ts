import type { CategorySchedule } from '../application/wave-schedule-service.js';

// The official call-up list is the source of truth for waves: categories (and "Split N" sections)
// that stage or start within this many minutes of the previous one go off together as one wave.
// Chained, so 8:30 / 8:35 / 8:40 is a single wave even though 8:30 → 8:40 is 10 minutes.
export const WAVE_GAP_MINUTES = 5;

export interface WaveAssignment {
  waveName: string;
  waveNumber: number; // restarts at 1 on each race day
  day: number | null; // 1-based race day; null when the whole race runs on a single day
  date: string;
}

function toMinutes(hhmm: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function withinGap(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) <= WAVE_GAP_MINUTES;
}

// Numbering is computed from the whole race's schedule (every category on the call-up list), not
// one team's riders, so "Day 2 Wave 4" means the same heat on every team's printout. Categories
// with no start time can't be placed in a wave and are left out of the returned map.
export function assignWaves(
  categorySchedule: Record<string, CategorySchedule>,
): Map<string, WaveAssignment> {
  const scheduled = Object.entries(categorySchedule)
    .filter(([, s]) => s.startTime)
    .map(([name, s]) => ({ name, date: s.date ?? '', stageTime: s.stageTime, startTime: s.startTime }))
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.stageTime.localeCompare(b.stageTime) ||
      a.name.localeCompare(b.name),
    );

  const dates = [...new Set(scheduled.map((c) => c.date))];
  const multiDay = dates.length > 1;

  const result = new Map<string, WaveAssignment>();
  let prev: (typeof scheduled)[number] | null = null;
  let waveNumber = 0;

  for (const cat of scheduled) {
    const sameDay = prev !== null && prev.date === cat.date;
    if (!sameDay) waveNumber = 0;
    const joinsPrevious =
      sameDay &&
      (withinGap(toMinutes(prev!.startTime), toMinutes(cat.startTime)) ||
        withinGap(toMinutes(prev!.stageTime), toMinutes(cat.stageTime)));
    if (!joinsPrevious) waveNumber++;

    const day = multiDay ? dates.indexOf(cat.date) + 1 : null;
    result.set(cat.name, {
      waveName: day === null ? `Wave ${waveNumber}` : `Day ${day} Wave ${waveNumber}`,
      waveNumber,
      day,
      date: cat.date,
    });
    prev = cat;
  }

  return result;
}
