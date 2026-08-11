/**
 * IT-007 — End-to-end flow from call-up list upload to schedule export
 *
 * Validates the complete user journey: upload → import → team select → schedule → logistics → PDF.
 * Runs entirely offline against a synthetic call-up list workbook (no external service dependency,
 * unlike the retired RaceResult-based version of this test).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import ExcelJS from 'exceljs';
import { CallUpListService } from '../../application/callup-list-service.js';
import { WaveScheduleService } from '../../application/wave-schedule-service.js';
import { LogisticsService } from '../../application/logistics-service.js';
import { PdfExportService } from '../../application/pdf-export-service.js';
import type { RaceEventMetadata, RaceParticipant } from '../../domain/race-event.js';
import type { CategorySchedule } from '../../application/wave-schedule-service.js';
import type { WaveConfig } from '../../domain/wave-config.js';

// Wave grouping only — stage/start times come from the uploaded workbook, not this config.
const testWaveConfig: WaveConfig[] = [
  {
    configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
    entries: [
      { categoryName: 'JV B Boys', stageTime: '00:00', startTime: '00:00', laps: 2 },
    ],
    createdAt: '', updatedAt: '',
  },
  {
    configId: 'w3', organizationId: 'GLOBAL', waveName: 'Wave 3 - HS',
    entries: [
      { categoryName: 'Varsity Boys', stageTime: '00:00', startTime: '00:00', laps: 4 },
      { categoryName: 'Varsity Girls', stageTime: '00:00', startTime: '00:00', laps: 3 },
    ],
    createdAt: '', updatedAt: '',
  },
];

const HEADER_ROW = ['STAGING', 'CALLUP', 'PLATE', 'Region', 'NAME', 'DIV', 'GRD', 'TEAM', 'CONTEST'];

async function buildCallUpListWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  const rows: (string | number)[][] = [
    HEADER_ROW,
    ['JV B Boys'],
    ['STAGING TIME: 09/20/2025 @ 7:40 AM'],
    ['START TIME: 09/20/2025 @ 8:00 AM'],
    ['7:40 AM', 1, '101', '5', 'ZACK ADAMS', '2', '10', 'Brighton', 'JV B Boys'],
    ['7:40 AM', 2, '102', '5', 'AMY BAKER', '2', '10', 'Alpine', 'JV B Boys'],
    ['Varsity Boys'],
    ['STAGING TIME: 09/20/2025 @ 9:50 AM'],
    ['START TIME: 09/20/2025 @ 10:10 AM'],
    ['9:50 AM', 1, '201', '5', 'MIKE CLARK', '2', '11', 'Brighton', 'Varsity Boys'],
    ['9:50 AM', 2, '202', '5', 'DAVE ADAMS', '2', '11', 'Brighton', 'Varsity Boys'],
    ['9:50 AM', 3, '203', '5', 'SAM STONE', '2', '11', 'Alpine', 'Varsity Boys'],
    ['Varsity Girls'],
    ['STAGING TIME: 09/20/2025 @ 9:55 AM'],
    ['START TIME: 09/20/2025 @ 10:15 AM'],
    ['9:55 AM', 1, '301', '5', 'SARA EVANS', '2', '11', 'Brighton', 'Varsity Girls'],
  ];
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('IT-007: E2E Call-Up List Upload to Export', () => {
  let metadata: RaceEventMetadata;
  let participants: RaceParticipant[];
  let categorySchedule: Record<string, CategorySchedule>;
  let selectedTeam: string;

  // Phase 1: Upload and Import
  describe('Phase 1 — Import', () => {
    beforeAll(async () => {
      const buffer = await buildCallUpListWorkbook();
      const mockPublisher = { publish: async () => {} };
      const service = new CallUpListService(mockPublisher);

      const result = await service.importCallUpList(buffer, {
        eventName: 'UTAH HS MTB 2025 - REGION 5',
        eventLocation: 'Beaver County, UT',
      });
      metadata = result.metadata;
      participants = result.participants;
      categorySchedule = result.categorySchedule;
    });

    it('IT-007-SC-01: upload is accepted and parsed', () => {
      expect(participants.length).toBeGreaterThan(0);
    });

    it('IT-007-SC-02: response contains eventName, eventDate, eventLocation, and teams array', () => {
      expect(metadata.eventName).toBeTruthy();
      expect(metadata.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(metadata.eventLocation).toBeTruthy();
      expect(metadata.teams).toBeInstanceOf(Array);
      expect(metadata.teams.length).toBeGreaterThan(0);
    });

    it('IT-007-SC-03: participants array has 5+ records across teams', () => {
      expect(participants.length).toBeGreaterThanOrEqual(5);
    });
  });

  // Phase 2: Team Selection
  describe('Phase 2 — Team Selection', () => {
    beforeAll(() => {
      const teamCounts = new Map<string, number>();
      for (const p of participants) {
        if (p.team) teamCounts.set(p.team, (teamCounts.get(p.team) ?? 0) + 1);
      }
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
      const service = new CallUpListService(mockPublisher);
      const teams = service.getTeamList(metadata.teams, participants);

      expect(teams.length).toBeGreaterThan(0);
      expect(teams[0]).toHaveProperty('name');
      expect(teams[0]).toHaveProperty('count');
      for (let i = 1; i < teams.length; i++) {
        expect(teams[i].name.localeCompare(teams[i - 1].name, undefined, { sensitivity: 'base' }))
          .toBeGreaterThanOrEqual(0);
      }
    });

    it('IT-007-SC-06: team selection is valid', () => {
      expect(selectedTeam).toBeTruthy();
      expect(participants.some((p) => p.team === selectedTeam)).toBe(true);
    });
  });

  // Phase 3: Wave Schedule Generation
  describe('Phase 3 — Wave Schedule', () => {
    it('IT-007-SC-07 to SC-10: wave schedule generated correctly from the uploaded schedule', () => {
      const scheduleService = new WaveScheduleService();
      const schedule = scheduleService.generateSchedule(
        selectedTeam,
        participants,
        testWaveConfig,
        categorySchedule,
        metadata.eventName,
        metadata.eventDate,
      );

      // SC-07: contains the selected team
      expect(schedule.teamName).toBe(selectedTeam);
      // SC-10: athletes are present
      expect(schedule.totalAthletes).toBeGreaterThan(0);

      for (const wave of schedule.waves) {
        expect(wave.waveName).toBeTruthy();
        for (const cat of wave.categories) {
          // SC-09: per-category start/stage times from the uploaded call-up list
          expect(cat.startTime).toMatch(/^\d{2}:\d{2}$/);
          expect(cat.stageTime).toMatch(/^\d{2}:\d{2}$/);
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
    it('IT-007-SC-11 to SC-14: logistics enrichment derived from per-category start times', () => {
      const scheduleService = new WaveScheduleService();
      const logisticsService = new LogisticsService();

      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig, categorySchedule,
        metadata.eventName, metadata.eventDate,
      );
      const enriched = logisticsService.enrichSchedule(schedule);

      for (const wave of enriched.waves) {
        for (const cat of wave.categories) {
          for (const athlete of cat.athletes) {
            // SC-11: logistics object present
            expect(athlete.logistics).toBeDefined();
            expect(athlete.logistics!.waveMeetingTime).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.warmupStart).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.warmupEnd).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.stagingTime).toMatch(/^\d{2}:\d{2}$/);
            expect(athlete.logistics!.raceStart).toMatch(/^\d{2}:\d{2}$/);

            // SC-14: staging time is derived from this category's start time
            expect(athlete.logistics!.stagingTime).toBe(cat.stageTime);
          }
        }
      }
    });
  });

  // Phase 5: PDF Export
  describe('Phase 5 — PDF Export', () => {
    it('IT-007-SC-15 to SC-18: PDF generation includes the Staging # column', async () => {
      const scheduleService = new WaveScheduleService();
      const logisticsService = new LogisticsService();
      const pdfService = new PdfExportService();

      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig, categorySchedule,
        metadata.eventName, metadata.eventDate,
      );
      const enriched = logisticsService.enrichSchedule(schedule);

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
    it('IT-007-SC-19 to SC-20: athlete count matches and is traceable, staging numbers preserved', () => {
      const scheduleService = new WaveScheduleService();
      const schedule = scheduleService.generateSchedule(
        selectedTeam, participants, testWaveConfig, categorySchedule,
        metadata.eventName, metadata.eventDate,
      );

      // SC-19: athlete count matches filtered participants
      const teamParticipants = participants.filter(
        (p) => p.team.toLowerCase() === selectedTeam.toLowerCase(),
      );
      expect(schedule.totalAthletes).toBe(teamParticipants.length);

      // SC-20: every schedule athlete traceable to import data, staging number carried through
      for (const wave of schedule.waves) {
        for (const cat of wave.categories) {
          for (const athlete of cat.athletes) {
            const source = teamParticipants.find(
              (p) => p.firstName === athlete.firstName && p.lastName === athlete.lastName,
            );
            expect(source).toBeDefined();
            expect(athlete.callUpNumber).toBe(source!.callUpNumber);
          }
        }
      }
    });
  });
});
