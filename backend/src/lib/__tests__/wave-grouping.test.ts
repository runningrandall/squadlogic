import { describe, it, expect } from 'vitest';
import { assignWaves } from '../wave-grouping.js';
import type { CategorySchedule } from '../../application/wave-schedule-service.js';

const D1 = '2026-10-23';
const D2 = '2026-10-24';

// Builds a schedule entry whose stage time is the conventional 15 minutes before start.
function at(date: string, startTime: string, stageTime?: string): CategorySchedule {
  const [h, m] = startTime.split(':').map(Number);
  const stage = h * 60 + m - 15;
  const fallback = `${String(Math.floor(stage / 60)).padStart(2, '0')}:${String(stage % 60).padStart(2, '0')}`;
  return { date, startTime, stageTime: stageTime ?? fallback };
}

function waveNames(schedule: Record<string, CategorySchedule>): Record<string, string> {
  return Object.fromEntries([...assignWaves(schedule)].map(([cat, a]) => [cat, a.waveName]));
}

describe('assignWaves', () => {
  it('chains categories starting within 5 minutes of the previous one into a single wave', () => {
    const names = waveNames({
      A: at(D1, '08:30'),
      B: at(D1, '08:35'),
      C: at(D1, '08:40'), // 10 min after A, but only 5 after B — still the same wave
    });
    expect(names).toEqual({ A: 'Wave 1', B: 'Wave 1', C: 'Wave 1' });
  });

  it('starts a new wave once the gap exceeds 5 minutes', () => {
    const names = waveNames({ A: at(D1, '08:30'), B: at(D1, '08:36') });
    expect(names).toEqual({ A: 'Wave 1', B: 'Wave 2' });
  });

  it('groups categories whose stage times are within 5 minutes even if their starts are not', () => {
    const names = waveNames({
      A: at(D1, '08:30', '08:15'),
      B: at(D1, '08:40', '08:20'),
    });
    expect(names).toEqual({ A: 'Wave 1', B: 'Wave 1' });
  });

  it('orders by start time regardless of the schedule object\'s key order', () => {
    const names = waveNames({ Late: at(D1, '10:00'), Early: at(D1, '08:00') });
    expect(names).toEqual({ Early: 'Wave 1', Late: 'Wave 2' });
  });

  it('breaks start-time ties by stage time, then by name, so ordering is deterministic', () => {
    const result = assignWaves({
      Zeta: at(D1, '08:30', '08:10'),
      Alpha: at(D1, '08:30', '08:15'),
      Beta: at(D1, '08:30', '08:15'),
    });
    expect([...result.keys()]).toEqual(['Zeta', 'Alpha', 'Beta']);
  });

  it('omits the day prefix and day number for a single-day race', () => {
    const result = assignWaves({ A: at(D1, '08:30') });
    expect(result.get('A')).toEqual({ waveName: 'Wave 1', waveNumber: 1, day: null, date: D1 });
  });

  it('treats a schedule with no dates at all (legacy session) as a single day', () => {
    const result = assignWaves({ A: { stageTime: '08:15', startTime: '08:30' } as CategorySchedule });
    expect(result.get('A')).toEqual({ waveName: 'Wave 1', waveNumber: 1, day: null, date: '' });
  });

  it('restarts numbering each day and prefixes "Day N" for a multi-day race', () => {
    const result = assignWaves({
      'JV B Boys': at(D1, '08:30'),
      'JV C Boys': at(D1, '12:05'),
      'Varsity Boys': at(D2, '08:30'),
    });
    expect(result.get('JV B Boys')).toEqual({ waveName: 'Day 1 Wave 1', waveNumber: 1, day: 1, date: D1 });
    expect(result.get('JV C Boys')).toEqual({ waveName: 'Day 1 Wave 2', waveNumber: 2, day: 1, date: D1 });
    expect(result.get('Varsity Boys')).toEqual({ waveName: 'Day 2 Wave 1', waveNumber: 1, day: 2, date: D2 });
  });

  it('never chains across days, even when the times are identical', () => {
    const names = waveNames({ A: at(D1, '08:30'), B: at(D2, '08:30') });
    expect(names).toEqual({ A: 'Day 1 Wave 1', B: 'Day 2 Wave 1' });
  });

  it('leaves out a category with no start time', () => {
    const result = assignWaves({ A: at(D1, '08:30'), B: { date: D1, stageTime: '', startTime: '' } });
    expect(result.has('B')).toBe(false);
    expect(result.get('A')?.waveName).toBe('Wave 1');
  });

  it('produces 12 waves (6 per day) for the 2026 State Champs call-up list times', () => {
    // Every category/split section from "Official Call Up List State Champs_Region 5_2026".
    const schedule: Record<string, CategorySchedule> = {
      'JV B Boys Split 1': at(D1, '08:30'), 'JV B Boys Split 2': at(D1, '08:35'), 'JV B Boys Split 3': at(D1, '08:40'),
      'JV B Boys Split 4': at(D1, '09:40'), 'JV B Boys Split 5': at(D1, '09:45'),
      'JV B Girls Split 1': at(D1, '10:50'), 'JV B Girls Split 2': at(D1, '10:55'), 'JV B Girls Split 3': at(D1, '11:00'),
      'JV C Boys Split 1': at(D1, '12:05'), 'JV C Boys Split 2': at(D1, '12:10'), 'JV C Boys Split 3': at(D1, '12:15'),
      'JV C Girls Split 1': at(D1, '13:20'), 'JV C Girls Split 2': at(D1, '13:25'), 'Sr. Open Girls': at(D1, '13:30'),
      'Sr. Open Boys Split 1': at(D1, '14:35'), 'Sr. Open Boys Split 2': at(D1, '14:40'), 'Sr. Open Boys Split 3': at(D1, '14:45'),
      'Freshman A Boys Split 1': at(D2, '08:30'), 'Freshman A Boys Split 2': at(D2, '08:35'), 'Freshman A Boys Split 3': at(D2, '08:40'),
      'JV A Girls Split 1': at(D2, '09:45'), 'JV A Girls Split 2': at(D2, '09:50'), 'JV A Girls Split 3': at(D2, '09:55'),
      'JV A Boys Split 1': at(D2, '11:00'), 'JV A Boys Split 2': at(D2, '11:05'), 'JV A Boys Split 3': at(D2, '11:10'),
      'JV A Boys Split 4': at(D2, '12:30'), 'JV A Boys Split 5': at(D2, '12:35'), 'JV A Boys Split 6': at(D2, '12:40'),
      'Varsity Girls Split 1': at(D2, '14:05'), 'Varsity Girls Split 2': at(D2, '14:10'),
      'Varsity Boys Split 1': at(D2, '15:35'), 'Varsity Boys Split 2': at(D2, '15:40'), 'Varsity Boys Split 3': at(D2, '15:45'),
    };
    const assignments = [...assignWaves(schedule).values()];
    const distinct = new Set(assignments.map((a) => a.waveName));
    expect(distinct.size).toBe(12);
    expect([...distinct].filter((n) => n.startsWith('Day 1'))).toHaveLength(6);
    expect([...distinct].filter((n) => n.startsWith('Day 2'))).toHaveLength(6);
    expect(assignWaves(schedule).get('Sr. Open Girls')?.waveName).toBe('Day 1 Wave 5');
    expect(assignWaves(schedule).get('Varsity Boys Split 3')?.waveName).toBe('Day 2 Wave 6');
  });
});
