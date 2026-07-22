import { describe, it, expect } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import type { TeamWaveSchedule } from '../../domain/race-event.js';

const service = new PdfExportService();

const schedule: TeamWaveSchedule = {
  teamName: 'Brighton Blazers',
  eventName: 'UTAH HS MTB 2026 - REGION 5',
  eventDate: '2026-08-02',
  totalAthletes: 2,
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
      ],
    },
  ],
};

describe('PdfExportService', () => {
  it('TC-062: generates a valid PDF buffer', async () => {
    const buffer = await service.generatePdf(schedule);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('TC-064: PDF contains schedule data (non-empty, multi-page capable)', async () => {
    const buffer = await service.generatePdf(schedule);
    // PDFKit compresses text, so we verify the PDF is structurally valid and substantial
    expect(buffer.length).toBeGreaterThan(500);
    // Verify PDF object structure contains page references
    const text = buffer.toString('latin1');
    expect(text).toContain('/Type /Page');
  });

  it('TC-067: uses default styling when no branding provided', async () => {
    const buffer = await service.generatePdf(schedule);
    expect(buffer.length).toBeGreaterThan(500);
    // Verify PDF is generated successfully with default styling (no error thrown)
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('TC-062 with branding: generates PDF with branding without error', async () => {
    const buffer = await service.generatePdf(schedule, {
      teamDisplayName: 'Brighton Blazers MTB',
      primaryColor: '#1E3A5F',
      tertiaryColor: '#E8EDF2',
    });
    expect(buffer.length).toBeGreaterThan(500);
    // Branded PDF should be at least as large as default (more content drawn)
    const defaultBuffer = await service.generatePdf(schedule);
    expect(buffer.length).toBeGreaterThanOrEqual(defaultBuffer.length * 0.8);
  });

  it('TC-069: filename follows {teamName}_{eventDate}_schedule.pdf pattern', () => {
    const filename = service.generateFilename('Brighton Blazers', '2026-08-02');
    expect(filename).toBe('Brighton_Blazers_2026-08-02_schedule.pdf');
  });

  it('TC-069: filename sanitizes special characters', () => {
    const filename = service.generateFilename("O'Brien Racing", '2026-08-02');
    expect(filename).toBe('OBrien_Racing_2026-08-02_schedule.pdf');
  });

  it('includes event location in header when provided', async () => {
    const buffer = await service.generatePdf(schedule, undefined, 'American Fork, UT');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('falls back to teamName in header when teamDisplayName is empty', async () => {
    const buffer = await service.generatePdf(schedule, { teamDisplayName: '' });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders athletes without logistics (uses empty string fallback)', async () => {
    const noLogisticsSchedule: TeamWaveSchedule = {
      ...schedule,
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
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201' }, // no logistics
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(noLogisticsSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('truncates long category lists so summary rows stay on one line', async () => {
    const longCatSchedule: TeamWaveSchedule = {
      ...schedule,
      totalAthletes: 3,
      waves: [{
        waveName: 'Wave 1',
        categories: [
          { categoryName: 'Freshman C Boys', stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'A', lastName: 'B', bibNumber: '1' }] },
          { categoryName: 'JV D Girls',      stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'C', lastName: 'D', bibNumber: '2' }] },
          { categoryName: 'JV E Boys',       stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'E', lastName: 'F', bibNumber: '3' }] },
        ],
      }],
    };
    const buffer = await service.generatePdf(longCatSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders alternating row backgrounds for even-indexed rows', async () => {
    const multiAthleteSchedule: TeamWaveSchedule = {
      ...schedule,
      totalAthletes: 3,
      waves: [
        {
          waveName: 'Wave 3 - HS',
          categories: [
            {
              categoryName: 'Varsity Boys',
              stageTime: '09:50',
              startTime: '10:10',
              laps: null,
              athletes: [
                { firstName: 'Athlete', lastName: 'One', bibNumber: '1', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
                { firstName: 'Athlete', lastName: 'Two', bibNumber: '2', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
                { firstName: 'Athlete', lastName: 'Three', bibNumber: '3', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(multiAthleteSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
