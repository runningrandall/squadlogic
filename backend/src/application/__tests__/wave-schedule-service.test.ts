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
});
