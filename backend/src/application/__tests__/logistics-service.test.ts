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
    // Rules: waveMeeting passed in; warmupStart = waveMeeting + 10 (passed in);
    //        warmupEnd = startTime - 25; stagingTime = startTime - 20

    it('TC-050: validates the documented example — start 08:00, meeting 07:00', () => {
      const result = service.calculateTimeline('08:00', '07:00', '07:10');
      expect(result.waveMeetingTime).toBe('07:00');
      expect(result.warmupStart).toBe('07:10');
      expect(result.warmupEnd).toBe('07:35');   // 08:00 - 25 min
      expect(result.stagingTime).toBe('07:40'); // 08:00 - 20 min
      expect(result.raceStart).toBe('08:00');
    });

    it('TC-048: Varsity Boys timeline', () => {
      const result = service.calculateTimeline('10:10', '09:10', '09:20');
      expect(result.waveMeetingTime).toBe('09:10');
      expect(result.warmupStart).toBe('09:20');
      expect(result.warmupEnd).toBe('09:45');   // 10:10 - 25 min
      expect(result.stagingTime).toBe('09:50'); // 10:10 - 20 min
      expect(result.raceStart).toBe('10:10');
    });

    it('TC-049: Varsity Girls — later start shifts WU end and staging', () => {
      const result = service.calculateTimeline('10:15', '09:10', '09:20');
      expect(result.waveMeetingTime).toBe('09:10'); // same global meeting
      expect(result.warmupStart).toBe('09:20');     // same global WU start
      expect(result.warmupEnd).toBe('09:50');       // 10:15 - 25 min
      expect(result.stagingTime).toBe('09:55');     // 10:15 - 20 min
      expect(result.raceStart).toBe('10:15');
    });

    it('returns empty logistics when waveMeetingTime is empty', () => {
      const result = service.calculateTimeline('', '', '');
      expect(result.waveMeetingTime).toBe('');
      expect(result.warmupStart).toBe('');
      expect(result.warmupEnd).toBe('');
      expect(result.raceStart).toBe('');
      expect(result.stagingTime).toBe('');
    });
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
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201', callUpNumber: '1' },
                { firstName: 'Mike', lastName: 'Clark', bibNumber: '202', callUpNumber: '1' },
              ],
            },
            {
              categoryName: 'Varsity Girls',
              stageTime: '09:55',
              startTime: '10:15',
              laps: 3,
              athletes: [
                { firstName: 'Sara', lastName: 'Evans', bibNumber: '301', callUpNumber: '1' },
              ],
            },
          ],
        },
      ],
    };

    it('TC-052: same-category athletes have identical logistics times', () => {
      const enriched = service.enrichSchedule(schedule);
      const varsityBoys = enriched.waves[0].categories[0].athletes;
      expect(varsityBoys[0].logistics).toEqual(varsityBoys[1].logistics);
    });

    it('TC-053: all categories share global wave meeting and WU start; race starts differ', () => {
      const enriched = service.enrichSchedule(schedule);
      const boys = enriched.waves[0].categories[0].athletes[0].logistics;
      const girls = enriched.waves[0].categories[1].athletes[0].logistics;
      expect(boys?.raceStart).toBe('10:10');
      expect(girls?.raceStart).toBe('10:15');
      expect(boys?.waveMeetingTime).toBe(girls?.waveMeetingTime);
      expect(boys?.warmupStart).toBe(girls?.warmupStart);
    });

    it('wave meeting = earliest startTime in that wave - 60 min', () => {
      const enriched = service.enrichSchedule(schedule);
      // Earliest start in wave = 10:10; meeting = 10:10 - 60 = 09:10
      const waveMeetingTime = enriched.waves[0].categories[0].athletes[0].logistics?.waveMeetingTime;
      expect(waveMeetingTime).toBe('09:10');
    });

    it('WU start = wave meeting + 10 min', () => {
      const enriched = service.enrichSchedule(schedule);
      // wave meeting = 09:10; WU start = 09:10 + 10 = 09:20
      const warmupStart = enriched.waves[0].categories[0].athletes[0].logistics?.warmupStart;
      expect(warmupStart).toBe('09:20');
    });

    it('different waves get different wave meeting times based on their own start times', () => {
      const multiWaveSchedule: TeamWaveSchedule = {
        ...schedule,
        waves: [
          { waveName: 'Wave 1', categories: [{ categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2, athletes: [{ firstName: 'A', lastName: 'B', bibNumber: '1', callUpNumber: '1' }] }] },
          { waveName: 'Wave 2', categories: [{ categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4, athletes: [{ firstName: 'C', lastName: 'D', bibNumber: '2', callUpNumber: '1' }] }] },
        ],
      };
      const enriched = service.enrichSchedule(multiWaveSchedule);
      const wave1Meeting = enriched.waves[0].categories[0].athletes[0].logistics?.waveMeetingTime;
      const wave2Meeting = enriched.waves[1].categories[0].athletes[0].logistics?.waveMeetingTime;
      expect(wave1Meeting).toBe('07:00'); // 08:00 - 60
      expect(wave2Meeting).toBe('09:10'); // 10:10 - 60
    });

    it('JD waves use the standard earliest-start-60 formula, same as every other wave', () => {
      // Each JD wave publishes its own meeting time on the league schedule (lehimtb.com/race-day) —
      // Wave 7/8/9 are not a single shared 1pm head-coach meeting.
      const jdSchedule: TeamWaveSchedule = {
        ...schedule,
        waves: [
          {
            waveName: 'Wave 7 - JD',
            categories: [
              {
                categoryName: 'Advanced Boys',
                stageTime: '14:15',
                startTime: '14:30',
                laps: 1,
                athletes: [{ firstName: 'A', lastName: 'B', bibNumber: '1', callUpNumber: '1' }],
              },
            ],
          },
        ],
      };
      const enriched = service.enrichSchedule(jdSchedule);
      const logistics = enriched.waves[0].categories[0].athletes[0].logistics;
      expect(logistics?.waveMeetingTime).toBe('13:30'); // 14:30 - 60, matches published Wave 7 meeting time
      expect(logistics?.warmupStart).toBe('13:40'); // meeting + 10
      expect(logistics?.raceStart).toBe('14:30');
    });
  });
});
