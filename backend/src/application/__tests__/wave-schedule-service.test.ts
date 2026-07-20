import { describe, it, expect } from 'vitest';
import { WaveScheduleService } from '../wave-schedule-service.js';
import type { RaceParticipant } from '../../domain/race-event.js';
import type { WaveConfig } from '../../domain/wave-config.js';

const service = new WaveScheduleService();

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

const participants: RaceParticipant[] = [
  { firstName: 'Zack', lastName: 'Adams', team: 'Brighton', category: 'JV B Boys', bibNumber: '101' },
  { firstName: 'Amy', lastName: 'Baker', team: 'Brighton', category: 'JV C Boys', bibNumber: '102' },
  { firstName: 'Mike', lastName: 'Clark', team: 'Brighton', category: 'Varsity Boys', bibNumber: '201' },
  { firstName: 'Dave', lastName: 'Adams', team: 'Brighton', category: 'Varsity Boys', bibNumber: '202' },
  { firstName: 'Sara', lastName: 'Evans', team: 'Alpine', category: 'Varsity Girls', bibNumber: '301' },
  { firstName: 'Tom', lastName: 'Frank', team: 'Alpine', category: 'JV A Boys', bibNumber: '401' },
  { firstName: 'Lisa', lastName: 'Green', team: 'Brighton', category: 'Unknown Category', bibNumber: '501' },
];

describe('WaveScheduleService', () => {
  it('TC-027: correct wave/category groupings for multi-wave team', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test Event', '2026-08-02');
    // Brighton has athletes in Wave 1 (JV B Boys, JV C Boys), Wave 3 (Varsity Boys), and Unassigned
    const waveNames = schedule.waves.map((w) => w.waveName);
    expect(waveNames).toContain('Wave 1 - HS');
    expect(waveNames).toContain('Wave 3 - HS');
    expect(schedule.waves.find((w) => w.waveName === 'Wave 1 - HS')?.categories).toHaveLength(2);
    expect(schedule.waves.find((w) => w.waveName === 'Wave 3 - HS')?.categories).toHaveLength(1);
  });

  it('TC-028: athletes sorted alphabetically by last name within category', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const varsityBoys = schedule.waves
      .find((w) => w.waveName === 'Wave 3 - HS')
      ?.categories.find((c) => c.categoryName === 'Varsity Boys');
    expect(varsityBoys?.athletes[0].lastName).toBe('Adams');
    expect(varsityBoys?.athletes[1].lastName).toBe('Clark');
  });

  it('TC-029: categories sorted alphabetically within wave', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const wave1Categories = schedule.waves
      .find((w) => w.waveName === 'Wave 1 - HS')
      ?.categories.map((c) => c.categoryName);
    expect(wave1Categories).toEqual(['JV B Boys', 'JV C Boys']);
  });

  it('TC-030: waves ordered by start time from configuration', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const nonUnassigned = schedule.waves.filter((w) => w.waveName !== 'Unassigned');
    expect(nonUnassigned[0].waveName).toBe('Wave 1 - HS');
    expect(nonUnassigned[1].waveName).toBe('Wave 3 - HS');
  });

  it('TC-031: empty schedule for team with zero participants', () => {
    const schedule = service.generateSchedule('Nonexistent', participants, waveConfig, 'Test', '2026-08-02');
    expect(schedule.totalAthletes).toBe(0);
    expect(schedule.waves).toEqual([]);
  });

  it('TC-032: each category includes stageTime and startTime from config', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const jvBBoys = schedule.waves
      .find((w) => w.waveName === 'Wave 1 - HS')
      ?.categories.find((c) => c.categoryName === 'JV B Boys');
    expect(jvBBoys?.stageTime).toBe('07:40');
    expect(jvBBoys?.startTime).toBe('08:00');
    expect(jvBBoys?.laps).toBe(2);
  });

  it('TC-033: each athlete has firstName, lastName, bibNumber', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const firstAthlete = schedule.waves[0]?.categories[0]?.athletes[0];
    expect(firstAthlete).toHaveProperty('firstName');
    expect(firstAthlete).toHaveProperty('lastName');
    expect(firstAthlete).toHaveProperty('bibNumber');
  });

  it('TC-034: unassigned group for category not in wave config', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    const unassigned = schedule.waves.find((w) => w.waveName === 'Unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned?.categories[0].athletes[0].lastName).toBe('Green');
  });

  it('TC-035: omit waves with no athletes from selected team', () => {
    const schedule = service.generateSchedule('Brighton', participants, waveConfig, 'Test', '2026-08-02');
    // Brighton has no athletes in Wave 2 (JV A Boys) — Wave 2 should not appear
    expect(schedule.waves.find((w) => w.waveName === 'Wave 2 - HS')).toBeUndefined();
  });
});
