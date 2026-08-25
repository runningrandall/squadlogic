import type { TeamWaveSchedule, WaveGroup, WaveScheduleEntry } from '../domain/race-event.js';
import { formatTime12Hour } from '../lib/time-format.js';

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
  colorIndex: number;
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
  colorIndex: number;
  athletes: PocketAthlete[]; // pre-sorted alphabetically by first name
}

interface PocketWaveGroup {
  waveName: string;
  categories: PocketCategoryGroup[];
}

// Pocket printout panel geometry: a Letter sheet folded in half twice (quarter-fold)
// unfolds into a 2x2 grid of these panels — final folded size ~4.25"x5.5". Each panel
// holds one wave, laid out as 2 side-by-side category columns (round-robin if a wave
// has more than 2 categories) — no per-row wave/category column needed since the panel
// title already names the wave and each category has its own mini-header.
const PANEL_W = 306;
const PANEL_H = 396;
const PANELS_PER_SHEET = 4; // per side; 8 total per physical (double-sided) sheet
const POCKET_TITLE_H = 24;
const POCKET_TITLE_GAP = 6;
const POCKET_COLS = 2;
const POCKET_COL_GAP = 10;
const POCKET_CAT_HDR_H = 20;
const POCKET_CAT_GAP = 6;
const POCKET_COLHDR_H = 10;
const POCKET_ATHLETE_ROW_H = 12;

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
    const pm = TABLOID_LANDSCAPE;

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

      // Page 1: summary, rotated 90° into the physical page (see SUMMARY_PM above) — the
      // printed sheet shows the table sideways; turn the printed page so its long edge is
      // on top to read it normally. Detail pages below are unaffected: each doc.addPage()
      // starts a fresh, unrotated content matrix.
      doc.transform(0, 1, -1, 0, TABLOID_LANDSCAPE.PW, 0);
      this.renderPageHeader(SUMMARY_PM, doc, sorted, brand, logoBuffer, eventLocation);
      this.renderSummary(SUMMARY_PM, doc, sorted, brand, logoBuffer, eventLocation);

      // Subsequent pages: waves packed as many-per-page as measured height allows
      const avail = pm.PH - pm.HEADER_H - 20;
      let pageWaves: { wave: WaveGroup; colorIndex: number }[] = [];
      let usedH = 0;

      const flushPage = () => {
        if (pageWaves.length === 0) return;
        doc.addPage();
        this.renderPageHeader(pm, doc, sorted, brand, logoBuffer, eventLocation);
        for (const { wave, colorIndex } of pageWaves) {
          this.renderWave(pm, doc, wave, colorIndex, brand);
          doc.y += 20;
        }
        pageWaves = [];
        usedH = 0;
      };

      sorted.waves.forEach((wave, colorIndex) => {
        const h = this.measureWaveHeight(wave, pm);
        if (pageWaves.length > 0 && usedH + h > avail) {
          flushPage();
        }
        pageWaves.push({ wave, colorIndex });
        usedH += h + 20;
      });
      flushPage();

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
    // the category name, so no per-row category column is needed.
    let rosterColorIndex = 0;
    const blocks: RosterCategoryBlock[] = schedule.waves.flatMap((wave) =>
      wave.categories.map((cat) => ({
        categoryName: cat.categoryName,
        colorIndex: rosterColorIndex++,
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
      this.renderRosterTable(pm, doc, blocks, totalRows, brand);

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

    // One wave per panel — realistic wave sizes (max ~35-40 athletes across up to
    // ~4 categories, observed in this app's actual event data) comfortably fit the
    // 2-column category layout below; this doesn't attempt to split an oversized
    // wave across multiple panels.
    const waveGroups = this.buildPocketWaveGroups(schedule);
    const panels: (PocketWaveGroup | null)[] = [...waveGroups];
    if (panels.length === 0) panels.push(null);
    const sheets = Math.max(1, Math.ceil(panels.length / (PANELS_PER_SHEET * 2)));
    while (panels.length < sheets * PANELS_PER_SHEET * 2) panels.push(null);

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
    const subtitle = [schedule.eventName, schedule.eventDate, eventLocation]
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
    // Large title — one line (plenty of width on a Tabloid landscape page). Explicit height
    // avoids pdfkit's own auto-pagination check, which compares the raw y position against
    // the *physical* page height and would otherwise add a spurious page — harmless here
    // since the title sits near the top, but every text call below follows the same rule
    // since this page's logical canvas is taller than the physical sheet (see SUMMARY_PM).
    doc.fillColor('#000000').fontSize(28).font('Helvetica-Bold');
    doc.text('RIDER PREP & RACE TIMES', pm.L, doc.y, { width: pm.CW, height: 34, align: 'center', lineBreak: false });
    doc.y += 40;

    // Column layout: Wave | Category | WaveMtg | WarmUp | Stage | RaceStart | Athlete Count.
    // Fixed columns take up their share; Category takes whatever content width remains.
    // Wave gets enough room for names like "Wave 12 - HS" at the larger data font below;
    // time columns are sized for "10:20 AM" at that same size.
    const fixedCols = [140, 88, 88, 88, 88, 70];
    const categoryColW = pm.CW - fixedCols.reduce((s, w) => s + w, 0);
    const cols = [fixedCols[0], categoryColW, ...fixedCols.slice(1)];
    const hdrs = ['WAVE', 'CATEGORY', 'WAVE MTG', 'WARM UP', 'STAGE', 'RACE START', 'ATHLETE COUNT'];
    const hdrColors = [
      '#000000', '#000000',
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.stage,   TIME_COL_COLORS.race,
      TIME_COL_COLORS.athletes,
    ];
    const tableW = cols.reduce((s, w) => s + w, 0);
    const HDR_H = 36;
    const HDR_FONT_SIZE = 13;
    const footerY = pm.PH - 30;

    const drawColumnHeaderRow = (): void => {
      const thY = doc.y;
      let hx = pm.L;
      for (let i = 0; i < hdrs.length; i++) {
        doc.rect(hx, thY, cols[i], HDR_H).fill(hdrColors[i]);
        const txtColor = i < 2 ? '#FFFFFF' : '#000000';
        const centered = i >= 2;
        doc.fillColor(txtColor).font('Helvetica-Bold');
        if (hdrs[i] === 'ATHLETE COUNT') {
          // Two lines so the longer label still fits a column sized like its neighbors.
          doc.fontSize(HDR_FONT_SIZE - 1);
          this.oneLine(doc, 'ATHLETE', hx + 4, thY + 7, cols[i] - 8, 'center');
          this.oneLine(doc, 'COUNT', hx + 4, thY + 19, cols[i] - 8, 'center');
        } else {
          doc.fontSize(HDR_FONT_SIZE);
          this.oneLine(doc, hdrs[i], hx + 4, thY + (HDR_H - HDR_FONT_SIZE) / 2, cols[i] - 8, centered ? 'center' : 'left');
        }
        hx += cols[i];
      }
      doc.y = thY + HDR_H;
    };

    drawColumnHeaderRow();

    // Data rows — height grows to fit however many lines the category list wraps to. When
    // the whole table fits on this page, rows also stretch to fill the remaining space so the
    // table fills the page like the reference layout; when it doesn't fit, rows stay at their
    // content-driven height and the table spills onto additional pages instead of silently
    // overflowing past the page boundary.
    // One consistent font size across the wave/category/time columns — previously the wave
    // column used a visibly smaller size than its neighbors for no functional reason.
    const WAVE_FONT_SIZE = 16;
    const CAT_FONT_SIZE = 16;
    const TIME_FONT_SIZE = 16;
    const ROW_V_PAD = 20;
    const ROW_MIN_H = 50;

    const contentRowH = (wave: WaveGroup): number => {
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      doc.font('Helvetica-Bold').fontSize(CAT_FONT_SIZE);
      const categoryH = doc.heightOfString(categoryList, { width: cols[1] - 8 });
      return Math.max(ROW_MIN_H, categoryH + ROW_V_PAD);
    };

    const totalContentH = schedule.waves.reduce((s, w) => s + contentRowH(w), 0);
    const singlePageAvail = Math.max(0, footerY - doc.y);
    const singlePageFits = totalContentH <= singlePageAvail;
    // Floored rather than exact division: an exact split lands the last row's bottom edge
    // precisely on footerY, and floating-point rounding can occasionally push it a hair over,
    // triggering an unwanted page break for the last wave.
    const stretchRowH = singlePageFits && schedule.waves.length > 0
      ? Math.floor(singlePageAvail / schedule.waves.length)
      : 0;

    const sepX = pm.L + cols[0] + cols[1];
    let colorIdx = 0;
    for (const wave of schedule.waves) {
      const firstCat = wave.categories[0];
      const logistics = firstCat?.athletes[0]?.logistics;
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      const athleteCount = wave.categories.reduce((s, c) => s + c.athletes.length, 0);

      doc.font('Helvetica-Bold').fontSize(CAT_FONT_SIZE);
      const categoryH = doc.heightOfString(categoryList, { width: cols[1] - 8 });
      const ROW_H = Math.max(ROW_MIN_H, categoryH + ROW_V_PAD, stretchRowH);

      if (doc.y + ROW_H > footerY) {
        doc.addPage();
        doc.transform(0, 1, -1, 0, TABLOID_LANDSCAPE.PW, 0);
        this.renderPageHeader(pm, doc, schedule, brand, logoBuffer, eventLocation);
        drawColumnHeaderRow();
      }

      const rowY = doc.y;
      const rowColor = ROW_COLORS[colorIdx % ROW_COLORS.length];
      colorIdx++;

      doc.rect(pm.L, rowY, tableW, ROW_H).fill(rowColor);
      doc.fillColor('#000000');

      const rowVals = [
        wave.waveName,
        categoryList,
        logistics?.waveMeetingTime ? formatTime12Hour(logistics.waveMeetingTime) : '—',
        logistics?.warmupStart ? formatTime12Hour(logistics.warmupStart) : '—',
        firstCat?.athletes[0]?.logistics?.stagingTime
          ? formatTime12Hour(firstCat.athletes[0].logistics.stagingTime) : '—',
        firstCat?.startTime ? formatTime12Hour(firstCat.startTime) : '—',
        String(athleteCount),
      ];
      let x = pm.L;
      for (let i = 0; i < rowVals.length; i++) {
        const bold = i < 2;
        const centered = i >= 2;
        // Only the category column (i=1) may wrap (ROW_H above is sized to fit it);
        // every other column is forced to a single truncated line.
        const allowWrap = i === 1;
        const fontSize = allowWrap ? CAT_FONT_SIZE : i === 0 ? WAVE_FONT_SIZE : TIME_FONT_SIZE;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
        const ty = rowY + (allowWrap ? (ROW_H - categoryH) / 2 : (ROW_H - fontSize) / 2);
        if (allowWrap) {
          // allowWrap only applies to the category column (i===1), which centered (i>=2) never is.
          // Explicit height (already measured as categoryH above) avoids pdfkit's auto-pagination
          // check — see the note on the title above.
          doc.text(rowVals[i], x + 4, ty, { width: cols[i] - 8, height: categoryH, align: 'left' });
        } else {
          this.oneLine(doc, rowVals[i], x + 4, ty, cols[i] - 8, centered ? 'center' : 'left');
        }
        x += cols[i];
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

  // Category column geometry used by both the measurement pass and renderCategoryBlock —
  // kept in sync so the packing estimate matches what actually gets drawn.
  private static readonly CAT_COL_W = 260;
  private static readonly CAT_COL_GAP = 20;
  private static readonly CAT_NAME_BAND_H = 22;
  private static readonly CAT_TIME_BAND_H = 40;
  private static readonly CAT_HEADER_H = PdfExportService.CAT_NAME_BAND_H + PdfExportService.CAT_TIME_BAND_H;
  private static readonly CAT_COLHDR_H = 16;
  private static readonly CAT_ROW_H = 16;

  private waveColumnCount(wave: WaveGroup, pm: PageMetrics): number {
    const perCol = PdfExportService.CAT_COL_W + PdfExportService.CAT_COL_GAP;
    const maxCols = Math.max(1, Math.floor((pm.CW + PdfExportService.CAT_COL_GAP) / perCol));
    return Math.max(1, Math.min(wave.categories.length, maxCols));
  }

  // ─── Pure height estimate for a wave, used to pack up to 2 waves per page ─
  private measureWaveHeight(wave: WaveGroup, pm: PageMetrics): number {
    const TIMING_BLOCK = 36 + 16 + 24 + 16; // banner + label row + value row + divider gap
    const numCols = this.waveColumnCount(wave, pm);
    const colHeights = new Array(numCols).fill(0);
    wave.categories.forEach((c, i) => {
      colHeights[i % numCols] += PdfExportService.CAT_HEADER_H + PdfExportService.CAT_COLHDR_H
        + PdfExportService.CAT_ROW_H * c.athletes.length + 8;
    });
    return TIMING_BLOCK + Math.max(...colHeights, 0);
  }

  // ─── Individual wave block (banner + timing + category columns) ───────────
  private renderWave(
    pm: PageMetrics, doc: PDFKit.PDFDocument, wave: WaveGroup, waveColorIndex: number, brand: PdfBranding,
  ): void {
    const tableW = pm.CW;
    const firstCat = wave.categories[0];
    const logistics = firstCat?.athletes[0]?.logistics;

    // Wave name banner — colored to match this wave's row on the summary page.
    const waveY = doc.y;
    doc.rect(pm.L, waveY, tableW, 36).fill(ROW_COLORS[waveColorIndex % ROW_COLORS.length]);
    doc.fillColor('#000000').fontSize(19).font('Helvetica-Bold');
    this.oneLine(doc, wave.waveName, pm.L + 10, waveY + 9, tableW - 20);
    doc.y = waveY + 36;

    // Timing block: label row + value row spanning full width
    const timeCols = [pm.CW / 5, pm.CW / 5, pm.CW / 5, pm.CW / 5, pm.CW / 5];
    const timeLabels = ['WAVE MEETING', 'WU START', 'WU END', 'STAGE', 'RACE START'];
    const timeColBg = [
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.warmUp,  TIME_COL_COLORS.stage,
      TIME_COL_COLORS.race,
    ];
    const timeVals = [
      logistics?.waveMeetingTime ? formatTime12Hour(logistics.waveMeetingTime) : '—',
      logistics?.warmupStart ? formatTime12Hour(logistics.warmupStart) : '—',
      logistics?.warmupEnd ? formatTime12Hour(logistics.warmupEnd) : '—',
      firstCat?.athletes[0]?.logistics?.stagingTime
        ? formatTime12Hour(firstCat.athletes[0].logistics.stagingTime) : '—',
      firstCat?.startTime ? formatTime12Hour(firstCat.startTime) : '—',
    ];

    // Label row
    const lblY = doc.y;
    let x = pm.L;
    for (let i = 0; i < timeLabels.length; i++) {
      doc.rect(x, lblY, timeCols[i], 16).fill(timeColBg[i]);
      doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
      this.oneLine(doc, timeLabels[i], x + 4, lblY + 4, timeCols[i] - 8);
      x += timeCols[i];
    }
    doc.y = lblY + 16;

    // Value row
    const valY = doc.y;
    x = pm.L;
    for (let i = 0; i < timeVals.length; i++) {
      doc.rect(x, valY, timeCols[i], 24).fill(i % 2 === 0 ? '#FFFFFF' : brand.tertiaryColor);
      doc.fillColor('#000000').fontSize(15).font('Helvetica-Bold');
      this.oneLine(doc, timeVals[i], x + 4, valY + 5, timeCols[i] - 8);
      x += timeCols[i];
    }
    doc.y = valY + 26;

    // Divider between the wave-level timing block and the category rosters below —
    // visually distinct sections, so give them a clear gap and a rule line.
    const dividerY = doc.y + 8;
    doc.moveTo(pm.L, dividerY).lineTo(pm.L + tableW, dividerY).lineWidth(1).strokeColor('#CCCCCC').stroke();
    doc.y += 16;

    // N independent columns (N chosen to use the full page width, up to one per
    // category) — each flows downward on its own, no height coupling between neighbours.
    // The packing math in generateSchedulePdf never admits a wave whose own banner+timing
    // block would start this close to the page bottom, so no page-overflow guard is needed here.
    const COL_W = PdfExportService.CAT_COL_W; // name (140) + staging # (40) + bib (56) + padding/gaps
    const COL_GAP = PdfExportService.CAT_COL_GAP;
    const numCols = this.waveColumnCount(wave, pm);

    const colStartY = doc.y;
    const colYs = new Array(numCols).fill(colStartY);

    wave.categories.forEach((cat, i) => {
      const col = i % numCols;
      const cx = pm.L + col * (COL_W + COL_GAP);
      colYs[col] = this.renderCategoryBlock(doc, cat, cx, colYs[col], COL_W, brand) + 8;
    });

    doc.y = Math.max(...colYs);
  }

  // ─── Single category block rendered at absolute position (returns end y) ──
  private renderCategoryBlock(
    doc: PDFKit.PDFDocument,
    cat: WaveScheduleEntry,
    cx: number,
    startY: number,
    colW: number,
    brand: PdfBranding,
  ): number {
    // Consistent left/right inset and inter-column gap applied to every row in this
    // block (header, column labels, athlete rows) so their left edges all line up.
    const PAD = 8;
    const GAP = 4;
    const callupW = 44; // wide enough for the "CALLUP #" header at 8pt bold
    const firstW = 80;
    const lastW = 76;
    const bibW = 32; // PAD + callupW + GAP + firstW + GAP + lastW + GAP + bibW + PAD === colW
    const callupX = cx + PAD;
    const firstX = callupX + callupW + GAP;
    const lastX = firstX + firstW + GAP;
    const bibX = lastX + lastW + GAP;

    const NAME_BAND_H = PdfExportService.CAT_NAME_BAND_H;
    const TIME_BAND_H = PdfExportService.CAT_TIME_BAND_H;
    const HEADER_H = PdfExportService.CAT_HEADER_H;
    const COLHDR_H = PdfExportService.CAT_COLHDR_H;
    const ROW_H = PdfExportService.CAT_ROW_H;
    let y = startY;

    // Name band — category name + count
    const NAME_FONT = 13;
    doc.rect(cx, y, colW, NAME_BAND_H).fill(brand.tertiaryColor);
    doc.fillColor('#222222').fontSize(NAME_FONT).font('Helvetica-Bold');
    this.oneLine(
      doc, `${cat.categoryName}  (${cat.athletes.length})`,
      callupX, y + (NAME_BAND_H - NAME_FONT) / 2, colW - PAD * 2,
    );

    // Time band — visually distinct background from the name band above, with the stage
    // and race-start lines given clear vertical spacing rather than crammed on one line.
    const timeBandY = y + NAME_BAND_H;
    const SUB_FONT = 9;
    doc.rect(cx, timeBandY, colW, TIME_BAND_H).fill('#E8E8E8');
    doc.font('Helvetica-Bold').fontSize(SUB_FONT);
    const subLineH = doc.currentLineHeight();
    const LINE_GAP = 8;
    const textTop = timeBandY + (TIME_BAND_H - (subLineH * 2 + LINE_GAP)) / 2;
    const stageTime = cat.athletes[0]?.logistics?.stagingTime;
    doc.fillColor('#333333');
    this.oneLine(
      doc, `STAGE: ${stageTime ? formatTime12Hour(stageTime) : '—'}`,
      callupX, textTop, colW - PAD * 2,
    );
    this.oneLine(
      doc, `RACE START: ${formatTime12Hour(cat.startTime)}   •   ${cat.laps ?? '—'} LAPS`,
      callupX, textTop + subLineH + LINE_GAP, colW - PAD * 2,
    );
    y += HEADER_H;

    // Column headers
    doc.rect(cx, y, colW, COLHDR_H).fill('#E0E0E0');
    doc.fillColor('#555555').fontSize(8).font('Helvetica-Bold');
    const colHdrTy = y + (COLHDR_H - 8) / 2;
    this.oneLine(doc, 'CALLUP #', callupX, colHdrTy, callupW);
    this.oneLine(doc, 'FIRST', firstX, colHdrTy, firstW);
    this.oneLine(doc, 'LAST', lastX, colHdrTy, lastW);
    this.oneLine(doc, 'BIB #', bibX, colHdrTy, bibW);
    y += COLHDR_H;

    // Athlete rows
    for (let r = 0; r < cat.athletes.length; r++) {
      const a = cat.athletes[r];
      const stripe = r % 2 === 1;
      const bg = a.calledUp ? CALLED_UP_ROW_COLOR : (stripe ? '#F5F5F5' : null);
      if (bg) doc.rect(cx, y, colW, ROW_H).fill(bg);

      doc.fillColor('#000000').fontSize(9).font('Helvetica');
      const rowTy = y + (ROW_H - 9) / 2;
      this.oneLine(doc, a.callUpNumber ?? '—', callupX, rowTy, callupW);
      this.oneLine(doc, a.firstName, firstX, rowTy, firstW);
      this.oneLine(doc, a.lastName, lastX, rowTy, lastW);
      this.oneLine(doc, a.bibNumber, bibX, rowTy, bibW);
      y += ROW_H;
    }

    return y;
  }

  // ─── Check-in roster table: category blocks flowed down N side-by-side ────
  // ─── columns (newspaper order), sized to fit one page ──────────────────────
  private renderRosterTable(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    blocks: RosterCategoryBlock[],
    totalRows: number,
    brand: PdfBranding,
  ): void {
    const titleY = doc.y;
    doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold');
    this.oneLine(doc, `CHECK-IN ROSTER  (${totalRows} athletes)`, pm.L, titleY, pm.CW);
    doc.y = titleY + 30;

    const tableTop = doc.y;
    const availH = pm.PH - 20 - tableTop;
    if (totalRows === 0 || blocks.length === 0) return;

    const MAX_COLS = 4;
    const MIN_ROW_H = 8;
    const MAX_ROW_H = 16;
    const GAP = 16;
    const HDR_ROW_H = 18;
    // Two lines: category name + count, then its shared MTG/STAGE/START times — one header
    // band instead of repeating those three times on every athlete row underneath.
    const CAT_HDR_H = 28;
    const perColBudget = availH - HDR_ROW_H;

    // Greedy contiguous fill: whole category blocks accumulate into the current column until
    // the next one would overflow the FULL column height (not an even fraction of it) — a
    // column is only ever closed because it's actually full, so unlike splitting content into
    // a fixed number of even shares up front, this can't silently pile every leftover category
    // into one column while others sit mostly empty.
    const packColumns = (rowH: number): RosterCategoryBlock[][] => {
      const blockHeight = (b: RosterCategoryBlock) => CAT_HDR_H + b.rows.length * rowH;
      const cols: RosterCategoryBlock[][] = [];
      let currentCol: RosterCategoryBlock[] = [];
      let currentH = 0;
      for (const block of blocks) {
        const h = blockHeight(block);
        if (currentCol.length > 0 && currentH + h > perColBudget) {
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

    // Start at the most readable row height and shrink only as far as needed to make the
    // packing fit within MAX_COLS columns — larger fields naturally need a smaller font.
    let rowH = MAX_ROW_H;
    let columns = packColumns(rowH);
    while (columns.length > MAX_COLS && rowH > MIN_ROW_H) {
      rowH -= 1;
      columns = packColumns(rowH);
    }
    // Extreme case (more categories than even MIN_ROW_H/MAX_COLS can hold): merge any excess
    // columns into the last one rather than losing categories off the rendered page entirely.
    if (columns.length > MAX_COLS) {
      columns = [...columns.slice(0, MAX_COLS - 1), columns.slice(MAX_COLS - 1).flat()];
    }

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
          `MTG ${fmt(first.waveMeetingTime)}   •   STAGE ${fmt(first.stagingTime)}   •   START ${fmt(first.raceStart)}`,
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
      categories: [...wave.categories]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((cat) => ({
          categoryName: cat.categoryName,
          stageTime: cat.stageTime,
          startTime: cat.startTime,
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
    panels: (PocketWaveGroup | null)[],
    brand: PdfBranding,
  ): void {
    const positions = [
      { x: 0, y: 0 }, { x: PANEL_W, y: 0 },
      { x: 0, y: PANEL_H }, { x: PANEL_W, y: PANEL_H },
    ];
    for (let i = 0; i < PANELS_PER_SHEET; i++) {
      const wave = panels[i];
      if (wave) this.renderPocketPanel(doc, wave, positions[i].x, positions[i].y, brand);
    }

    // Fold guides at the physical quarter-fold creases
    doc.dash(4, { space: 3 }).lineWidth(0.5).strokeColor('#999999');
    doc.moveTo(PANEL_W, 0).lineTo(PANEL_W, PANEL_H * 2).stroke();
    doc.moveTo(0, PANEL_H).lineTo(PANEL_W * 2, PANEL_H).stroke();
    doc.undash();
  }

  // One wave per panel: a full-width title bar naming the wave, then up to
  // POCKET_COLS side-by-side category columns (round-robin if the wave has more
  // categories than columns). Each category gets its own mini-header showing the
  // category name and its stage/start times — no per-row wave/category column needed.
  private renderPocketPanel(
    doc: PDFKit.PDFDocument,
    wave: PocketWaveGroup,
    px: number,
    py: number,
    brand: PdfBranding,
  ): void {
    const PAD = 10;
    const innerW = PANEL_W - PAD * 2;

    doc.rect(px, py, PANEL_W, POCKET_TITLE_H).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
    this.oneLine(doc, wave.waveName, px + PAD, py + 6, innerW);

    const colW = (innerW - POCKET_COL_GAP * (POCKET_COLS - 1)) / POCKET_COLS;
    const colStartY = py + POCKET_TITLE_H + POCKET_TITLE_GAP;
    const colYs = new Array(POCKET_COLS).fill(colStartY);

    wave.categories.forEach((cat, i) => {
      const col = i % POCKET_COLS;
      const cx = px + PAD + col * (colW + POCKET_COL_GAP);
      const catColor = ROW_COLORS[cat.colorIndex % ROW_COLORS.length];
      colYs[col] = this.renderPocketCategoryBlock(doc, cat, cx, colYs[col], colW, catColor) + POCKET_CAT_GAP;
    });
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
  ): number {
    let y = startY;

    doc.rect(cx, y, colW, POCKET_CAT_HDR_H).fill(catColor);
    const NAME_FONT = 8.5;
    const TIME_FONT = 7.5;
    doc.font('Helvetica-Bold').fontSize(NAME_FONT);
    const nameLineH = doc.currentLineHeight();
    doc.font('Helvetica').fontSize(TIME_FONT);
    const timeLineH = doc.currentLineHeight();
    const topPad = (POCKET_CAT_HDR_H - (nameLineH + timeLineH)) / 2;
    doc.fillColor('#222222').fontSize(NAME_FONT).font('Helvetica-Bold');
    this.oneLine(doc, cat.categoryName, cx + 3, y + topPad, colW - 6);
    doc.fillColor('#333333').fontSize(TIME_FONT).font('Helvetica');
    this.oneLine(
      doc,
      `STAGE ${formatTime12Hour(cat.stageTime)}   •   START ${formatTime12Hour(cat.startTime)}`,
      cx + 3, y + topPad + nameLineH, colW - 6,
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
      doc.rect(cx, y, colW, POCKET_ATHLETE_ROW_H).fill(tint(catColor, stripe ? 0.3 : 0.75));
      doc.fillColor('#000000').font('Helvetica').fontSize(8.5);
      const ty = y + (POCKET_ATHLETE_ROW_H - 8.5) / 2;
      this.oneLine(doc, athlete.name, cx + 2, ty, nameW - 2);
      this.oneLine(doc, athlete.callUpNumber, cx + nameW, ty, posW, 'center');
      this.oneLine(doc, athlete.bibNumber, cx + nameW + posW, ty, bibW - 2, 'right');
      y += POCKET_ATHLETE_ROW_H;
    }

    return y;
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
