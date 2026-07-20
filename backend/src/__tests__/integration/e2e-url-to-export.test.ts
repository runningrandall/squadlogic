/**
 * IT-007 — End-to-end flow from URL submission to schedule export
 *
 * Validates the complete user journey: URL → import → team select → schedule → logistics → PDF.
 * Requires live RaceResult connectivity.
 *
 * Run with: RUN_INTEGRATION_TESTS=1 pnpm --filter backend run test -- --run e2e-url-to-export
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { RaceResultUrlSchema } from '../../domain/race-event.js';
import { RaceResultClient } from '../../adapters/raceresult-client.js';
import { RaceResultHtmlParser } from '../../adapters/raceresult-parser.js';
import { RaceEventService } from '../../application/race-event-service.js';
import { WaveScheduleService } from '../../application/wave-schedule-service.js';
import { LogisticsService } from '../../application/logistics-service.js';
import { PdfExportService } from '../../application/pdf-export-service.js';
import type { RaceEventMetadata, RaceParticipant } from '../../domain/race-event.js';
import type { WaveConfig } from '../../domain/wave-config.js';

const SKIP = !process.env.RUN_INTEGRATION_TESTS;
const describeE2E = SKIP ? describe.skip : describe;

// Seed wave config for test (subset of the real 2026 schedule)
const testWaveConfig: WaveConfig[] = [
  {
    configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
    entries: [
      { categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 },
      { categoryName: 'JV C Boys', stageTime: '07:45', startTime: '08:05', laps: 2 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    configId: 'w2', organizationId: 'GLOBAL', waveName: 'Wave 2 - HS',
    entries: [
      { categoryName: 'JV A Boys', stageTime: '08:35', startTime: '08:55', laps: 3 },
      { categoryName: 'Freshman A Boys', stageTime: '08:40', startTime: '09:00', laps: 2 },
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
];

describeE2E('IT-007: E2E URL to Export', () => {
  const TEST_URL = 'https://my.raceresult.com/411620/';
  let metadata: RaceEventMetadata;
  let participants: RaceParticipant[];
  let selectedTeam: string;

  // Phase 1: URL Submission and Event Import
  describe('Phase 1 — Import', () => {
    beforeAll(async () => {
      // SC-01: URL validation
      const validated = RaceResultUrlSchema.parse(TEST_URL);
      expect(validated.eventId).toBe('411620');

      // Import event data
      const client = new RaceResultClient(10000);
      const parser = new RaceResultHtmlParser();
      const mockPublisher = { publish: async () => {} };
      const service = new RaceEventService(client, parser, mockPublisher);

      const result = await service.importEvent(validated.url, validated.eventId);
      metadata = result.metadata;
      participants = result.participants;
    }, 20000);

    it('IT-007-SC-01: URL is accepted and validated', () => {
      const result = RaceResultUrlSchema.safeParse(TEST_URL);
      expect(result.success).toBe(true);
    });

    it('IT-007-SC-02: response contains eventName, eventDate, eventLocation, and teams array', () => {
      expect(metadata.eventName).toBeTruthy();
      expect(metadata.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(metadata.eventLocation).toBeTruthy();
      expect(metadata.teams).toBeInstanceOf(Array);
      expect(metadata.teams.length).toBeGreaterThan(0);
    });

    it('IT-007-SC-03: participants array has 10+ records', () => {
      expect(participants.length).toBeGreaterThanOrEqual(10);
    });
  });

  // Phase 2: Team Selection
  describe('Phase 2 — Team Selection', () => {
    beforeAll(() => {
      // Pick a team that we know has participants
      const teamCounts = new Map<string, number>();
      for (const p of participants) {
        if (p.team) teamCounts.set(p.team, (teamCounts.get(p.team) ?? 0) + 1);
      }

      // Select the team with the most participants
      let maxCount = 0;
      for (const [team, count] of teamCounts) {
        if (count > maxCount) {
          maxCount = count;
          selectedTeam = team;
        }
      }
    });

    it('IT-007-SC-05: teams list is available with counts', () => {
      const mockPublisher = { publish: async () => {} };
      const service = new RaceEventService(
        new RaceResultClient(), new RaceResultHtmlParser(), mockPublisher,
      );
      const teams = service.getTeamList(metadata.teams, participants);

      expect(teams.length).toBeGreaterThan(0);
      expect(teams[0]).toHaveProperty('name');
      expect(teams[0]).toHaveProperty('count');
      // Verify sorted
      for (let i = 1; i < teams.length; i++) {
        expect(teams[i].name.localeCompare(teams[i - 1].name, undefined, { sensitivity: 'base' }))
          .toBeGreaterThanOrEqual(0);
      }
    });

    it('IT-007-SC-06: team selection is valid', () => {
      expect(selectedTeam).toBeTruthy();
      expect(
        participants.some((p) => p.team === selectedTeam),
      ).toBe(true);
    });
  });

  // Phase 3: Wave Schedule Generation
  describe('Phase 3 — Wave Schedule', () => {
    it('IT-007-SC-07 to SC-10: wave schedule generated correctly', () => {
      const scheduleService = new WaveScheduleService();
      const schedule = scheduleService.generateSchedule(
        selectedTeam,
        participants,
        testWaveConfig,
        metadata.eventName,
        metadata.eventDate,
      );

      // SC-07: contains the selected team
      expect(schedule.teamName).toBe(selectedTeam);
      // SC-10: athletes are present
      expect(schedule.totalAthletes).toBeGreaterThan(0);

      // Verify grouping structure
      for (const wave of schedule.waves) {
        expect(wave.waveName).toBeTruthy();
        for (const cat of wave.categories) {
          // SC-09: per-category start/stage times from config
          if (wave.waveName !== 'Unassigned') {
            expect(cat.startTime).toMatch(/^\d{2}:\d{2}$/);
            expect(cat.stageTime).toMatch(/^\d{2}:\d{2}$/);
          }
          for (const athlete of cat.athletes) {
            expect(athlete.firstName).toBeTruthy();
            expect(athlete.lastName).toBeTruthy();
          }
        }
      }
    });
  });

  // Phase 4: Logistics Enrichment
  describe('Phase 4 — Logistics', () => {
    it('IT-007-SC-11 to SC-14: logistics enrichment with category-aware defaults', () => {
      const scheduleService = new WaveScheduleService();
      const logisticsService = new LogisticsService();

      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig,
        metadata.eventName, metadata.eventDate,
      );

      const config = logisticsService.calculateDefaults(testWaveConfig);
      const enriched = logisticsService.enrichSchedule(schedule, config);

      for (const wave of enriched.waves) {
        if (wave.waveName === 'Unassigned') continue;

        for (const cat of wave.categories) {
          for (const athlete of cat.athletes) {
            // SC-11: logistics object present
            expect(athlete.logistics).toBeDefined();
            expect(athlete.logistics!.waveMeetingTime).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.warmupStart).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.warmupEnd).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.stagingTime).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.raceStart).toMatch(/^\d{2}:\d{2}$/);

            // SC-14: staging time matches config
            expect(athlete.logistics!.stagingTime).toBe(cat.stageTime);
          }
        }

        // SC-12/SC-13: verify category-aware arrival defaults
        const arrivalBefore = config.arrivalOverrides.get(wave.waveName);
        if (wave.waveName === 'Wave 3 - HS') {
          expect(arrivalBefore).toBe(70); // Varsity
        } else if (wave.waveName === 'Wave 1 - HS') {
          expect(arrivalBefore).toBe(60); // JV B — no Varsity/JV A
        }
      }
    });
  });

  // Phase 5: PDF Export
  describe('Phase 5 — PDF Export', () => {
    it('IT-007-SC-15 to SC-18: PDF generation', async () => {
      const scheduleService = new WaveScheduleService();
      const logisticsService = new LogisticsService();
      const pdfService = new PdfExportService();

      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig,
        metadata.eventName, metadata.eventDate,
      );
      const config = logisticsService.calculateDefaults(testWaveConfig);
      const enriched = logisticsService.enrichSchedule(schedule, config);

      // SC-15: valid PDF
      const buffer = await pdfService.generatePdf(enriched, {
        teamDisplayName: 'Test Team',
        primaryColor: '#1E3A5F',
        tertiaryColor: '#FFFFFF',
        logoUrl: null,
      });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(buffer.length).toBeGreaterThan(0);

      // SC-16: filename pattern
      const filename = pdfService.generateFilename('Test Team', metadata.eventDate);
      expect(filename).toMatch(/^Test_Team_\d{4}-\d{2}-\d{2}_schedule\.pdf$/);
    });
  });

  // Phase 6: Data Consistency
  describe('Phase 6 — Data Consistency', () => {
    it('IT-007-SC-19 to SC-20: athlete count matches and is traceable', () => {
      const scheduleService = new WaveScheduleService();
      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig,
        metadata.eventName, metadata.eventDate,
      );

      // SC-19: athlete count matches filtered participants
      const teamParticipants = participants.filter(
        (p) => p.team.toLowerCase() === selectedTeam.toLowerCase(),
      );
      expect(schedule.totalAthletes).toBe(teamParticipants.length);

      // SC-20: every schedule athlete traceable to import data
      for (const wave of schedule.waves) {
        for (const cat of wave.categories) {
          for (const athlete of cat.athletes) {
            const found = teamParticipants.some(
              (p) =>
                p.firstName === athlete.firstName &&
                p.lastName === athlete.lastName,
            );
            expect(found).toBe(true);
          }
        }
      }
    });
  });
}, 30000);
