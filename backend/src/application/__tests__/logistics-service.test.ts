import { describe, it, expect } from 'vitest';
import { LogisticsService } from '../logistics-service.js';
import type { WaveConfig } from '../../domain/wave-config.js';
import type { TeamWaveSchedule } from '../../domain/race-event.js';

const service = new LogisticsService();

const waveConfig: WaveConfig[] = [
  {
    configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
    entries: [
      { categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 },
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

describe('LogisticsService', () => {
  describe('calculateDefaults', () => {
    it('TC-036: default arrival=70 for Varsity wave', () => {
      const config = service.calculateDefaults(waveConfig);
      expect(config.arrivalOverrides.get('Wave 3 - HS')).toBe(70);
    });

    it('TC-037: default arrival=60 for JV B wave (no Varsity/JV A)', () => {
      const config = service.calculateDefaults(waveConfig);
      expect(config.arrivalOverrides.get('Wave 1 - HS')).toBe(60);
    });

    it('TC-038: default arrival=70 for JV A wave', () => {
      const config = service.calculateDefaults(waveConfig);
      expect(config.arrivalOverrides.get('Wave 2 - HS')).toBe(70);
    });

    it('TC-039: user override for specific wave, defaults for others', () => {
      const config = service.calculateDefaults(waveConfig, {
        arrivalOverrides: { 'Wave 1 - HS': 90 },
      });
      expect(config.arrivalOverrides.get('Wave 1 - HS')).toBe(90);
      expect(config.arrivalOverrides.get('Wave 3 - HS')).toBe(70); // still default
    });

    it('TC-045: default stagingBeforeMinutes=20', () => {
      const config = service.calculateDefaults(waveConfig);
      expect(config.stagingBeforeMinutes).toBe(20);
    });

    it('default warmupDurationMinutes=30', () => {
      const config = service.calculateDefaults(waveConfig);
      expect(config.warmupDurationMinutes).toBe(30);
    });
  });

  describe('calculateTimeline', () => {
    it('TC-048: Varsity Boys timeline with arrival=70, warmup=30', () => {
      const result = service.calculateTimeline('10:10', '09:50', 70, 30);
      expect(result.arrivalTime).toBe('09:00');
      expect(result.warmupStart).toBe('09:00');
      expect(result.warmupEnd).toBe('09:30');
      expect(result.stagingTime).toBe('09:50');
      expect(result.raceStart).toBe('10:10');
    });

    it('TC-049: Varsity Girls staggered start timeline', () => {
      const result = service.calculateTimeline('10:15', '09:55', 70, 30);
      expect(result.arrivalTime).toBe('09:05');
      expect(result.warmupStart).toBe('09:05');
      expect(result.warmupEnd).toBe('09:35');
      expect(result.stagingTime).toBe('09:55');
      expect(result.raceStart).toBe('10:15');
    });

    it('TC-050: JV B Boys timeline with arrival=60, warmup=30', () => {
      const result = service.calculateTimeline('08:00', '07:40', 60, 30);
      expect(result.arrivalTime).toBe('07:00');
      expect(result.warmupStart).toBe('07:00');
      expect(result.warmupEnd).toBe('07:30');
      expect(result.stagingTime).toBe('07:40');
      expect(result.raceStart).toBe('08:00');
    });

    it('TC-051: user override arrival=90 for Wave 3, Varsity Boys start=10:10', () => {
      const result = service.calculateTimeline('10:10', '09:50', 90, 30);
      expect(result.arrivalTime).toBe('08:40');
    });

    it('TC-054: warmup recalculation — warmup=20 instead of 30', () => {
      const result = service.calculateTimeline('10:10', '09:50', 70, 20);
      expect(result.warmupEnd).toBe('09:20');
    });
  });

  it('calculateTimeline returns zeros for empty startTime', () => {
    const result = service.calculateTimeline('', '', 60, 30);
    expect(result.arrivalTime).toBe('23:00'); // 0 - 60 min → normalized to 1380 min = 23:00
    expect(result.raceStart).toBe('');
    expect(result.stagingTime).toBe('');
  });

  describe('enrichSchedule', () => {
    const schedule: TeamWaveSchedule = {
      teamName: 'Brighton',
      eventName: 'Test',
      eventDate: '2026-08-02',
      totalAthletes: 3,
      waves: [
        {
          waveName: 'Wave 3 - HS',
          categories: [
            {
              categoryName: 'Varsity Boys',
              stageTime: '09:50',
              startTime: '10:10',
              laps: 4,
              athletes: [
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201' },
                { firstName: 'Mike', lastName: 'Clark', bibNumber: '202' },
              ],
            },
            {
              categoryName: 'Varsity Girls',
              stageTime: '09:55',
              startTime: '10:15',
              laps: 3,
              athletes: [
                { firstName: 'Sara', lastName: 'Evans', bibNumber: '301' },
              ],
            },
          ],
        },
      ],
    };

    it('TC-052: same-category athletes have identical logistics times', () => {
      const config = service.calculateDefaults(waveConfig);
      const enriched = service.enrichSchedule(schedule, config);
      const varsityBoys = enriched.waves[0].categories[0].athletes;
      expect(varsityBoys[0].logistics).toEqual(varsityBoys[1].logistics);
    });

    it('TC-053: different categories in same wave have different times', () => {
      const config = service.calculateDefaults(waveConfig);
      const enriched = service.enrichSchedule(schedule, config);
      const boys = enriched.waves[0].categories[0].athletes[0].logistics;
      const girls = enriched.waves[0].categories[1].athletes[0].logistics;
      expect(boys?.raceStart).toBe('10:10');
      expect(girls?.raceStart).toBe('10:15');
      expect(boys?.arrivalTime).not.toBe(girls?.arrivalTime);
    });

    it('falls back to 60-minute arrival when wave is not in arrivalOverrides', () => {
      // Build a config with an explicit map that does NOT contain our wave
      const sparseConfig = {
        arrivalOverrides: new Map<string, number>(), // empty — no overrides
        warmupDurationMinutes: 30,
        stagingBeforeMinutes: 20,
      };

      const enriched = service.enrichSchedule(schedule, sparseConfig);
      // Arrival should be raceStart (10:10 = 610 min) minus 60 = 550 min = 09:10
      const arrivalTime = enriched.waves[0].categories[0].athletes[0].logistics?.arrivalTime;
      expect(arrivalTime).toBe('09:10');
    });
  });
});
