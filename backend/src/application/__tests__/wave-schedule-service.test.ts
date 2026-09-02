import { describe, it, expect } from 'vitest';
import { WaveScheduleService } from '../wave-schedule-service.js';
import type { CategorySchedule } from '../wave-schedule-service.js';
import type { RaceParticipant } from '../../domain/race-event.js';
import type { WaveConfig } from '../../domain/wave-config.js';

const service = new WaveScheduleService();

// WaveConfig now only supplies wave grouping + laps — stageTime/startTime here are unused
// by WaveScheduleService (kept only because the WaveConfigEntry schema still requires them).
const waveConfig: WaveConfig[] = [
  {
    configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
    entries: [
      { categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 },
      { categoryName: 'JV C Boys', stageTime: '07:45', startTime: '08:05', laps: 2 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    configId: 'w3', organizationId: 'GLOBAL', waveName: 'Wave 3 - HS',
    entries: [
      { categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4 },
      { categoryName: 'Varsity Girls', stageTime: '09:55', startTime: '10:15', laps: 3 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    configId: 'w2', organizationId: 'GLOBAL', waveName: 'Wave 2 - HS',
    entries: [
      { categoryName: 'JV A Boys', stageTime: '08:35', startTime: '08:55', laps: 3 },
    ],
    createdAt: '', updatedAt: '',
  },
];

// Real stage/start times now come from the uploaded call-up list, not WaveConfig.
const categorySchedule: Record<string, CategorySchedule> = {
  'JV B Boys': { stageTime: '07:40', startTime: '08:00' },
  'JV C Boys': { stageTime: '07:45', startTime: '08:05' },
  'JV A Boys': { stageTime: '08:35', startTime: '08:55' },
  'Varsity Boys': { stageTime: '09:50', startTime: '10:10' },
  'Varsity Girls': { stageTime: '09:55', startTime: '10:15' },
};

const participants: RaceParticipant[] = [
  { firstName: 'Zack', lastName: 'Adams', team: 'Brighton', category: 'JV B Boys', bibNumber: '101', callUpNumber: '1' },
  { firstName: 'Amy', lastName: 'Baker', team: 'Brighton', category: 'JV C Boys', bibNumber: '102', callUpNumber: '2' },
  { firstName: 'Mike', lastName: 'Clark', team: 'Brighton', category: 'Varsity Boys', bibNumber: '201', callUpNumber: '3' },
  { firstName: 'Dave', lastName: 'Adams', team: 'Brighton', category: 'Varsity Boys', bibNumber: '202', callUpNumber: '4' },
  { firstName: 'Sara', lastName: 'Evans', team: 'Alpine', category: 'Varsity Girls', bibNumber: '301', callUpNumber: '1' },
  { firstName: 'Tom', lastName: 'Frank', team: 'Alpine', category: 'JV A Boys', bibNumber: '401', callUpNumber: '2' },
  { firstName: 'Lisa', lastName: 'Green', team: 'Brighton', category: 'Unknown Category', bibNumber: '501', callUpNumber: null },
];

describe('WaveScheduleService', () => {
  it('TC-027: correct wave/category groupings for multi-wave team', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test Event', '2026-08-02');
    const waveNames = schedule.waves.map((w) => w.waveName);
    expect(waveNames).toContain('Wave 1 - HS');
    expect(waveNames).toContain('Wave 3 - HS');
    expect(schedule.waves.find((w) => w.waveName === 'Wave 1 - HS')?.categories).toHaveLength(2);
    expect(schedule.waves.find((w) => w.waveName === 'Wave 3 - HS')?.categories).toHaveLength(1);
  });

  it('TC-028: athletes sorted alphabetically by last name within category', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const varsityBoys = schedule.waves
      .find((w) => w.waveName === 'Wave 3 - HS')
      ?.categories.find((c) => c.categoryName === 'Varsity Boys');
    expect(varsityBoys?.athletes[0].lastName).toBe('Adams');
    expect(varsityBoys?.athletes[1].lastName).toBe('Clark');
  });

  it('TC-029: categories sorted alphabetically within wave', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const wave1Categories = schedule.waves
      .find((w) => w.waveName === 'Wave 1 - HS')
      ?.categories.map((c) => c.categoryName);
    expect(wave1Categories).toEqual(['JV B Boys', 'JV C Boys']);
  });

  it('TC-030: waves ordered by earliest category start time from the uploaded schedule', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const withKnownStart = schedule.waves.filter((w) => w.categories.some((c) => c.startTime));
    expect(withKnownStart[0].waveName).toBe('Wave 1 - HS');
    expect(withKnownStart[1].waveName).toBe('Wave 3 - HS');
  });

  it('TC-031: empty schedule for team with zero participants', () => {
    const schedule = service.generateSchedule('Nonexistent', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    expect(schedule.totalAthletes).toBe(0);
    expect(schedule.waves).toEqual([]);
  });

  it('TC-032: each category includes stageTime and startTime from the uploaded schedule', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const jvBBoys = schedule.waves
      .find((w) => w.waveName === 'Wave 1 - HS')
      ?.categories.find((c) => c.categoryName === 'JV B Boys');
    expect(jvBBoys?.stageTime).toBe('07:40');
    expect(jvBBoys?.startTime).toBe('08:00');
    expect(jvBBoys?.laps).toBe(2);
  });

  it('TC-033: each athlete has firstName, lastName, bibNumber, callUpNumber', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const firstAthlete = schedule.waves[0]?.categories[0]?.athletes[0];
    expect(firstAthlete).toHaveProperty('firstName');
    expect(firstAthlete).toHaveProperty('lastName');
    expect(firstAthlete).toHaveProperty('bibNumber');
    expect(firstAthlete).toHaveProperty('callUpNumber');
  });

  it('TC-034: category not in WaveConfig becomes its own standalone wave', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const standalone = schedule.waves.find((w) => w.waveName === 'Unknown Category');
    expect(standalone).toBeDefined();
    expect(standalone?.categories[0].athletes[0].lastName).toBe('Green');
    // no startTime known for this category → sorts last
    expect(schedule.waves[schedule.waves.length - 1].waveName).toBe('Unknown Category');
  });

  it('keeps relative order stable when two waves both have no known start time', () => {
    const noStartParticipants: RaceParticipant[] = [
      { firstName: 'A', lastName: 'A', team: 'Brighton', category: 'Mystery One', bibNumber: '1', callUpNumber: '1' },
      { firstName: 'B', lastName: 'B', team: 'Brighton', category: 'Mystery Two', bibNumber: '2', callUpNumber: '1' },
    ];
    // Neither category appears in categorySchedule, so neither wave has a known start time.
    const schedule = service.generateSchedule('Brighton', noStartParticipants, [], {}, 'Test', '2026-08-02');
    expect(schedule.waves.map((w) => w.waveName)).toEqual(['Mystery One', 'Mystery Two']);
  });

  it('sorts a wave with a known start time ahead of one with no known start time', () => {
    const mixedParticipants: RaceParticipant[] = [
      { firstName: 'A', lastName: 'A', team: 'Brighton', category: 'Known Category', bibNumber: '1', callUpNumber: '1' },
      { firstName: 'B', lastName: 'B', team: 'Brighton', category: 'Unscheduled Category', bibNumber: '2', callUpNumber: '1' },
    ];
    const sched: Record<string, CategorySchedule> = { 'Known Category': { stageTime: '08:00', startTime: '08:20' } };
    const schedule = service.generateSchedule('Brighton', mixedParticipants, [], sched, 'Test', '2026-08-02');
    expect(schedule.waves.map((w) => w.waveName)).toEqual(['Known Category', 'Unscheduled Category']);
  });

  it('TC-035: omit waves with no athletes from selected team', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, categorySchedule, 'Test', '2026-08-02');
    // Brighton has no athletes in Wave 2 (JV A Boys) — Wave 2 should not appear
    expect(schedule.waves.find((w) => w.waveName === 'Wave 2 - HS')).toBeUndefined();
  });

  it('maps entry with no laps to null in category schedule', () => {
    const noLapsConfig: WaveConfig[] = [
      {
        configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1',
        entries: [{ categoryName: 'Open', stageTime: '08:00', startTime: '08:20', laps: null }],
        createdAt: '', updatedAt: '',
      },
    ];
    const ps: RaceParticipant[] = [
      { firstName: 'A', lastName: 'B', team: 'Team', category: 'Open', bibNumber: '1', callUpNumber: '1' },
    ];
    const sched: Record<string, CategorySchedule> = { Open: { stageTime: '08:00', startTime: '08:20' } };
    const schedule = service.generateSchedule('Team', ps, noLapsConfig, sched, 'Event', '2026-08-02');
    expect(schedule.waves[0].categories[0].laps).toBeNull();
  });

  it('sorts standalone-wave athletes with same last name by first name', () => {
    const withSameLastName: RaceParticipant[] = [
      { firstName: 'Zack', lastName: 'Smith', team: 'Brighton', category: 'Unknown', bibNumber: '1', callUpNumber: '1' },
      { firstName: 'Amy', lastName: 'Smith', team: 'Brighton', category: 'Unknown', bibNumber: '2', callUpNumber: '2' },
      { firstName: 'Mike', lastName: 'Adams', team: 'Brighton', category: 'Unknown', bibNumber: '3', callUpNumber: '3' },
    ];

    const schedule = service.generateSchedule('Brighton', withSameLastName, waveConfig, categorySchedule, 'Test', '2026-08-02');
    const standalone = schedule.waves.find((w) => w.waveName === 'Unknown');
    const athletes = standalone?.categories[0].athletes ?? [];

    expect(athletes[0].lastName).toBe('Adams');
    // Both Smiths are sorted by first name: Amy before Zack
    expect(athletes[1].firstName).toBe('Amy');
    expect(athletes[2].firstName).toBe('Zack');
  });

  describe('call-up threshold by field size', () => {
    function scheduleForFieldSize(fieldSize: number) {
      const config: WaveConfig[] = [
        {
          configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1',
          entries: [{ categoryName: 'Open', stageTime: '08:00', startTime: '08:20', laps: 1 }],
          createdAt: '', updatedAt: '',
        },
      ];
      const ps: RaceParticipant[] = Array.from({ length: fieldSize }, (_, i) => ({
        firstName: `F${i}`, lastName: `L${i}`, team: 'Team', category: 'Open',
        bibNumber: String(i), callUpNumber: String(i + 1),
      }));
      const sched: Record<string, CategorySchedule> = { Open: { stageTime: '08:00', startTime: '08:20' } };
      return service.generateSchedule('Team', ps, config, sched, 'Event', '2026-08-02');
    }

    function calledUpCount(fieldSize: number): number {
      const schedule = scheduleForFieldSize(fieldSize);
      return schedule.waves[0].categories[0].athletes.filter((a) => a.calledUp).length;
    }

    it('calls up the top 5 for a field of 24 or fewer', () => {
      expect(calledUpCount(24)).toBe(5);
      expect(calledUpCount(1)).toBe(1);
    });

    it('calls up the top 10 for a field of 25-49', () => {
      expect(calledUpCount(25)).toBe(10);
      expect(calledUpCount(49)).toBe(10);
    });

    it('calls up the top 15 for a field of 50-74', () => {
      expect(calledUpCount(50)).toBe(15);
      expect(calledUpCount(74)).toBe(15);
    });

    it('calls up the top 20 for a field of 75 or more', () => {
      expect(calledUpCount(75)).toBe(20);
      expect(calledUpCount(120)).toBe(20);
    });

    it('marks exactly the lowest callUpNumber riders as called up, not an arbitrary subset', () => {
      const schedule = scheduleForFieldSize(24);
      const athletes = schedule.waves[0].categories[0].athletes;
      const calledUpNumbers = athletes.filter((a) => a.calledUp).map((a) => Number(a.callUpNumber)).sort((a, b) => a - b);
      expect(calledUpNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('bases field size on the whole race field for a category, not just the selected team', () => {
      // Category "Open" has 30 participants total across two teams — a field size that should
      // call up the top 10 — but only 3 of them are on "Home Team", with callUpNumber 7-9. If
      // field size were computed from the team-filtered list (3 riders) instead of the whole
      // field, the threshold would wrongly drop to 5 and miss all three of them.
      const config: WaveConfig[] = [
        {
          configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1',
          entries: [{ categoryName: 'Open', stageTime: '08:00', startTime: '08:20', laps: 1 }],
          createdAt: '', updatedAt: '',
        },
      ];
      const otherTeamRiders: RaceParticipant[] = Array.from({ length: 27 }, (_, i) => ({
        firstName: `Other${i}`, lastName: `L${i}`, team: 'Away Team', category: 'Open',
        bibNumber: String(100 + i), callUpNumber: String(i < 6 ? i + 1 : i + 4), // 1-6, then 10-30
      }));
      const homeTeamRiders: RaceParticipant[] = [
        { firstName: 'A', lastName: 'A', team: 'Home Team', category: 'Open', bibNumber: '1', callUpNumber: '7' },
        { firstName: 'B', lastName: 'B', team: 'Home Team', category: 'Open', bibNumber: '2', callUpNumber: '8' },
        { firstName: 'C', lastName: 'C', team: 'Home Team', category: 'Open', bibNumber: '3', callUpNumber: '9' },
      ];
      const ps = [...homeTeamRiders, ...otherTeamRiders];
      const sched: Record<string, CategorySchedule> = { Open: { stageTime: '08:00', startTime: '08:20' } };
      const schedule = service.generateSchedule('Home Team', ps, config, sched, 'Event', '2026-08-02');
      // Field size = 30 (all teams) → threshold 10, so all 3 Home Team riders (callUpNumber 7-9) qualify —
      // they would NOT qualify under a threshold of 5 computed from just their own 3-rider contingent.
      const calledUp = schedule.waves[0].categories[0].athletes.filter((a) => a.calledUp);
      expect(calledUp).toHaveLength(3);
    });

    it('never calls up an athlete with a missing or non-numeric callUpNumber', () => {
      const config: WaveConfig[] = [
        {
          configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1',
          entries: [{ categoryName: 'Open', stageTime: '08:00', startTime: '08:20', laps: 1 }],
          createdAt: '', updatedAt: '',
        },
      ];
      const ps: RaceParticipant[] = [
        { firstName: 'A', lastName: 'A', team: 'Team', category: 'Open', bibNumber: '1', callUpNumber: null },
      ];
      const sched: Record<string, CategorySchedule> = { Open: { stageTime: '08:00', startTime: '08:20' } };
      const schedule = service.generateSchedule('Team', ps, config, sched, 'Event', '2026-08-02');
      expect(schedule.waves[0].categories[0].athletes[0].calledUp).toBe(false);
    });
  });

  describe('an oversized category split across multiple sections ("Category Split 1", "Split 2")', () => {
    const config: WaveConfig[] = [
      {
        configId: 'w9', organizationId: 'GLOBAL', waveName: 'Wave 9 - JD',
        entries: [{ categoryName: 'Beginner 7th Grade Boys', stageTime: '', startTime: '', laps: 1 }],
        createdAt: '', updatedAt: '',
      },
    ];
    const sched: Record<string, CategorySchedule> = {
      'Beginner 7th Grade Boys Split 1': { stageTime: '15:40', startTime: '15:55' },
      'Beginner 7th Grade Boys Split 2': { stageTime: '15:45', startTime: '16:00' },
    };
    // callUpNumber ranks the whole combined field (1-30 here), not reset per split.
    const ps: RaceParticipant[] = [
      ...Array.from({ length: 20 }, (_, i) => ({
        firstName: `A${i}`, lastName: `A${i}`, team: 'Team', category: 'Beginner 7th Grade Boys Split 1',
        bibNumber: String(i), callUpNumber: String(i + 1),
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        firstName: `B${i}`, lastName: `B${i}`, team: 'Team', category: 'Beginner 7th Grade Boys Split 2',
        bibNumber: String(20 + i), callUpNumber: String(21 + i),
      })),
    ];

    it('still groups both splits under the WaveConfig-assigned wave, as distinct categories', () => {
      const schedule = service.generateSchedule('Team', ps, config, sched, 'Event', '2026-08-02');
      expect(schedule.waves).toHaveLength(1);
      expect(schedule.waves[0].waveName).toBe('Wave 9 - JD');
      const names = schedule.waves[0].categories.map((c) => c.categoryName);
      expect(names).toEqual(['Beginner 7th Grade Boys Split 1', 'Beginner 7th Grade Boys Split 2']);
    });

    it('gives each split its own stage/start time', () => {
      const schedule = service.generateSchedule('Team', ps, config, sched, 'Event', '2026-08-02');
      const [split1, split2] = schedule.waves[0].categories;
      expect(split1.startTime).toBe('15:55');
      expect(split2.startTime).toBe('16:00');
    });

    it('bases the call-up threshold on the combined field size across both splits, not each split alone', () => {
      // Combined field = 30 → threshold 10 (25-49 band). Computed per-split (20 and 10) it
      // would wrongly be 10 and 5 respectively, since callUpNumber ranks the whole category.
      const schedule = service.generateSchedule('Team', ps, config, sched, 'Event', '2026-08-02');
      const [split1, split2] = schedule.waves[0].categories;
      expect(split1.athletes.filter((a) => a.calledUp)).toHaveLength(10);
      expect(split2.athletes.filter((a) => a.calledUp)).toHaveLength(0);
    });
  });
});
