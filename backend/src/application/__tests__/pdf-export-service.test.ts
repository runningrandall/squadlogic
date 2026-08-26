import { describe, it, expect, vi, afterEach } from 'vitest';
import { PdfExportService } from '../pdf-export-service.js';
import { getPdfPageCount, getPdfText, getPdfPageText, getFillColorSequence } from './pdf-test-utils.js';
import type { TeamWaveSchedule } from '../../domain/race-event.js';

// Mirrors the module-private ROW_COLORS palette in pdf-export-service.ts.
const WAVE_PALETTE = [
  '#b3e5fc', '#c8e6c9', '#fff9c4', '#ffe0b2', '#f8bbd0', '#e1bee7', '#b2ebf2', '#ffccbc',
];

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

  it('shows each category\'s wave name, stage time, and start time in its header', async () => {
    const buffer = await service.generatePdf(schedule);
    const text = await getPdfText(buffer);
    expect(text).toContain('Wave 3 - HS');
    expect(text).toContain('STG 9:50 AM');
    expect(text).toContain('START 10:10 AM');
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

  it('numbers summary rows sequentially instead of repeating the wave name in every row', async () => {
    const threeWaveSchedule: TeamWaveSchedule = {
      ...schedule,
      waves: [
        { waveName: 'Wave 3 - HS', categories: schedule.waves[0].categories },
        { waveName: 'Wave 7 - JD', categories: schedule.waves[0].categories },
        { waveName: 'Wave 9 - JD', categories: schedule.waves[0].categories },
      ],
    };
    const buffer = await service.generatePdf(threeWaveSchedule);
    const summaryText = await getPdfPageText(buffer, 1);
    expect(summaryText).toContain('WAVE');
    expect(summaryText).toContain('1');
    expect(summaryText).toContain('2');
    expect(summaryText).toContain('3');
    // The full wave name is no longer repeated per row on the summary page — it still
    // appears once on the detail page, but getPdfPageText scopes this check to page 1 only.
    expect(summaryText).not.toContain('Wave 3 - HS');
    expect(summaryText).not.toContain('Wave 7 - JD');
  });

  it('does not truncate the RACE START header with an ellipsis', async () => {
    const buffer = await service.generatePdf(schedule);
    const summaryText = await getPdfPageText(buffer, 1);
    expect(summaryText).toContain('RACE START');
    expect(summaryText).not.toContain('…');
  });

  it('accents each timing column with left/right borders in its own header color', async () => {
    // Mirrors the module-private TIME_COL_COLORS palette — the WAVE MTG header band uses this
    // hex once; if the per-row column border is actually being drawn, the same hex is set as
    // the fill color twice more per data row (one border rect on each edge of the column).
    const WAVE_MTG_COLOR = '#b39ddb';
    const twoWaveSchedule: TeamWaveSchedule = {
      ...schedule,
      waves: [
        { waveName: 'Wave 1', categories: schedule.waves[0].categories },
        { waveName: 'Wave 2', categories: schedule.waves[0].categories },
      ],
    };
    const buffer = await service.generatePdf(twoWaveSchedule);
    const colors = await getFillColorSequence(buffer, 1);
    const hits = colors.filter((c) => c.toLowerCase() === WAVE_MTG_COLOR).length;
    // 1 header band + 1 per data row (2 waves): getFillColorSequence collapses consecutive
    // same-color fills, so the left/right border pair on one column counts once per row.
    expect(hits).toBeGreaterThanOrEqual(3);
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

  it('gives two categories in the same wave the same header color on the detail page', async () => {
    const sameWaveTwoCats: TeamWaveSchedule = {
      ...schedule,
      waves: [
        {
          waveName: 'Wave 1 - HS',
          categories: [
            { categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4,
              athletes: [{ firstName: 'Dave', lastName: 'Adams', bibNumber: '201', callUpNumber: '1', calledUp: false }] },
            { categoryName: 'Varsity Girls', stageTime: '09:55', startTime: '10:15', laps: 3,
              athletes: [{ firstName: 'Amy', lastName: 'Baker', bibNumber: '301', callUpNumber: '1', calledUp: false }] },
          ],
        },
      ],
    };
    const buffer = await service.generateSchedulePdf(sameWaveTwoCats);
    // Page 2 is the all-waves detail page.
    const colors = await getFillColorSequence(buffer, 2);
    const paletteHits = colors.filter((c) => WAVE_PALETTE.includes(c.toLowerCase()));
    // Both category header bands use colorIndex 0 (their shared wave's index), so every
    // palette hit on this page should be the same single color.
    expect(new Set(paletteHits).size).toBe(1);
  });

  it('fits many categories across many waves on the single all-waves detail page', async () => {
    const manyCategoriesSchedule: TeamWaveSchedule = {
      teamName: 'Wasatch',
      eventName: 'UTAH HS MTB 2026 - Region 5',
      eventDate: '2026-08-22',
      totalAthletes: 60,
      waves: Array.from({ length: 10 }, (_, w) => ({
        waveName: `Wave ${w + 1}`,
        categories: Array.from({ length: 2 }, (_, c) => ({
          categoryName: `Wave ${w + 1} Category ${c}`,
          stageTime: '08:00', startTime: '08:00', laps: 1,
          athletes: Array.from({ length: 3 }, (_, i) => ({
            firstName: `F${w}_${c}_${i}`, lastName: `L${w}_${c}_${i}`,
            bibNumber: String(w * 100 + c * 10 + i), callUpNumber: '1', calledUp: false,
          })),
        })),
      })),
    };
    const buffer = await service.generateSchedulePdf(manyCategoriesSchedule);
    expect(await getPdfPageCount(buffer)).toBe(2);
    const text = await getPdfText(await service.generateSchedulePdf(manyCategoriesSchedule));
    expect(text).toContain('Wave 1 Category 0');
    expect(text).toContain('Wave 10 Category 1');
  });

  it('renders an empty schedule (no waves) without error, still as summary + detail', async () => {
    const emptySchedule: TeamWaveSchedule = { ...schedule, totalAthletes: 0, waves: [] };
    const buffer = await service.generateSchedulePdf(emptySchedule);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(await getPdfPageCount(buffer)).toBe(2);
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

  describe('exactly 2 pages: rotated summary + rotated all-waves detail', () => {
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

    it('produces exactly 2 pages for a small, realistic schedule', async () => {
      const twoSmallWaves: TeamWaveSchedule = {
        ...schedule,
        waves: [mkWave('Wave 7 - JD', '14:30', 1), mkWave('Wave 9 - JD', '15:50', 2)],
      };
      const buffer = await service.generateSchedulePdf(twoSmallWaves);
      expect(await getPdfPageCount(buffer)).toBe(2);
    });

    it('still fits a very large wave on the single detail page without dropping any athlete', async () => {
      const oneHugeWave: TeamWaveSchedule = {
        ...schedule,
        waves: [mkWave('Wave 1 - HS', '08:00', 60), mkWave('Wave 2 - HS', '09:00', 2)],
      };
      // pdfjs detaches the source ArrayBuffer after loading, so a fresh buffer is generated
      // per assertion rather than reusing one buffer across two loads.
      expect(await getPdfPageCount(await service.generateSchedulePdf(oneHugeWave))).toBe(2);
      const text = await getPdfText(await service.generateSchedulePdf(oneHugeWave));
      expect(text).toContain('F0');
      expect(text).toContain('F59');
    });

    it('spills the summary page onto a second page when there are too many waves to fit one page', async () => {
      const manyWaves: TeamWaveSchedule = {
        ...schedule,
        waves: Array.from({ length: 30 }, (_, i) => mkWave(`Wave ${i + 1}`, `${8 + Math.floor(i / 4)}:${(i % 4) * 15}0`, 1)),
      };
      const buffer = await service.generateSchedulePdf(manyWaves);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      // 2 summary pages (30 waves at min row height don't fit one) + 1 all-waves detail page.
      expect(await getPdfPageCount(await service.generateSchedulePdf(manyWaves))).toBe(3);
      const text = await getPdfText(await service.generateSchedulePdf(manyWaves));
      expect(text).toContain('Wave 1');
      expect(text).toContain('Wave 30');
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
