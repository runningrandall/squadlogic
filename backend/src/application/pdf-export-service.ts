import type { TeamWaveSchedule, WaveGroup, WaveScheduleEntry } from '../domain/race-event.js';
import { formatTime12Hour } from '../lib/time-format.js';
import { stripCategorySplitSuffix } from '../lib/category-split.js';

export interface PdfBranding {
  teamDisplayName: string;
  primaryColor: string;
  tertiaryColor: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: PdfBranding = {
  teamDisplayName: '',
  primaryColor: '#1A237E',
  tertiaryColor: '#E8EAF6',
  logoUrl: null,
};

// Distinct pastel row colors cycling per wave on the summary page
const ROW_COLORS = [
  '#B3E5FC', '#C8E6C9', '#FFF9C4', '#FFE0B2',
  '#F8BBD0', '#E1BEE7', '#B2EBF2', '#FFCCBC',
];

// Column header accent colors for the summary timing columns
const TIME_COL_COLORS = {
  waveMtg: '#B39DDB',
  warmUp:  '#EF9A9A',
  stage:   '#FFCC80',
  race:    '#A5D6A7',
  athletes:'#B0BEC5',
};

// A called-up athlete's row always gets this exact color — consistent regardless of
// striping/category so it reads as one unambiguous signal wherever it appears.
const CALLED_UP_ROW_COLOR = '#FFEB3B';

// Blends a hex color toward white by `amount` (0 = unchanged, 1 = white) — used for subtle,
// category-tinted row backgrounds that stay readable instead of a plain gray/white stripe.
function tint(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function formatLaps(laps: number | null): string {
  return laps == null ? '—' : `${laps} LAP${laps === 1 ? '' : 'S'}`;
}

// "2026-10-23" → "FRI OCT 23" for multi-day race-day band labels. Parsed as UTC so the
// weekday never shifts with the server's local timezone.
function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).replace(',', '').toUpperCase();
}

// A multi-day race (e.g. State) prints its full date range in the page header instead of just day 1.
function formatEventDates(schedule: TeamWaveSchedule): string {
  const dates = schedule.eventDates ?? [];
  return dates.length > 1 ? `${dates[0]} – ${dates[dates.length - 1]}` : schedule.eventDate;
}

// Page geometry — multiple exports use different physical page sizes, so this is
// threaded through render methods rather than hardcoded as module constants.
interface PageMetrics {
  L: number;       // left margin
  PW: number;      // page width
  PH: number;      // page height
  CW: number;      // content width (PW - L*2)
  HEADER_H: number; // compact page header height
}

const TABLOID_LANDSCAPE: PageMetrics = { L: 36, PW: 1224, PH: 792, CW: 1152, HEADER_H: 52 };

// The summary page is drawn on a "rotated" logical canvas — see generateSchedulePdf — so its
// table gets the full 1224pt long edge as its vertical (row) axis instead of the 792pt short
// edge, letting far more waves fit before a second page is needed. PW/PH here describe that
// logical canvas (tall, not the physical sheet, which stays an ordinary Tabloid landscape page).
const SUMMARY_PM: PageMetrics = { L: 36, PW: 792, PH: 1224, CW: 720, HEADER_H: 52 };

interface RosterRow {
  name: string;
  firstName: string;
  lastName: string;
  callUpNumber: string;
  calledUp: boolean;
  waveMeetingTime: string;
  stagingTime: string;
  raceStart: string;
}

// One category's header band + its (already first-name-sorted) athlete rows — the atomic
// unit that gets flowed down N side-by-side roster columns without ever being split.
interface RosterCategoryBlock {
  categoryName: string;
  waveName: string;
  colorIndex: number;
  laps: number | null;
  rows: RosterRow[];
}

interface PocketAthlete {
  name: string; // "First Last"
  bibNumber: string;
  callUpNumber: string;
}

interface PocketCategoryGroup {
  categoryName: string;
  stageTime: string;
  startTime: string;
  laps: number | null;
  colorIndex: number;
  athletes: PocketAthlete[]; // pre-sorted alphabetically by first name
}

interface PocketWaveGroup {
  waveName: string;
  day: number | null;
  categories: PocketCategoryGroup[];
}

// Pocket printout panel geometry: a Letter sheet folded in half twice (quarter-fold)
// unfolds into a 2x2 grid of these panels — final folded size ~4.25"x5.5". Each panel
// holds as many whole waves as fit stacked top to bottom, each laid out as 2 side-by-side
// category columns — no per-row wave/category column needed since each wave's title bar
// names it and each category has its own mini-header.
const PANEL_W = 306;
const PANEL_H = 396;
const PANELS_PER_SHEET = 4; // per side; 8 total per physical (double-sided) sheet
const POCKET_TITLE_H = 24;
const POCKET_TITLE_GAP = 6;
const POCKET_COLS = 2;
const POCKET_COL_GAP = 10;
const POCKET_CAT_HDR_H = 28;
const POCKET_CAT_GAP = 6;
const POCKET_COLHDR_H = 10;
const POCKET_ATHLETE_ROW_H = 12;
const POCKET_MIN_ATHLETE_ROW_H = 8;
const POCKET_BOTTOM_PAD = 8;
const POCKET_WAVE_GAP = 8; // space between two waves stacked in the same panel

export class PdfExportService {
  // ─── Wave-detail schedule export (Tabloid, up to 2 waves per page) ────────
  async generatePdf(
    schedule: TeamWaveSchedule,
    branding?: Partial<PdfBranding>,
    eventLocation?: string,
  ): Promise<Buffer> {
    return this.generateSchedulePdf(schedule, branding, eventLocation);
  }

  async generateSchedulePdf(
    schedule: TeamWaveSchedule,
    branding?: Partial<PdfBranding>,
    eventLocation?: string,
  ): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const brand = { ...DEFAULT_BRANDING, ...branding };
    const logoBuffer = await this.fetchLogoBuffer(brand.logoUrl);

    // Sort categories within each wave by start time (earliest first) for consistent print order.
    const sorted: TeamWaveSchedule = {
      ...schedule,
      waves: schedule.waves.map((wave) => ({
        ...wave,
        categories: [...wave.categories].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    };

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'TABLOID', layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Both pages are rendered on a "rotated" logical canvas (see SUMMARY_PM above) so each
      // gets the full 1224pt Tabloid edge as its vertical axis instead of the 792pt edge. The
      // printed sheet shows the table sideways; turn the printed page so its long edge is on
      // top to read it normally. Physically, both pages stay ordinary Tabloid landscape sheets.

      // Page 1: summary
      doc.transform(0, 1, -1, 0, TABLOID_LANDSCAPE.PW, 0);
      this.renderPageHeader(SUMMARY_PM, doc, sorted, brand, logoBuffer, eventLocation);
      this.renderSummary(SUMMARY_PM, doc, sorted, brand, logoBuffer, eventLocation);

      // Page 2: every wave's categories and full rosters, packed into balanced columns —
      // the whole schedule is exactly these two pages, no per-wave pagination.
      doc.addPage();
      doc.transform(0, 1, -1, 0, TABLOID_LANDSCAPE.PW, 0);
      this.renderPageHeader(SUMMARY_PM, doc, sorted, brand, logoBuffer, eventLocation);
      this.renderAllWavesDetail(SUMMARY_PM, doc, sorted);

      doc.end();
    });
  }

