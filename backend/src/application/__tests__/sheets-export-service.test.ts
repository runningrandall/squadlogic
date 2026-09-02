import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SheetsExportService } from '../sheets-export-service.js';
import type { SheetsPort, SheetRow, SheetFormatting } from '../../ports/sheets-port.js';
import type { TeamWaveSchedule } from '../../domain/race-event.js';

function createMockSheetsPort(): SheetsPort {
  return {
    createSpreadsheet: vi.fn().mockResolvedValue('https://docs.google.com/spreadsheets/d/abc123'),
  };
}

const sampleSchedule: TeamWaveSchedule = {
  teamName: 'Brighton Blazers',
  eventName: 'UTAH HS MTB 2026 - REGION 5',
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
            {
              firstName: 'Dave',
              lastName: 'Adams',
              bibNumber: '201',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:50',
                raceStart: '10:10',
              },
            },
            {
              firstName: 'Mike',
              lastName: 'Clark',
              bibNumber: '202',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:50',
                raceStart: '10:10',
              },
            },
          ],
        },
        {
          categoryName: 'Varsity Girls',
          stageTime: '09:55',
          startTime: '10:15',
          laps: 3,
          athletes: [
            {
              firstName: 'Sara',
              lastName: 'Evans',
              bibNumber: '301',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:55',
                raceStart: '10:15',
              },
            },
          ],
        },
      ],
    },
  ],
};

