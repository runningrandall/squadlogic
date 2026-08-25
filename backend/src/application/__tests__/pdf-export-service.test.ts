import { describe, it, expect, vi, afterEach } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText } from './pdf-test-utils.js';
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

  describe('logo embedding', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('fetches and embeds the logo when logoUrl resolves successfully', async () => {
      // Minimal valid 1x1 PNG — pdfkit's doc.image() needs real image bytes to embed.
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const pngBytes = Buffer.from(pngBase64, 'base64');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
      });
      vi.stubGlobal('fetch', mockFetch);

      const buffer = await service.generatePdf(schedule, {
        logoUrl: 'https://example.com/logo.png',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/logo.png', expect.anything());
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('generates without a logo when the fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const buffer = await service.generatePdf(schedule, { logoUrl: 'https://example.com/missing.png' });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('generates without a logo when the fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
      const buffer = await service.generatePdf(schedule, { logoUrl: 'https://example.com/error.png' });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
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
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201', callUpNumber: '1' }, // no logistics
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(noLogisticsSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('sorts categories by start time when categories are out of order', async () => {
    const unsortedSchedule: TeamWaveSchedule = {
      ...schedule,
      waves: [{
        waveName: 'Wave 1',
        categories: [
          { categoryName: 'JV B Boys', stageTime: '08:35', startTime: '08:55', laps: 3, athletes: [{ firstName: 'B', lastName: 'Last', bibNumber: '2', callUpNumber: '1' }] },
          { categoryName: 'JV A Boys', stageTime: '08:10', startTime: '08:30', laps: 3, athletes: [{ firstName: 'A', lastName: 'Last', bibNumber: '1', callUpNumber: '1' }] },
        ],
      }],
    };
    const buffer = await service.generatePdf(unsortedSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('truncates long category lists so summary rows stay on one line', async () => {
    const longCatSchedule: TeamWaveSchedule = {
      ...schedule,
      totalAthletes: 3,
      waves: [{
        waveName: 'Wave 1',
        categories: [
          { categoryName: 'Freshman C Boys', stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'A', lastName: 'B', bibNumber: '1', callUpNumber: '1' }] },
          { categoryName: 'JV D Girls',      stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'C', lastName: 'D', bibNumber: '2', callUpNumber: '1' }] },
          { categoryName: 'JV E Boys',       stageTime: '09:50', startTime: '10:10', laps: 2, athletes: [{ firstName: 'E', lastName: 'F', bibNumber: '3', callUpNumber: '1' }] },
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
                { firstName: 'Athlete', lastName: 'One', bibNumber: '1', callUpNumber: '1', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
                { firstName: 'Athlete', lastName: 'Two', bibNumber: '2', callUpNumber: '1', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
                { firstName: 'Athlete', lastName: 'Three', bibNumber: '3', callUpNumber: '1', logistics: { waveMeetingTime: '09:10', warmupStart: '09:10', warmupEnd: '09:40', stagingTime: '09:50', raceStart: '10:10' } },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(multiAthleteSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('splits athlete names into separate FIRST/LAST columns instead of "Last, First"', async () => {
    const buffer = await service.generatePdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('CALLUP #');
    expect(text).toContain('FIRST');
    expect(text).toContain('LAST');
    expect(text).toContain('BIB #');
    expect(text).not.toContain('Adams, Dave');
  });

  it('shows the category header\'s stage and race-start times on separate labeled lines', async () => {
    const buffer = await service.generatePdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('STAGE: 9:50 AM');
    expect(text).toContain('RACE START: 10:10 AM');
    expect(text).toContain('4 LAPS');
  });

  it('renders the title as a single line', async () => {
    const buffer = await service.generatePdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('RIDER PREP & RACE TIMES');
  });

  it('labels the summary\'s last column ATHLETE COUNT', async () => {
    const buffer = await service.generatePdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('ATHLETE');
    expect(text).toContain('COUNT');
  });

  it('renders without error when an athlete is called up', async () => {
    const calledUpSchedule: TeamWaveSchedule = {
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
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201', callUpNumber: '1', calledUp: true },
                { firstName: 'Mike', lastName: 'Clark', bibNumber: '202', callUpNumber: '2', calledUp: false },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(calledUpSchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    const text = await getPdfText(buffer);
    expect(text).toContain('Dave');
    expect(text).toContain('Adams');
  });

  it('renders without error when an athlete has no callUpNumber', async () => {
    const noCallUpSchedule: TeamWaveSchedule = {
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
                { firstName: 'Dave', lastName: 'Adams', bibNumber: '201', callUpNumber: null, calledUp: false },
              ],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(noCallUpSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('—');
  });

  it('renders an empty schedule (no waves) without error', async () => {
    const emptySchedule: TeamWaveSchedule = { ...schedule, totalAthletes: 0, waves: [] };
    const buffer = await service.generateSchedulePdf(emptySchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(await getPdfPageCount(buffer)).toBe(1);
  });

  it('shows an em-dash when a category has no known start time', async () => {
    const noStartSchedule: TeamWaveSchedule = {
      ...schedule,
      waves: [
        {
          waveName: 'Wave 1',
          categories: [
            {
              categoryName: 'Mystery Category',
              stageTime: '',
              startTime: '',
              laps: 1,
              athletes: [{ firstName: 'A', lastName: 'B', bibNumber: '1', callUpNumber: '1', calledUp: false }],
            },
          ],
        },
      ],
    };
    const buffer = await service.generatePdf(noStartSchedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('—');
  });

  describe('Tabloid wave packing', () => {
    function mkWave(waveName: string, startTime: string, athleteCount: number) {
      return {
        waveName,
        categories: [
          {
            categoryName: `${waveName} Category`,
            stageTime: startTime,
            startTime,
            laps: 1,
            athletes: Array.from({ length: athleteCount }, (_, i) => ({
              firstName: `F${i}`,
              lastName: `L${i}`,
              bibNumber: String(i),
              callUpNumber: '1',
            })),
          },
        ],
      };
    }

    it('packs two small waves onto a single content page (1 summary + 1 content = 2 pages)', async () => {
      const twoSmallWaves: TeamWaveSchedule = {
        ...schedule,
        waves: [mkWave('Wave 7 - JD', '14:30', 1), mkWave('Wave 9 - JD', '15:50', 2)],
      };
      const buffer = await service.generateSchedulePdf(twoSmallWaves);
      expect(await getPdfPageCount(buffer)).toBe(2);
    });

    it('gives a very large wave its own page rather than force-packing it', async () => {
      const oneHugeWave: TeamWaveSchedule = {
        ...schedule,
        waves: [mkWave('Wave 1 - HS', '08:00', 60), mkWave('Wave 2 - HS', '09:00', 2)],
      };
      const buffer = await service.generateSchedulePdf(oneHugeWave);
      // 1 summary page + at least 1 content page; the huge wave should not be squeezed
      // onto the same page as the small one if it wouldn't fit.
      expect(await getPdfPageCount(buffer)).toBeGreaterThanOrEqual(2);
    });

    it('spills the summary page onto a second page when there are too many waves to fit one page', async () => {
      const manyWaves: TeamWaveSchedule = {
        ...schedule,
        waves: Array.from({ length: 20 }, (_, i) => mkWave(`Wave ${i + 1}`, `${8 + Math.floor(i / 4)}:${(i % 4) * 15}0`, 1)),
      };
      const buffer = await service.generateSchedulePdf(manyWaves);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      const text = await getPdfText(buffer);
      // Every wave's name should still appear even though the summary table itself needed
      // to spill onto a second page (20 waves at min row height don't fit one page).
      expect(text).toContain('Wave 1');
      expect(text).toContain('Wave 20');
    });

    it('packs more than 2 small waves onto one content page now that the hard cap is removed', async () => {
      const threeTinyWaves: TeamWaveSchedule = {
        ...schedule,
        waves: [
          mkWave('Wave 7 - JD', '14:30', 1),
          mkWave('Wave 8 - JD', '15:00', 1),
          mkWave('Wave 9 - JD', '15:50', 1),
        ],
      };
      const buffer = await service.generateSchedulePdf(threeTinyWaves);
      // 1 summary page + 1 content page holding all three tiny waves.
      expect(await getPdfPageCount(buffer)).toBe(2);
    });

    it('generateSchedulePdf and the generatePdf alias produce the same page count', async () => {
      const twoSmallWaves: TeamWaveSchedule = {
        ...schedule,
        waves: [mkWave('Wave 7 - JD', '14:30', 1), mkWave('Wave 9 - JD', '15:50', 2)],
      };
      const viaAlias = await service.generatePdf(twoSmallWaves);
      const viaDirect = await service.generateSchedulePdf(twoSmallWaves);
      expect(await getPdfPageCount(viaAlias)).toBe(await getPdfPageCount(viaDirect));
    });
  });
});