  // ─── Check-in roster export (Tabloid, forced onto one page) ───────────────
  async generateRosterPdf(
    schedule: TeamWaveSchedule,
    branding?: Partial<PdfBranding>,
    eventLocation?: string,
  ): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const brand = { ...DEFAULT_BRANDING, ...branding };
    const logoBuffer = await this.fetchLogoBuffer(brand.logoUrl);
    const pm = TABLOID_LANDSCAPE;

    // Grouped by category (preserving the wave/category traversal order from the schedule),
    // athletes sorted by first name within each category — the category header band carries
    // the category name and its wave, so no per-row category column is needed. Colored per
    // wave (not per category) so one wave's splits read as a group, matching the detail page.
    const blocks: RosterCategoryBlock[] = schedule.waves.flatMap((wave, waveIndex) =>
      wave.categories.map((cat) => ({
        categoryName: cat.categoryName,
        waveName: wave.waveName,
        colorIndex: waveIndex,
        laps: cat.laps,
        rows: [...cat.athletes]
          .sort((x, y) => x.firstName.localeCompare(y.firstName) || x.lastName.localeCompare(y.lastName))
          .map((a) => ({
            name: `${a.firstName} ${a.lastName}`,
            firstName: a.firstName,
            lastName: a.lastName,
            callUpNumber: a.callUpNumber ?? '',
            calledUp: a.calledUp,
            waveMeetingTime: a.logistics?.waveMeetingTime ?? '',
            stagingTime: a.logistics?.stagingTime ?? '',
            raceStart: a.logistics?.raceStart ?? '',
          })),
      })),
    );
    const totalRows = blocks.reduce((s, b) => s + b.rows.length, 0);

    // A category's splits ("<Category> Split N") often sit in different waves, so they'd be
    // packed as unrelated blocks and could land in different columns. Bundle every split of a
    // category (per race day) into one unit, placed where its first split appears, so the whole
    // category always stays together in one column.
    const unitKeys = schedule.waves.flatMap((wave) =>
      wave.categories.map((cat) => `${wave.date ?? ''}|${stripCategorySplitSuffix(cat.categoryName)}`),
    );
    const unitsByKey = new Map<string, RosterCategoryBlock[]>();
    blocks.forEach((block, i) => {
      if (!unitsByKey.has(unitKeys[i])) unitsByKey.set(unitKeys[i], []);
      unitsByKey.get(unitKeys[i])!.push(block);
    });
    const units = [...unitsByKey.values()];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'TABLOID', layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderPageHeader(pm, doc, schedule, brand, logoBuffer, eventLocation);
      this.renderRosterTable(pm, doc, units, totalRows, brand);