const multiWaveSchedule: TeamWaveSchedule = {
  teamName: 'Brighton Blazers',
  eventName: 'UTAH HS MTB 2026 - REGION 5',
  eventDate: '2026-08-02',
  totalAthletes: 4,
  waves: [
    {
      waveName: 'Wave 1 - HS',
      categories: [
        {
          categoryName: 'JV B Boys',
          stageTime: '07:40',
          startTime: '08:00',
          laps: 2,
          athletes: [
            {
              firstName: 'Tom',
              lastName: 'Baker',
              bibNumber: '101',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '07:00',
                warmupStart: '07:00',
                warmupEnd: '07:30',
                stagingTime: '07:40',
                raceStart: '08:00',
              },
            },
          ],
        },
      ],
    },
    {
      waveName: 'Wave 3 - HS',
      categories: [
        {
          categoryName: 'Varsity Boys',
          stageTime: '09:50',
          startTime: '10:10',
          laps: 4,
          athletes: [
            {
              firstName: 'Dave',
              lastName: 'Adams',
              bibNumber: '201',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:50',
                raceStart: '10:10',
              },
            },
            {
              firstName: 'Mike',
              lastName: 'Clark',
              bibNumber: '202',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:50',
                raceStart: '10:10',
              },
            },
          ],
        },
        {
          categoryName: 'Varsity Girls',
          stageTime: '09:55',
          startTime: '10:15',
          laps: 3,
          athletes: [
            {
              firstName: 'Sara',
              lastName: 'Evans',
              bibNumber: '301',
              callUpNumber: '1',
              logistics: {
                waveMeetingTime: '09:10',
                warmupStart: '09:10',
                warmupEnd: '09:40',
                stagingTime: '09:55',
                raceStart: '10:15',
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('SheetsExportService', () => {
  let sheetsPort: SheetsPort;
  let service: SheetsExportService;

  beforeEach(() => {
    sheetsPort = createMockSheetsPort();
    service = new SheetsExportService(sheetsPort);
  });

  describe('buildTitle', () => {
    it('follows {teamName} - {eventName} - {eventDate} pattern', () => {
      const title = service.buildTitle(sampleSchedule);
      expect(title).toBe('Brighton Blazers - UTAH HS MTB 2026 - REGION 5 - 2026-08-02');
    });

    it('handles different team and event names', () => {
      const schedule: TeamWaveSchedule = {
        ...sampleSchedule,
        teamName: 'Alpine Riders',
        eventName: 'State Championship',
        eventDate: '2026-10-15',
      };
      const title = service.buildTitle(schedule);
      expect(title).toBe('Alpine Riders - State Championship - 2026-10-15');
    });
  });

  describe('buildRows', () => {
    it('includes column headers as the first row', () => {
      const { rows } = service.buildRows(sampleSchedule);
      expect(rows[0].values).toEqual([
        'Wave', 'Category', 'Athlete Name', 'Staging #', 'Bib #',
        'Wave Meeting', 'Warmup Start', 'Warmup End', 'Staging', 'Race Start', 'Laps',
      ]);
    });

    it('inserts wave header rows before each wave group', () => {
      const { rows, waveHeaderRows } = service.buildRows(sampleSchedule);
      // Row 0 = column headers, Row 1 = wave header for "Wave 3 - HS"
      expect(waveHeaderRows).toEqual([1]);
      expect(rows[1].values[0]).toBe('Wave 3 - HS');
    });

    it('correctly maps athlete data to row values', () => {
      const { rows } = service.buildRows(sampleSchedule);
      // Row 0 = header, Row 1 = wave header, Row 2 = first athlete
      const firstAthlete = rows[2];
      expect(firstAthlete.values).toEqual([
        'Wave 3 - HS',
        'Varsity Boys',
        'Dave Adams',
        '1',
        '201',
        '9:10 AM',
        '9:10 AM',
        '9:40 AM',
        '9:50 AM',
        '10:10 AM',
        4,
      ]);
    });

    it('maps all athletes across all categories', () => {
      const { rows } = service.buildRows(sampleSchedule);
      // 1 header + 1 wave header + 2 Varsity Boys + 1 Varsity Girls = 5
      expect(rows).toHaveLength(5);
    });

    it('includes wave headers for multiple waves', () => {
      const { rows, waveHeaderRows } = service.buildRows(multiWaveSchedule);
      // Row 0 = header, Row 1 = Wave 1 header, Row 2 = JV B athlete,
      // Row 3 = Wave 3 header, Row 4-5 = Varsity Boys, Row 6 = Varsity Girls
      expect(waveHeaderRows).toEqual([1, 3]);
      expect(rows[1].values[0]).toBe('Wave 1 - HS');
      expect(rows[3].values[0]).toBe('Wave 3 - HS');
    });

    it('handles athletes without logistics gracefully', () => {
      const scheduleWithoutLogistics: TeamWaveSchedule = {
        ...sampleSchedule,
        waves: [
          {
            waveName: 'Wave 1',
            categories: [
              {
                categoryName: 'Open',
                stageTime: '08:00',
                startTime: '08:15',
                laps: 2,
                athletes: [
                  { firstName: 'No', lastName: 'Logistics', bibNumber: '999', callUpNumber: null },
                ],
              },
            ],
          },
        ],
      };
      const { rows } = service.buildRows(scheduleWithoutLogistics);
      const athleteRow = rows[2]; // header + wave header + athlete
      expect(athleteRow.values).toEqual([
        'Wave 1', 'Open', 'No Logistics', '', '999',
        '', '', '', '', '', 2,
      ]);
    });

    it('handles categories with null laps', () => {
      const scheduleNullLaps: TeamWaveSchedule = {
        ...sampleSchedule,
        waves: [
          {
            waveName: 'Wave 1',
            categories: [
              {
                categoryName: 'Open',
                stageTime: '08:00',
                startTime: '08:15',
                laps: null,
                athletes: [
                  {
                    firstName: 'Test',
                    lastName: 'Athlete',
                    bibNumber: '100',
                    callUpNumber: '1',
                    logistics: {
                      waveMeetingTime: '07:15',
                      warmupStart: '07:15',
                      warmupEnd: '07:45',
                      stagingTime: '08:00',
                      raceStart: '08:15',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      const { rows } = service.buildRows(scheduleNullLaps);
      const athleteRow = rows[2];
      expect(athleteRow.values[10]).toBe('');
    });
  });

  describe('exportSchedule', () => {
    it('calls sheetsPort.createSpreadsheet with correct title, rows, and formatting', async () => {
      const url = await service.exportSchedule(sampleSchedule);

      expect(url).toBe('https://docs.google.com/spreadsheets/d/abc123');
      expect(sheetsPort.createSpreadsheet).toHaveBeenCalledOnce();

      const [title, rows, formatting] = vi.mocked(sheetsPort.createSpreadsheet).mock.calls[0];

      expect(title).toBe('Brighton Blazers - UTAH HS MTB 2026 - REGION 5 - 2026-08-02');
      expect(rows).toHaveLength(5); // header + wave header + 3 athletes
      expect(formatting.headerRowCount).toBe(1);
      expect(formatting.waveHeaderRows).toEqual([1]);
      expect(formatting.columnWidths).toHaveLength(11);
    });

    it('returns the spreadsheet URL from the port', async () => {
      vi.mocked(sheetsPort.createSpreadsheet).mockResolvedValue(
        'https://docs.google.com/spreadsheets/d/custom123',
      );

      const url = await service.exportSchedule(sampleSchedule);
      expect(url).toBe('https://docs.google.com/spreadsheets/d/custom123');
    });

    it('propagates errors from the sheets port', async () => {
      vi.mocked(sheetsPort.createSpreadsheet).mockRejectedValue(
        new Error('Google Sheets authentication failed'),
      );

      await expect(service.exportSchedule(sampleSchedule)).rejects.toThrow(
        'Google Sheets authentication failed',
      );
    });

    it('handles empty schedule with no waves', async () => {
      const emptySchedule: TeamWaveSchedule = {
        teamName: 'Empty Team',
        eventName: 'No Event',
        eventDate: '2026-01-01',
        totalAthletes: 0,
        waves: [],
      };

      await service.exportSchedule(emptySchedule);

      const [title, rows] = vi.mocked(sheetsPort.createSpreadsheet).mock.calls[0];
      expect(title).toBe('Empty Team - No Event - 2026-01-01');
      expect(rows).toHaveLength(1); // Just the header row
    });
  });
});