      doc.end();
    });
  }

  // ─── Pocket printout export (Letter, quarter-fold, double-sided) ──────────
  async generatePocketPdf(
    schedule: TeamWaveSchedule,
    branding?: Partial<PdfBranding>,
  ): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const brand = { ...DEFAULT_BRANDING, ...branding };

    // Whole waves are packed into panels in race order, as many per panel as fit at full row
    // height, so panels use their vertical space instead of leaving a small wave alone on half
    // an empty panel. A wave is never split across panels; one too tall for a panel on its own
    // gets a panel to itself and shrinks its rows to fit. A multi-day race (e.g. State) starts
    // each day on its own physical sheet, so riders carry just that day's card.
    const waveGroups = this.buildPocketWaveGroups(schedule);
    const multiDay = waveGroups.some((w) => w.day != null);
    const dayGroups: PocketWaveGroup[][] = [];
    for (const wave of waveGroups) {
      const last = dayGroups[dayGroups.length - 1];
      if (last && (!multiDay || last[0].day === wave.day)) last.push(wave);
      else dayGroups.push([wave]);
    }

    const panelsPerSheet = PANELS_PER_SHEET * 2;
    const panels: (PocketWaveGroup[] | null)[] = [];
    for (const group of dayGroups) {
      panels.push(...this.packPocketPanels(group));
      while (panels.length % panelsPerSheet !== 0) panels.push(null);
    }
    if (panels.length === 0) panels.push(null);
    const sheets = Math.max(1, Math.ceil(panels.length / panelsPerSheet));
    while (panels.length < sheets * panelsPerSheet) panels.push(null);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let panelIdx = 0;
      for (let s = 0; s < sheets; s++) {
        if (s > 0) doc.addPage();
        this.renderPocketPage(doc, panels.slice(panelIdx, panelIdx + PANELS_PER_SHEET), brand);
        panelIdx += PANELS_PER_SHEET;
        doc.addPage();
        this.renderPocketPage(doc, panels.slice(panelIdx, panelIdx + PANELS_PER_SHEET), brand);
        panelIdx += PANELS_PER_SHEET;
      }

      doc.end();
    });
  }

  generateFilename(
    teamName: string,
    eventDate: string,
    variant: 'schedule' | 'roster' | 'pocket' = 'schedule',
  ): string {
    const sanitized = teamName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    return `${sanitized}_${eventDate}_${variant}.pdf`;
  }

  // ─── Compact page header (repeats on every page) ──────────────────────────
  private renderPageHeader(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    schedule: TeamWaveSchedule,
    brand: PdfBranding,
    logoBuffer: Buffer | null,
    eventLocation?: string,
  ): void {
    doc.rect(0, 0, pm.PW, pm.HEADER_H).fill(brand.primaryColor);

    const logoW = 46;
    const logoGap = logoBuffer ? logoW + 8 : 0;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pm.L, 7, { height: 38, fit: [logoW, 38] });
      /* v8 ignore next */
      } catch { /* skip if image format unsupported */ }
    }

    const displayName = brand.teamDisplayName || schedule.teamName;
    const textX = pm.L + logoGap;
    const textW = pm.CW - logoGap;

    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold');
    this.oneLine(doc, displayName, textX, 10, textW);

    doc.fontSize(8).font('Helvetica');
    const subtitle = [schedule.eventName, formatEventDates(schedule), eventLocation]
      .filter(Boolean).join('  •  ');
    this.oneLine(doc, subtitle, textX, 34, textW);

    doc.y = pm.HEADER_H + 10;
  }

  // ─── Summary page ─────────────────────────────────────────────────────────
  private renderSummary(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    schedule: TeamWaveSchedule,
    brand: PdfBranding,
    logoBuffer: Buffer | null,
    eventLocation?: string,
  ): void {
    // Large title — one line (plenty of width on a Tabloid landscape page), vertically
    // centered in the gap between the page header banner and the table below it rather than
    // sitting flush against the banner. Explicit height avoids pdfkit's own auto-pagination
    // check, which compares the raw y position against the *physical* page height and would
    // otherwise add a spurious page — every text call below follows the same rule since this
    // page's logical canvas is taller than the physical sheet (see SUMMARY_PM).
    const TITLE_GAP = 64;
    const TITLE_H = 34;
    const titleTop = doc.y;
    doc.fillColor('#000000').fontSize(28).font('Helvetica-Bold');
    doc.text(
      'RIDER PREP & RACE TIMES', pm.L, titleTop + (TITLE_GAP - TITLE_H) / 2,
      { width: pm.CW, height: TITLE_H, align: 'center', lineBreak: false },
    );
    doc.y = titleTop + TITLE_GAP;

    // Column layout: Wave | Category | WaveMtg | WarmUp | Stage | RaceStart | Athlete Count.
    // Fixed columns take up their share; Category takes whatever content width remains. The
    // wave column only ever holds a short sequence number ("1", "2", ...) instead of the full
    // wave name (which already repeats on the detail page), so it needs little width — that
    // width is instead given to RACE START, whose "RACE START" header label is the widest of
    // the bunch and was clipping with an ellipsis at the old column width.
    const WAVE_COL_PAD = 16;
    const BORDER_W = 3;
    // A small gap between adjacent timing columns (WAVE MTG/WARM UP/STAGE/RACE START/ATHLETE
    // COUNT) so their accent-colored borders don't butt directly against their neighbor's —
    // the intervening sliver just shows the row's own base color through, same as everywhere
    // else in the row. Reserved out of the category column's share so the table's total width
    // still adds up to exactly pm.CW regardless of how many timing columns there are.
    const COL_GAP = 4;
    const fixedCols = [60, 92, 84, 82, 110, 78];
    const hdrs = ['WAVE', 'CATEGORY', 'WAVE MTG', 'WARM UP', 'STAGE', 'RACE START', 'ATHLETE COUNT'];
    const hdrColors = [
      '#000000', '#000000',
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.stage,   TIME_COL_COLORS.race,
      TIME_COL_COLORS.athletes,
    ];
    const gapCount = fixedCols.length - 2; // one gap between each pair of timing columns
    const categoryColW = pm.CW - fixedCols.reduce((s, w) => s + w, 0) - gapCount * COL_GAP;
    const cols = [fixedCols[0], categoryColW, ...fixedCols.slice(1)];
    const colX: number[] = [];
    {
      let hx = pm.L;
      for (let i = 0; i < cols.length; i++) {
        if (i >= 3) hx += COL_GAP;
        colX.push(hx);
        hx += cols[i];
      }
    }
    const tableW = colX[colX.length - 1] + cols[cols.length - 1] - pm.L;
    const HDR_H = 36;
    const HDR_FONT_SIZE = 15;
    const footerY = pm.PH - 30;

    const drawColumnHeaderRow = (): void => {
      const thY = doc.y;
      for (let i = 0; i < hdrs.length; i++) {
        doc.rect(colX[i], thY, cols[i], HDR_H).fill(hdrColors[i]);
        const txtColor = i < 2 ? '#FFFFFF' : '#000000';
        const centered = i >= 2;
        doc.fillColor(txtColor).font('Helvetica-Bold');
        if (hdrs[i] === 'ATHLETE COUNT') {
          // Two lines so the longer label still fits a column sized like its neighbors.
          doc.fontSize(HDR_FONT_SIZE - 1);
          this.oneLine(doc, 'ATHLETE', colX[i] + 4, thY + 6, cols[i] - 8, 'center');
          this.oneLine(doc, 'COUNT', colX[i] + 4, thY + 19, cols[i] - 8, 'center');
        } else {
          doc.fontSize(HDR_FONT_SIZE);
          this.oneLine(
            doc, hdrs[i], colX[i] + 4, thY + (HDR_H - HDR_FONT_SIZE) / 2,
            cols[i] - 8, centered ? 'center' : 'left',
          );
        }
      }
      doc.y = thY + HDR_H;
    };

    drawColumnHeaderRow();

    // Data rows — height grows to fit however many lines the category list wraps to. When
    // the whole table fits on this page, rows also stretch to fill the remaining space so the
    // table fills the page like the reference layout. When it doesn't fit at full size, the
    // font/padding steps down (to a readable floor) until it does — a 12-wave, two-day State
    // schedule should still be one page — and only past that floor does the table spill onto
    // additional pages instead of silently overflowing past the page boundary.
    // A multi-day race also gets a full-width band row ahead of each day's waves, since wave
    // numbers restart every day.
    const multiDay = schedule.waves.some((w) => w.day != null);
    type SummaryItem = { kind: 'day'; day: number; date: string } | { kind: 'wave'; wave: WaveGroup };
    const items: SummaryItem[] = [];
    for (const wave of schedule.waves) {
      const prev = items.length > 0 ? items[items.length - 1] : null;
      const prevDay = prev?.kind === 'wave' ? prev.wave.day : prev?.kind === 'day' ? prev.day : null;
      if (multiDay && wave.day != null && wave.day !== prevDay) {
        items.push({ kind: 'day', day: wave.day, date: wave.date });
      }
      items.push({ kind: 'wave', wave });
    }

    const singlePageAvail = Math.max(0, footerY - doc.y);
    const sizing = (scale: number) => ({
      fontSize: Math.round(16 * scale),
      rowVPad: Math.round(20 * scale),
      rowMinH: Math.round(50 * scale),
      dayBandH: Math.round(30 * scale),
    });
    const contentRowHAt = (wave: WaveGroup, sz: ReturnType<typeof sizing>): number => {
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      doc.font('Helvetica-Bold').fontSize(sz.fontSize);
      const categoryH = doc.heightOfString(categoryList, { width: cols[1] - 8 });
      return Math.max(sz.rowMinH, categoryH + sz.rowVPad);
    };
    const totalHAt = (sz: ReturnType<typeof sizing>): number =>
      items.reduce((sum, it) => sum + (it.kind === 'day' ? sz.dayBandH : contentRowHAt(it.wave, sz)), 0);

    const MIN_SCALE = 0.6;
    let scale = 1;
    while (scale > MIN_SCALE && totalHAt(sizing(scale)) > singlePageAvail) {
      scale = Math.round((scale - 0.05) * 100) / 100;
    }
    const sz = sizing(scale);
    const CAT_FONT_SIZE = sz.fontSize;
    const contentRowH = (wave: WaveGroup): number => contentRowHAt(wave, sz);

    // Leftover page height is shared out evenly as extra height on top of each row's own content
    // height (rather than forcing every row to one even share, which overflows the page as soon as
    // one wave's category list wraps taller than that share). Floored: an exact split lands the
    // last row's bottom edge precisely on footerY, and floating-point rounding can occasionally
    // push it a hair over, triggering an unwanted page break for the last wave.
    const waveCount = schedule.waves.length;
    const slack = singlePageAvail - totalHAt(sz);
    const rowStretch = slack > 0 && waveCount > 0 ? Math.floor(slack / waveCount) : 0;

    const itemH = (it: SummaryItem): number => (it.kind === 'day' ? sz.dayBandH : contentRowH(it.wave));
    const newPage = (): void => {
      doc.addPage();
      doc.transform(0, 1, -1, 0, TABLOID_LANDSCAPE.PW, 0);
      this.renderPageHeader(pm, doc, schedule, brand, logoBuffer, eventLocation);
      drawColumnHeaderRow();
    };

    const sepX = pm.L + cols[0] + cols[1];
    let colorIdx = 0;
    for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
      const item = items[itemIdx];

      if (item.kind === 'day') {
        // Keep a day band with at least its first wave row — never strand it at a page bottom.
        const next = items[itemIdx + 1];
        if (doc.y + sz.dayBandH + (next ? itemH(next) : 0) > footerY) newPage();
        const bandY = doc.y;
        doc.rect(pm.L, bandY, tableW, sz.dayBandH).fill(brand.primaryColor);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(sz.fontSize);
        const label = [`DAY ${item.day}`, formatDayLabel(item.date)].filter(Boolean).join('  ·  ');
        this.oneLine(doc, label, pm.L + WAVE_COL_PAD, bandY + (sz.dayBandH - sz.fontSize) / 2, tableW - WAVE_COL_PAD * 2);
        doc.y = bandY + sz.dayBandH;
        continue;
      }

      const wave = item.wave;
      const firstCat = wave.categories[0];
      const logistics = firstCat?.athletes[0]?.logistics;
      // A split may borrow an earlier split's (earlier) wave meeting, so the wave's own meeting
      // is the latest one among its categories rather than whatever the first category shows.
      const waveMeetingTime = wave.categories
        .map((c) => c.athletes[0]?.logistics?.waveMeetingTime ?? '')
        .reduce((latest, t) => (t > latest ? t : latest), '');
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      const athleteCount = wave.categories.reduce((s, c) => s + c.athletes.length, 0);

      doc.font('Helvetica-Bold').fontSize(CAT_FONT_SIZE);
      const categoryH = doc.heightOfString(categoryList, { width: cols[1] - 8 });
      const ROW_H = Math.max(sz.rowMinH, categoryH + sz.rowVPad) + rowStretch;

      if (doc.y + ROW_H > footerY) newPage();

      const rowY = doc.y;
      const rowColor = ROW_COLORS[colorIdx % ROW_COLORS.length];
      colorIdx++;

      doc.rect(pm.L, rowY, tableW, ROW_H).fill(rowColor);

      // Column accent borders: each timing column (everything right of CATEGORY) gets a solid
      // bar of its own header color along its left and right edges, so the row's base color
      // stays clean and legible while each column still visibly ties back to its header. The
      // last row before a page break or a day band (found by checking whether the next item
      // exists, is a wave, and would still fit on this page, not a hardcoded row count) also
      // gets a matching bottom bar so the accent box actually closes instead of trailing off.
      const next = items[itemIdx + 1];
      const isLastRowInBlock = !next || next.kind === 'day' || (rowY + ROW_H + contentRowH(next.wave) + rowStretch > footerY);
      for (let i = 2; i < cols.length; i++) {
        doc.rect(colX[i], rowY, BORDER_W, ROW_H).fill(hdrColors[i]);
        doc.rect(colX[i] + cols[i] - BORDER_W, rowY, BORDER_W, ROW_H).fill(hdrColors[i]);
        if (isLastRowInBlock) {
          doc.rect(colX[i], rowY + ROW_H - BORDER_W, cols[i], BORDER_W).fill(hdrColors[i]);
        }
      }
      doc.fillColor('#000000');

      // WAVE shows the official wave number (it can skip numbers when this team has no riders
      // in an official wave); an unscheduled category's standalone wave shows a dash. A schedule
      // built before wave numbers existed (no waveNumber field at all) falls back to row order.
      const waveLabel = wave.waveNumber === undefined
        ? String(colorIdx)
        : wave.waveNumber === null ? '—' : String(wave.waveNumber);
      const rowVals = [
        waveLabel,
        categoryList,
        waveMeetingTime ? formatTime12Hour(waveMeetingTime) : '—',
        logistics?.warmupStart ? formatTime12Hour(logistics.warmupStart) : '—',
        firstCat?.athletes[0]?.logistics?.stagingTime
          ? formatTime12Hour(firstCat.athletes[0].logistics.stagingTime) : '—',
        firstCat?.startTime ? formatTime12Hour(firstCat.startTime) : '—',
        String(athleteCount),
      ];
      for (let i = 0; i < rowVals.length; i++) {
        const bold = i < 2;
        const centered = i >= 2;
        // Only the category column (i=1) may wrap (ROW_H above is sized to fit it);
        // every other column is forced to a single truncated line.
        const allowWrap = i === 1;
        const fontSize = sz.fontSize;
        const leftPad = i === 0 ? WAVE_COL_PAD : 4;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
        const ty = rowY + (allowWrap ? (ROW_H - categoryH) / 2 : (ROW_H - fontSize) / 2);
        if (allowWrap) {
          // allowWrap only applies to the category column (i===1), which centered (i>=2) never is.
          // Explicit height (already measured as categoryH above) avoids pdfkit's auto-pagination
          // check — see the note on the title above.
          doc.text(rowVals[i], colX[i] + 4, ty, { width: cols[i] - 8, height: categoryH, align: 'left' });
        } else {
          this.oneLine(doc, rowVals[i], colX[i] + leftPad, ty, cols[i] - leftPad - 4, centered ? 'center' : 'left');
        }
      }

      // Separator line between the identifying columns (Wave/Category) and the schedule-data
      // columns — drawn per row (rather than once for the whole table) so it stays correct
      // across a page break.
      doc.moveTo(sepX, rowY).lineTo(sepX, rowY + ROW_H).lineWidth(1).strokeColor('#BBBBBB').stroke();

      doc.y = rowY + ROW_H;
    }

    // Footer — bounded width/height for the same auto-pagination reason noted on the title.
    doc.fontSize(7).fillColor('#999999').font('Helvetica');
    doc.text(
      `Generated by Switchback  •  ${schedule.totalAthletes} athletes  •  ${schedule.waves.length} waves`,
      pm.L, pm.PH - 26, { width: pm.CW, height: 10, lineBreak: false },
    );
  }

  // ─── Combined single-page wave/category detail: every wave's categories and full
  // ─── rosters, packed into balanced columns on the same rotated canvas as the
  // ─── summary page — see generateSchedulePdf. Each category's header band uses its
  // ─── wave's color (matching that wave's row on the summary page) so a category can
  // ─── be traced back to its wave at a glance, without needing a separate wave banner.
  private renderAllWavesDetail(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    schedule: TeamWaveSchedule,
  ): void {
    interface DetailBlock {
      cat: WaveScheduleEntry;
      waveName: string;
      colorIndex: number;
    }
    const blocks: DetailBlock[] = schedule.waves.flatMap((wave, colorIndex) =>
      wave.categories.map((cat) => ({ cat, waveName: wave.waveName, colorIndex })),
    );

    const tableTop = doc.y;
    const availH = pm.PH - 20 - tableTop;
    if (blocks.length === 0) return;

    // Column count steps up (3 → 4) only when even the smallest row height can't fit every
    // category in fewer columns — e.g. a two-day State race with a dozen waves of splits.
    const COL_OPTIONS = [3, 4];
    const MIN_ROW_H = 8;
    const MAX_ROW_H = 15;
    const GAP = 16;
    const CAT_HDR_H = 26; // 2-line header: name + count, then wave name + times
    const COLHDR_H = 12;

    // Same contiguous-fill, shrink-until-it-fits strategy as the check-in roster: a column
    // closes only once it's actually full (not an even split), and row height only shrinks
    // as far as needed to keep every category within MAX_COLS columns — this is what makes
    // "fit everything on one page" an actual guarantee rather than a best-effort.
    const packColumns = (rowH: number): DetailBlock[][] => {
      const blockHeight = (b: DetailBlock) => CAT_HDR_H + COLHDR_H + b.cat.athletes.length * rowH;
      const cols: DetailBlock[][] = [];
      let currentCol: DetailBlock[] = [];
      let currentH = 0;
      for (const block of blocks) {
        const h = blockHeight(block);
        if (currentCol.length > 0 && currentH + h > availH) {
          cols.push(currentCol);
          currentCol = [];
          currentH = 0;
        }
        currentCol.push(block);
        currentH += h;
      }
      if (currentCol.length > 0) cols.push(currentCol);
      return cols;
    };

    const { rowH, columns } = this.fitColumns(packColumns, COL_OPTIONS, MIN_ROW_H, MAX_ROW_H);

    const fontSize = Math.max(6, Math.min(9, rowH - 2));
    const colCount = Math.max(1, columns.length);
    const colW = (pm.CW - (colCount - 1) * GAP) / colCount;

    // Sub-columns within each category block: CALLUP # and BIB # sized to their content
    // (short, numeric), FIRST/LAST split whatever width remains evenly.
    const PAD = 6;
    const SUB_GAP = 4;
    doc.font('Helvetica-Bold').fontSize(7);
    const callupW = Math.max(doc.widthOfString('CALLUP #'), doc.widthOfString('000')) + 6;
    const bibW = Math.max(doc.widthOfString('BIB #'), doc.widthOfString('00000')) + 6;
    const nameW = (colW - PAD * 2 - SUB_GAP * 3 - callupW - bibW) / 2;

    columns.forEach((colBlocks, c) => {
      const colX = pm.L + c * (colW + GAP);
      const callupX = colX + PAD;
      const firstX = callupX + callupW + SUB_GAP;
      const lastX = firstX + nameW + SUB_GAP;
      const bibX = lastX + nameW + SUB_GAP;
      let y = tableTop;

      for (const block of colBlocks) {
        const { cat, waveName, colorIndex } = block;
        const catColor = ROW_COLORS[colorIndex % ROW_COLORS.length];

        // Header band: category name + count, then wave name + stage/start times.
        doc.rect(colX, y, colW, CAT_HDR_H).fill(catColor);
        const NAME_FONT = 9;
        const SUB_FONT = 7;
        doc.fillColor('#000000').fontSize(NAME_FONT).font('Helvetica-Bold');
        this.oneLine(doc, `${cat.categoryName} (${cat.athletes.length})`, colX + PAD, y + 3, colW - PAD * 2);
        const stageTime = cat.athletes[0]?.logistics?.stagingTime;
        doc.fillColor('#333333').fontSize(SUB_FONT).font('Helvetica');
        this.oneLine(
          doc,
          `${waveName}  •  STG ${stageTime ? formatTime12Hour(stageTime) : '—'}  •  START ${formatTime12Hour(cat.startTime)}`,
          colX + PAD, y + CAT_HDR_H - SUB_FONT - 3, colW - PAD * 2,
        );
        y += CAT_HDR_H;

        // Column headers
        doc.rect(colX, y, colW, COLHDR_H).fill('#E0E0E0');
        doc.fillColor('#555555').font('Helvetica-Bold').fontSize(6.5);
        const colHdrTy = y + (COLHDR_H - 6.5) / 2;
        this.oneLine(doc, 'CALLUP #', callupX, colHdrTy, callupW);
        this.oneLine(doc, 'FIRST', firstX, colHdrTy, nameW);
        this.oneLine(doc, 'LAST', lastX, colHdrTy, nameW);
        this.oneLine(doc, 'BIB #', bibX, colHdrTy, bibW);
        y += COLHDR_H;

        // Athlete rows — a subtle tint of the category's (wave's) own color instead of a
        // neutral gray stripe, same treatment as the check-in roster.
        for (let r = 0; r < cat.athletes.length; r++) {
          const a = cat.athletes[r];
          const stripe = r % 2 === 1;
          const bg = a.calledUp ? CALLED_UP_ROW_COLOR : tint(catColor, stripe ? 0.72 : 0.9);
          doc.rect(colX, y, colW, rowH).fill(bg);
          doc.fillColor('#000000').font('Helvetica').fontSize(fontSize);
          const rowTy = y + (rowH - fontSize) / 2;
          this.oneLine(doc, a.callUpNumber ?? '—', callupX, rowTy, callupW);
          this.oneLine(doc, a.firstName, firstX, rowTy, nameW);
          this.oneLine(doc, a.lastName, lastX, rowTy, nameW);
          this.oneLine(doc, a.bibNumber, bibX, rowTy, bibW);
          y += rowH;
        }
      }
    });
  }

  // ─── Check-in roster table: category blocks flowed down N side-by-side ────
  // ─── columns (newspaper order), sized to fit one page ──────────────────────
  // Each unit is one category's blocks (all of its splits), packed as a whole.
  private renderRosterTable(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    units: RosterCategoryBlock[][],
    totalRows: number,
    brand: PdfBranding,
  ): void {
    const titleY = doc.y;
    doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold');
    this.oneLine(doc, `CHECK-IN ROSTER  (${totalRows} athletes)`, pm.L, titleY, pm.CW);
    doc.y = titleY + 30;

    const tableTop = doc.y;
    const availH = pm.PH - 20 - tableTop;
    if (totalRows === 0 || units.length === 0) return;

    // Column count steps up (4 → 5 → 6) only once the smallest row height still can't fit every
    // category in fewer columns, so the roster stays on one page however many waves there are.
    const COL_OPTIONS = [4, 5, 6];
    const MIN_ROW_H = 8;
    const MAX_ROW_H = 16;
    const GAP = 16;
    const HDR_ROW_H = 18;
    // Two lines: category name + count, then its shared MTG/STAGE/START times — one header
    // band instead of repeating those three times on every athlete row underneath.
    const CAT_HDR_H = 28;
    const perColBudget = availH - HDR_ROW_H;

    // Greedy contiguous fill: whole category units accumulate into the current column until
    // the next one would overflow the FULL column height (not an even fraction of it) — a
    // column is only ever closed because it's actually full, so unlike splitting content into
    // a fixed number of even shares up front, this can't silently pile every leftover category
    // into one column while others sit mostly empty.
    const packColumns = (rowH: number): RosterCategoryBlock[][] => {
      const unitHeight = (u: RosterCategoryBlock[]) =>
        u.reduce((s, b) => s + CAT_HDR_H + b.rows.length * rowH, 0);
      const cols: RosterCategoryBlock[][] = [];
      let currentCol: RosterCategoryBlock[] = [];
      let currentH = 0;
      for (const unit of units) {
        const h = unitHeight(unit);
        if (currentCol.length > 0 && currentH + h > perColBudget) {
          cols.push(currentCol);
          currentCol = [];
          currentH = 0;
        }
        currentCol.push(...unit);
        currentH += h;
      }
      if (currentCol.length > 0) cols.push(currentCol);
      return cols;
    };

    // Start at the most readable row height and shrink only as far as needed to make the
    // packing fit — larger fields naturally need a smaller font.
    const { rowH, columns } = this.fitColumns(packColumns, COL_OPTIONS, MIN_ROW_H, MAX_ROW_H);

    const fontSize = Math.max(6, Math.min(9, rowH - 3));
    const colCount = Math.max(1, columns.length);
    const colW = (pm.CW - (colCount - 1) * GAP) / colCount;

    // Sub-columns within each roster column — no per-row CATEGORY or MTG/STAGE/START columns
    // since the category header band above each group already carries all of that (those
    // times are identical for every athlete in the category, so repeating them per row was
    // redundant). Widths are content-driven so a narrow column count doesn't silently
    // truncate the callup number; NAME absorbs whatever width remains, and never truncates
    // regardless (see fitText below) even if that estimate runs short for an unusually long name.
    const SUB_COLS: { key: keyof RosterRow | 'box'; label: string; align: 'left' | 'center' }[] = [
      { key: 'name', label: 'NAME', align: 'left' },
      { key: 'callUpNumber', label: 'CALLUP #', align: 'center' },
      { key: 'box', label: 'IN', align: 'center' },
    ];
    const contentW = (label: string, sampleData: string): number => {
      doc.font('Helvetica-Bold').fontSize(7);
      const hdrW = doc.widthOfString(label);
      doc.font('Helvetica').fontSize(fontSize);
      const dataW = doc.widthOfString(sampleData);
      return Math.max(hdrW, dataW) + 8;
    };
    const nonNameW = {
      callUpNumber: contentW('CALLUP #', '000'),
      box: Math.max(16, fontSize + 6),
    };
    const nameW = Math.max(60, colW - Object.values(nonNameW).reduce((s, w) => s + w, 0));
    const subW = SUB_COLS.map((sc) => (sc.key === 'name' ? nameW : nonNameW[sc.key as keyof typeof nonNameW]));

    columns.forEach((colBlocks, c) => {
      const colX = pm.L + c * (colW + GAP);
      let y = tableTop;

      // Column header
      doc.rect(colX, y, colW, HDR_ROW_H).fill(brand.primaryColor);
      doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
      let hx = colX;
      const hdrTy = y + (HDR_ROW_H - 7) / 2;
      for (let s = 0; s < SUB_COLS.length; s++) {
        this.oneLine(doc, SUB_COLS[s].label, hx + 2, hdrTy, subW[s] - 4, SUB_COLS[s].align);
        hx += subW[s];
      }
      y += HDR_ROW_H;

      for (const block of colBlocks) {
        // Category header band — cycles through a pastel palette. Line 1 is the category
        // name + count; line 2 is its MTG/STAGE/START times, shared by every athlete in the
        // category so they don't need to repeat on every row underneath.
        const catColor = ROW_COLORS[block.colorIndex % ROW_COLORS.length];
        doc.rect(colX, y, colW, CAT_HDR_H).fill(catColor);
        const catNameFontSize = 10;
        const catTimeFontSize = 7.5;
        doc.fillColor('#000000').fontSize(catNameFontSize).font('Helvetica-Bold');
        this.oneLine(doc, `${block.categoryName}  (${block.rows.length})`, colX + 4, y + 3, colW - 8);
        const first = block.rows[0];
        const fmt = (t: string) => (t ? formatTime12Hour(t) : '—');
        doc.fillColor('#333333').fontSize(catTimeFontSize).font('Helvetica');
        this.oneLine(
          doc,
          `${block.waveName.toUpperCase()}   •   MTG ${fmt(first.waveMeetingTime)}   •   STAGE ${fmt(first.stagingTime)}   •   START ${fmt(first.raceStart)}   •   ${formatLaps(block.laps)}`,
          colX + 4, y + CAT_HDR_H - catTimeFontSize - 4, colW - 8,
        );
        y += CAT_HDR_H;

        // Data rows — a subtle tint of the category's own color (instead of a neutral gray
        // stripe) keeps the category boundary visible without scrolling back up to the header;
        // striping resets at the top of each category so the boundary reads clearly.
        for (let r = 0; r < block.rows.length; r++) {
          const row = block.rows[r];
          const stripe = r % 2 === 1;
          const bg = row.calledUp ? CALLED_UP_ROW_COLOR : tint(catColor, stripe ? 0.72 : 0.9);
          doc.rect(colX, y, colW, rowH).fill(bg);

          let cx = colX;
          for (let s = 0; s < SUB_COLS.length; s++) {
            const sc = SUB_COLS[s];
            if (sc.key === 'box') {
              const boxSize = Math.min(subW[s] - 4, rowH - 4);
              doc.rect(cx + (subW[s] - boxSize) / 2, y + (rowH - boxSize) / 2, boxSize, boxSize)
                .lineWidth(0.75).stroke('#000000');
            } else if (sc.key === 'name') {
              doc.fillColor('#000000');
              this.fitText(doc, row.name, cx + 2, y, subW[s] - 4, rowH, fontSize);
            } else {
              const val = (row[sc.key] as string) || '—';
              doc.fillColor('#000000').font('Helvetica').fontSize(fontSize);
              this.oneLine(doc, val, cx + 2, y + (rowH - fontSize) / 2, subW[s] - 4, sc.align);
            }
            cx += subW[s];
          }
          y += rowH;
        }
      }
    });
  }

  // ─── Pocket printout: one group per wave, categories sorted by start time, ─
  // ─── athletes within each category sorted alphabetically by first name ────
  private buildPocketWaveGroups(schedule: TeamWaveSchedule): PocketWaveGroup[] {
    // Color index runs across the whole document (not reset per wave) so two categories
    // that happen to be the only one in their own panel don't both land on the same color.
    let pocketColorIndex = 0;
    return schedule.waves.map((wave) => ({
      waveName: wave.waveName,
      day: wave.day ?? null,
      categories: [...wave.categories]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((cat) => ({
          categoryName: cat.categoryName,
          stageTime: cat.stageTime,
          startTime: cat.startTime,
          laps: cat.laps,
          colorIndex: pocketColorIndex++,
          athletes: [...cat.athletes]
            .sort((x, y) => x.firstName.localeCompare(y.firstName) || x.lastName.localeCompare(y.lastName))
            .map((a) => ({
              name: `${a.firstName} ${a.lastName}`,
              bibNumber: a.bibNumber,
              callUpNumber: a.callUpNumber ?? '—',
            })),
        })),
    }));
  }

  // ─── One physical page (front or back) of the pocket printout: 2x2 panels ─
  private renderPocketPage(
    doc: PDFKit.PDFDocument,
    panels: (PocketWaveGroup[] | null)[],
    brand: PdfBranding,
  ): void {
    const positions = [
      { x: 0, y: 0 }, { x: PANEL_W, y: 0 },
      { x: 0, y: PANEL_H }, { x: PANEL_W, y: PANEL_H },
    ];
    for (let i = 0; i < PANELS_PER_SHEET; i++) {
      const waves = panels[i];
      if (waves) this.renderPocketPanel(doc, waves, positions[i].x, positions[i].y, brand);
    }

    // Fold guides at the physical quarter-fold creases
    doc.dash(4, { space: 3 }).lineWidth(0.5).strokeColor('#999999');
    doc.moveTo(PANEL_W, 0).lineTo(PANEL_W, PANEL_H * 2).stroke();
    doc.moveTo(0, PANEL_H).lineTo(PANEL_W * 2, PANEL_H).stroke();
    doc.undash();
  }

  // Height-balanced 2-column placement of one wave's categories: each category goes into
  // whichever column is currently shorter (in start order), which balances a wave of uneven
  // splits far better than strict round-robin. `height` is the whole wave block — title bar
  // included — at the given athlete row height.
  private layoutPocketWave(wave: PocketWaveGroup, rowH: number): { cols: number[]; height: number } {
    const heights = new Array<number>(POCKET_COLS).fill(0);
    const cols = wave.categories.map((cat) => {
      const col = heights.indexOf(Math.min(...heights));
      heights[col] += POCKET_CAT_HDR_H + POCKET_COLHDR_H + cat.athletes.length * rowH + POCKET_CAT_GAP;
      return col;
    });
    const colsH = wave.categories.length > 0 ? Math.max(...heights) - POCKET_CAT_GAP : 0;
    return { cols, height: POCKET_TITLE_H + POCKET_TITLE_GAP + colsH };
  }

  // Greedy in-order packing: a wave joins the current panel when it still fits below the
  // waves already there at full row height; otherwise it starts the next panel.
  private packPocketPanels(waves: PocketWaveGroup[]): PocketWaveGroup[][] {
    const availH = PANEL_H - POCKET_BOTTOM_PAD;
    const panels: PocketWaveGroup[][] = [];
    let current: PocketWaveGroup[] = [];
    let usedH = 0;
    for (const wave of waves) {
      const h = this.layoutPocketWave(wave, POCKET_ATHLETE_ROW_H).height;
      if (current.length > 0 && usedH + POCKET_WAVE_GAP + h > availH) {
        panels.push(current);
        current = [];
        usedH = 0;
      }
      usedH += (current.length > 0 ? POCKET_WAVE_GAP : 0) + h;
      current.push(wave);
    }
    if (current.length > 0) panels.push(current);
    return panels;
  }

  // One panel: its waves stacked top to bottom, each with a full-width title bar naming the
  // wave, then up to POCKET_COLS side-by-side category columns. Each category gets its own
  // mini-header showing the category name and its stage/start times. A wave too tall for the
  // panel on its own (packPocketPanels gives it a panel to itself) shrinks its athlete rows,
  // to a readable floor, so it stays on its panel instead of running into the one below it.
  private renderPocketPanel(
    doc: PDFKit.PDFDocument,
    waves: PocketWaveGroup[],
    px: number,
    py: number,
    brand: PdfBranding,
  ): void {
    const PAD = 10;
    const innerW = PANEL_W - PAD * 2;
    const colW = (innerW - POCKET_COL_GAP * (POCKET_COLS - 1)) / POCKET_COLS;
    const panelBottom = py + PANEL_H - POCKET_BOTTOM_PAD;

    let y = py;
    for (const wave of waves) {
      let rowH = POCKET_ATHLETE_ROW_H;
      let placement = this.layoutPocketWave(wave, rowH);
      while (y + placement.height > panelBottom && rowH > POCKET_MIN_ATHLETE_ROW_H) {
        rowH -= 0.5;
        placement = this.layoutPocketWave(wave, rowH);
      }

      doc.rect(px, y, PANEL_W, POCKET_TITLE_H).fill(brand.primaryColor);
      doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
      this.oneLine(doc, wave.waveName, px + PAD, y + 6, innerW);

      const colYs = new Array<number>(POCKET_COLS).fill(y + POCKET_TITLE_H + POCKET_TITLE_GAP);
      wave.categories.forEach((cat, i) => {
        const col = placement.cols[i];
        const cx = px + PAD + col * (colW + POCKET_COL_GAP);
        const catColor = ROW_COLORS[cat.colorIndex % ROW_COLORS.length];
        colYs[col] = this.renderPocketCategoryBlock(doc, cat, cx, colYs[col], colW, catColor, rowH) + POCKET_CAT_GAP;
      });

      y += placement.height + POCKET_WAVE_GAP;
    }
  }

  // Single category's mini-header (name + stage/start times) and athlete rows, rendered at an
  // absolute position — returns the y it ended at, mirroring renderCategoryBlock's pattern so
  // columns can stack multiple categories. The header gets a solid colored band (cycling per
  // category, same palette used elsewhere) so adjacent categories in a panel read as visually
  // distinct groups rather than blurring together.
  private renderPocketCategoryBlock(
    doc: PDFKit.PDFDocument,
    cat: PocketCategoryGroup,
    cx: number,
    startY: number,
    colW: number,
    catColor: string,
    rowH: number = POCKET_ATHLETE_ROW_H,
  ): number {
    let y = startY;

    doc.rect(cx, y, colW, POCKET_CAT_HDR_H).fill(catColor);
    const NAME_FONT = 8.5;
    const TIME_FONT = 7.5;
    doc.font('Helvetica-Bold').fontSize(NAME_FONT);
    const nameLineH = doc.currentLineHeight();
    doc.font('Helvetica').fontSize(TIME_FONT);
    const timeLineH = doc.currentLineHeight();
    const lapsLineH = timeLineH;
    const topPad = (POCKET_CAT_HDR_H - (nameLineH + timeLineH + lapsLineH)) / 2;
    doc.fillColor('#222222').fontSize(NAME_FONT).font('Helvetica-Bold');
    this.oneLine(doc, cat.categoryName, cx + 3, y + topPad, colW - 6);
    doc.fillColor('#333333').fontSize(TIME_FONT).font('Helvetica');
    this.oneLine(
      doc,
      `STAGE ${formatTime12Hour(cat.stageTime)}   •   START ${formatTime12Hour(cat.startTime)}`,
      cx + 3, y + topPad + nameLineH, colW - 6,
    );
    this.oneLine(
      doc,
      formatLaps(cat.laps),
      cx + 3, y + topPad + nameLineH + timeLineH, colW - 6,
    );
    y += POCKET_CAT_HDR_H;

    // Column order: Name | Callup # | Plate # (bib).
    const posW = 32;
    const bibW = 28;
    const nameW = colW - posW - bibW;

    // Column header row — small, on its own faint band so it reads as labels rather than data.
    const HDR_FONT = 6;
    doc.rect(cx, y, colW, POCKET_COLHDR_H).fill('#E0E0E0');
    doc.fillColor('#555555').font('Helvetica-Bold').fontSize(HDR_FONT);
    const hdrTy = y + (POCKET_COLHDR_H - HDR_FONT) / 2;
    this.oneLine(doc, 'NAME', cx + 2, hdrTy, nameW - 2, 'left');
    this.oneLine(doc, 'CALLUP #', cx + nameW, hdrTy, posW, 'center');
    this.oneLine(doc, 'PLATE #', cx + nameW + posW, hdrTy, bibW - 2, 'right');
    y += POCKET_COLHDR_H;

    // Striping tints the category's own color instead of a flat gray — more visibly distinct
    // row-to-row while staying light enough to read against, and ties back to the header color.
    for (let r = 0; r < cat.athletes.length; r++) {
      const athlete = cat.athletes[r];
      const stripe = r % 2 === 1;
      const fontSize = Math.min(8.5, rowH - 2);
      doc.rect(cx, y, colW, rowH).fill(tint(catColor, stripe ? 0.3 : 0.75));
      doc.fillColor('#000000').font('Helvetica').fontSize(fontSize);
      const ty = y + (rowH - fontSize) / 2;
      this.oneLine(doc, athlete.name, cx + 2, ty, nameW - 2);
      this.oneLine(doc, athlete.callUpNumber, cx + nameW, ty, posW, 'center');
      this.oneLine(doc, athlete.bibNumber, cx + nameW + posW, ty, bibW - 2, 'right');
      y += rowH;
    }

    return y;
  }

  // Shared shrink-then-widen fitter for the column-packed pages: for each allowed column count
  // (fewest first), start at the most readable row height and shrink only as far as needed.
  // Extreme case (more categories than even MIN_ROW_H at the widest option can hold): merge any
  // excess columns into the last one rather than losing categories off the rendered page.
  private fitColumns<T>(
    packColumns: (rowH: number) => T[][],
    colOptions: number[],
    minRowH: number,
    maxRowH: number,
  ): { rowH: number; columns: T[][] } {
    let rowH = maxRowH;
    let columns = packColumns(rowH);
    let maxCols = colOptions[0];
    for (const option of colOptions) {
      maxCols = option;
      rowH = maxRowH;
      columns = packColumns(rowH);
      while (columns.length > maxCols && rowH > minRowH) {
        rowH -= 1;
        columns = packColumns(rowH);
      }
      if (columns.length <= maxCols) break;
    }
    if (columns.length > maxCols) {
      columns = [...columns.slice(0, maxCols - 1), columns.slice(maxCols - 1).flat()];
    }
    return { rowH, columns };
  }

  // PDFKit's `lineBreak: false` does NOT suppress word-wrapping once a `width` is
  // given (it only skips computing a *default* width) — text that doesn't fit still
  // wraps onto a second line, which corrupts tightly-packed table rows. Pairing an
  // explicit `height` (one line tall) with `ellipsis: true` is what actually forces
  // truncation to a single line.
  private oneLine(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    align: 'left' | 'center' | 'right' = 'left',
  ): void {
    const h = doc.currentLineHeight() + 1;
    doc.text(text, x, y, { width, height: h, ellipsis: true, align });
  }

  // Shrinks font size (down to a hard floor) until `text` actually fits within `maxWidth`,
  // then renders it vertically centered within `rowH` at that final size — used where
  // truncation is unacceptable (athlete names on the check-in roster). Unlike oneLine, this
  // never adds an ellipsis: a name always renders in full, just smaller if it has to.
  private fitText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    rowH: number,
    baseFontSize: number,
  ): void {
    const FLOOR = 4.5;
    doc.font('Helvetica');
    let fs = baseFontSize;
    while (fs > FLOOR && doc.fontSize(fs).widthOfString(text) > maxWidth) {
      fs -= 0.5;
    }
    doc.fontSize(fs);
    const ty = y + (rowH - fs) / 2;
    doc.text(text, x, ty, { width: maxWidth, height: fs + 1, lineBreak: false });
  }

  private async fetchLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null;
    try {
      const res = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) });
      /* v8 ignore next */
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    /* v8 ignore next */
    } catch {
      return null;
    }
  }
}
