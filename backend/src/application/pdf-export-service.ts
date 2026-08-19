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
  waveMtg: '#FFD54F',
  warmUp:  '#EF9A9A',
  stage:   '#FFCC80',
  race:    '#A5D6A7',
  athletes:'#B0BEC5',
};

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

interface RosterRow {
  name: string;
  firstName: string;
  lastName: string;
  categoryName: string;
  waveMeetingTime: string;
  stagingTime: string;
  raceStart: string;
}

interface PocketEntry {
  waveName: string;
  name: string;
  firstName: string;
  lastName: string;
  categoryName: string;
  startTime: string;
}

// Pocket printout panel geometry: a Letter sheet folded in half twice (quarter-fold)
// unfolds into a 2x2 grid of these panels — final folded size ~4.25"x5.5".
const PANEL_W = 306;
const PANEL_H = 396;
const PANELS_PER_SHEET = 4; // per side; 8 total per physical (double-sided) sheet
const POCKET_ROW_H = 14;
const POCKET_HEADER_H = 28; // banner (22) + gap (6) before the column header row
const POCKET_COLHDR_H = 10;
const POCKET_BOTTOM_PAD = 6;
// Max athletes a panel can hold at a comfortably readable row height — panels are
// filled to this before starting a new one, rather than spreading entries evenly
// across every panel (which left most panels mostly blank).
const POCKET_MAX_ROWS_PER_PANEL = Math.floor(
  (PANEL_H - POCKET_HEADER_H - POCKET_COLHDR_H - POCKET_BOTTOM_PAD) / POCKET_ROW_H,
);

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

      // Page 1: summary
      this.renderPageHeader(pm, doc, sorted, brand, logoBuffer, eventLocation);
      this.renderSummary(pm, doc, sorted, brand);

      // Subsequent pages: waves packed up to 2-per-page based on measured height
      const avail = pm.PH - pm.HEADER_H - 20;
      let pageWaves: WaveGroup[] = [];
      let usedH = 0;

      const flushPage = () => {
        if (pageWaves.length === 0) return;
        doc.addPage();
        this.renderPageHeader(pm, doc, sorted, brand, logoBuffer, eventLocation);
        for (const w of pageWaves) {
          this.renderWave(pm, doc, w, brand);
          doc.y += 20;
        }
        pageWaves = [];
        usedH = 0;
      };

      for (const wave of sorted.waves) {
        const h = this.measureWaveHeight(wave, pm);
        if (pageWaves.length > 0 && (usedH + h > avail || pageWaves.length >= 2)) {
          flushPage();
        }
        pageWaves.push(wave);
        usedH += h + 20;
      }
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

    const rows: RosterRow[] = schedule.waves.flatMap((wave) =>
      wave.categories.flatMap((cat) =>
        cat.athletes.map((a) => ({
          name: `${a.lastName}, ${a.firstName}`,
          firstName: a.firstName,
          lastName: a.lastName,
          categoryName: cat.categoryName,
          waveMeetingTime: a.logistics?.waveMeetingTime ?? '',
          stagingTime: a.logistics?.stagingTime ?? '',
          raceStart: a.logistics?.raceStart ?? '',
        })),
      ),
    );
    rows.sort((x, y) =>
      x.firstName.localeCompare(y.firstName) || x.lastName.localeCompare(y.lastName),
    );

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
      this.renderRosterTable(pm, doc, rows, brand);

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

    const entries = this.buildPocketEntries(schedule);

    // Fill each panel to capacity before starting the next, rather than spreading
    // entries evenly across every panel (which left most panels mostly blank).
    const panels: PocketEntry[][] = [];
    for (let i = 0; i < entries.length; i += POCKET_MAX_ROWS_PER_PANEL) {
      panels.push(entries.slice(i, i + POCKET_MAX_ROWS_PER_PANEL));
    }
    if (panels.length === 0) panels.push([]);
    const sheets = Math.max(1, Math.ceil(panels.length / (PANELS_PER_SHEET * 2)));
    while (panels.length < sheets * PANELS_PER_SHEET * 2) panels.push([]);

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
  private renderSummary(pm: PageMetrics, doc: PDFKit.PDFDocument, schedule: TeamWaveSchedule, brand: PdfBranding): void {
    // Large title
    doc.fillColor('#000000').fontSize(28).font('Helvetica-Bold');
    doc.text('RIDER PREP &', pm.L, doc.y, { width: pm.CW, align: 'center', lineBreak: false });
    doc.y += 34;
    doc.fontSize(28).font('Helvetica-Bold');
    doc.text('RACE TIMES', pm.L, doc.y, { width: pm.CW, align: 'center', lineBreak: false });
    doc.y += 44;

    // Column layout: Wave | Category | WaveMtg | WarmUp | Stage | RaceStart | Athletes.
    // Fixed columns take up their share; Category takes whatever content width remains.
    const fixedCols = [80, 60, 56, 54, 70, 40];
    const categoryColW = pm.CW - fixedCols.reduce((s, w) => s + w, 0);
    const cols = [fixedCols[0], categoryColW, ...fixedCols.slice(1)];
    const hdrs = ['WAVE', 'CATEGORY', 'WAVE MTG', 'WARM UP', 'STAGE', 'RACE START', '#'];
    const hdrColors = [
      brand.primaryColor, brand.primaryColor,
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.stage,   TIME_COL_COLORS.race,
      TIME_COL_COLORS.athletes,
    ];
    const tableW = cols.reduce((s, w) => s + w, 0);

    // Header row — each column gets its own accent color
    const HDR_H = 28;
    const thY = doc.y;
    let x = pm.L;
    for (let i = 0; i < hdrs.length; i++) {
      doc.rect(x, thY, cols[i], HDR_H).fill(hdrColors[i]);
      const txtColor = i < 2 ? '#FFFFFF' : '#000000';
      const centered = i >= 2;
      doc.fillColor(txtColor).fontSize(9).font('Helvetica-Bold');
      doc.text(hdrs[i], x + 4, thY + 9, { width: cols[i] - 8, lineBreak: false, align: centered ? 'center' : 'left' });
      x += cols[i];
    }
    doc.y = thY + HDR_H;

    // Data rows — height grows to fit however many lines the category list wraps to
    const ROW_FONT_SIZE = 11;
    const ROW_V_PAD = 20;
    const ROW_MIN_H = 42;
    let colorIdx = 0;
    for (const wave of schedule.waves) {
      const firstCat = wave.categories[0];
      const logistics = firstCat?.athletes[0]?.logistics;
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      const athleteCount = wave.categories.reduce((s, c) => s + c.athletes.length, 0);

      doc.font('Helvetica-Bold').fontSize(ROW_FONT_SIZE);
      const categoryH = doc.heightOfString(categoryList, { width: cols[1] - 8 });
      const ROW_H = Math.max(ROW_MIN_H, categoryH + ROW_V_PAD);

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
      x = pm.L;
      for (let i = 0; i < rowVals.length; i++) {
        const bold = i < 2;
        const centered = i >= 2;
        // Only the category column (i=1) may wrap (ROW_H above is sized to fit it);
        // every other column is forced to a single truncated line.
        const allowWrap = i === 1;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(ROW_FONT_SIZE);
        const ty = rowY + (allowWrap ? 8 : (ROW_H - ROW_FONT_SIZE) / 2 - 2);
        if (allowWrap) {
          doc.text(rowVals[i], x + 4, ty, { width: cols[i] - 8, align: centered ? 'center' : 'left' });
        } else {
          this.oneLine(doc, rowVals[i], x + 4, ty, cols[i] - 8, centered ? 'center' : 'left');
        }
        x += cols[i];
      }
      doc.y = rowY + ROW_H;
    }

    // Footer
    doc.fontSize(7).fillColor('#999999').font('Helvetica');
    doc.text(
      `Generated by Switchback  •  ${schedule.totalAthletes} athletes  •  ${schedule.waves.length} waves`,
      pm.L, pm.PH - 26, { lineBreak: false },
    );
  }

  // Category column geometry used by both the measurement pass and renderCategoryBlock —
  // kept in sync so the packing estimate matches what actually gets drawn.
  private static readonly CAT_COL_W = 260;
  private static readonly CAT_COL_GAP = 20;
  private static readonly CAT_HEADER_H = 40;
  private static readonly CAT_COLHDR_H = 16;
  private static readonly CAT_ROW_H = 16;

  private waveColumnCount(wave: WaveGroup, pm: PageMetrics): number {
    const perCol = PdfExportService.CAT_COL_W + PdfExportService.CAT_COL_GAP;
    const maxCols = Math.max(1, Math.floor((pm.CW + PdfExportService.CAT_COL_GAP) / perCol));
    return Math.max(1, Math.min(wave.categories.length, maxCols));
  }

  // ─── Pure height estimate for a wave, used to pack up to 2 waves per page ─
  private measureWaveHeight(wave: WaveGroup, pm: PageMetrics): number {
    const TIMING_BLOCK = 36 + 16 + 24; // banner + label row + value row
    const numCols = this.waveColumnCount(wave, pm);
    const colHeights = new Array(numCols).fill(0);
    wave.categories.forEach((c, i) => {
      colHeights[i % numCols] += PdfExportService.CAT_HEADER_H + PdfExportService.CAT_COLHDR_H
        + PdfExportService.CAT_ROW_H * c.athletes.length + 8;
    });
    return TIMING_BLOCK + Math.max(...colHeights, 0);
  }

  // ─── Individual wave block (banner + timing + category columns) ───────────
  private renderWave(pm: PageMetrics, doc: PDFKit.PDFDocument, wave: WaveGroup, brand: PdfBranding): void {
    const tableW = pm.CW;
    const firstCat = wave.categories[0];
    const logistics = firstCat?.athletes[0]?.logistics;

    // Wave name banner
    const waveY = doc.y;
    doc.rect(pm.L, waveY, tableW, 36).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(19).font('Helvetica-Bold');
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

    // N independent columns (N chosen to use the full page width, up to one per
    // category) — each flows downward on its own, no height coupling between neighbours.
    // The packing math in generateSchedulePdf never admits a wave whose own banner+timing
    // block would start this close to the page bottom, so no page-overflow guard is needed here.
    const COL_W = PdfExportService.CAT_COL_W; // name (156) + staging # (40) + bib (56) + 8px padding
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
    const nameW = 156;
    const stagingW = 40;
    const bibW = 56;
    const HEADER_H = PdfExportService.CAT_HEADER_H;
    const COLHDR_H = PdfExportService.CAT_COLHDR_H;
    const ROW_H = PdfExportService.CAT_ROW_H;
    let y = startY;

    // Two-line category header, vertically centered as a pair within the band
    doc.rect(cx, y, colW, HEADER_H).fill(brand.tertiaryColor);
    const NAME_FONT = 13;
    const SUB_FONT = 9;
    doc.fontSize(NAME_FONT).font('Helvetica-Bold');
    const nameLineH = doc.currentLineHeight();
    doc.fontSize(SUB_FONT).font('Helvetica');
    const subLineH = doc.currentLineHeight();
    const topPad = (HEADER_H - (nameLineH + subLineH)) / 2;

    doc.fillColor('#222222').fontSize(NAME_FONT).font('Helvetica-Bold');
    this.oneLine(doc, `${cat.categoryName}  (${cat.athletes.length})`, cx + 8, y + topPad, colW - 16);
    doc.fillColor('#444444').fontSize(SUB_FONT).font('Helvetica');
    const stageTime = cat.athletes[0]?.logistics?.stagingTime;
    this.oneLine(
      doc,
      `Stage: ${stageTime ? formatTime12Hour(stageTime) : '—'}   Race: ${formatTime12Hour(cat.startTime)}   ${cat.laps ?? '—'} laps`,
      cx + 8, y + topPad + nameLineH, colW - 16,
    );
    y += HEADER_H;

    // Column headers
    doc.rect(cx, y, colW, COLHDR_H).fill('#E0E0E0');
    doc.fillColor('#555555').fontSize(8).font('Helvetica-Bold');
    this.oneLine(doc, 'ATHLETE', cx + 4, y + 4, nameW - 4);
    this.oneLine(doc, 'STG #', cx + nameW + 4, y + 4, stagingW - 4);
    this.oneLine(doc, 'BIB', cx + nameW + stagingW + 8, y + 4, bibW - 4);
    y += COLHDR_H;

    // Athlete rows
    for (let r = 0; r < cat.athletes.length; r++) {
      if (r % 2 === 1) {
        doc.rect(cx, y, colW, ROW_H).fill('#F5F5F5');
      }
      doc.fillColor('#000000').fontSize(9).font('Helvetica');
      const a = cat.athletes[r];
      this.oneLine(doc, `${a.lastName}, ${a.firstName}`, cx + 4, y + 3, nameW - 4);
      this.oneLine(doc, a.callUpNumber ?? '—', cx + nameW + 4, y + 3, stagingW - 4);
      this.oneLine(doc, a.bibNumber, cx + nameW + stagingW + 8, y + 3, bibW - 4);
      y += ROW_H;
    }

    return y;
  }

  // ─── Check-in roster table: N side-by-side columns, sized to fit one page ─
  private renderRosterTable(
    pm: PageMetrics,
    doc: PDFKit.PDFDocument,
    rows: RosterRow[],
    brand: PdfBranding,
  ): void {
    const titleY = doc.y;
    doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold');
    this.oneLine(doc, `CHECK-IN ROSTER  (${rows.length} athletes)`, pm.L, titleY, pm.CW);
    doc.y = titleY + 30;

    const tableTop = doc.y;
    const availH = pm.PH - 20 - tableTop;
    const MAX_COLS = 4;
    const MIN_ROW_H = 11;
    const GAP = 16;
    const HDR_ROW_H = 18;

    let colCount = MAX_COLS;
    let rowH = MIN_ROW_H;
    for (let c = 1; c <= MAX_COLS; c++) {
      const rowsPerCol = Math.ceil(rows.length / c) || 1;
      const candidateRowH = (availH - HDR_ROW_H) / rowsPerCol;
      if (candidateRowH >= MIN_ROW_H || c === MAX_COLS) {
        colCount = c;
        rowH = Math.max(candidateRowH, 8);
        break;
      }
    }

    const fontSize = Math.max(6, Math.min(9, rowH - 3));
    const colW = (pm.CW - (colCount - 1) * GAP) / colCount;
    const rowsPerCol = Math.ceil(rows.length / colCount) || 1;

    // Sub-columns within each roster column, as fractions of colW
    const SUB_COLS: { key: keyof RosterRow | 'box'; label: string; frac: number; align: 'left' | 'center' }[] = [
      { key: 'name', label: 'NAME', frac: 0.36, align: 'left' },
      { key: 'categoryName', label: 'CATEGORY', frac: 0.24, align: 'left' },
      { key: 'waveMeetingTime', label: 'MTG', frac: 0.11, align: 'center' },
      { key: 'stagingTime', label: 'STAGE', frac: 0.11, align: 'center' },
      { key: 'raceStart', label: 'START', frac: 0.11, align: 'center' },
      { key: 'box', label: 'IN', frac: 0.07, align: 'center' },
    ];
    const subW = SUB_COLS.map((sc) => colW * sc.frac);

    for (let c = 0; c < colCount; c++) {
      const colX = pm.L + c * (colW + GAP);
      const colRows = rows.slice(c * rowsPerCol, (c + 1) * rowsPerCol);

      // Column header
      let y = tableTop;
      doc.rect(colX, y, colW, HDR_ROW_H).fill(brand.primaryColor);
      doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
      let hx = colX;
      for (let s = 0; s < SUB_COLS.length; s++) {
        this.oneLine(doc, SUB_COLS[s].label, hx + 2, y + 5, subW[s] - 4, SUB_COLS[s].align);
        hx += subW[s];
      }
      y += HDR_ROW_H;

      // Data rows
      for (let r = 0; r < colRows.length; r++) {
        const row = colRows[r];
        if (r % 2 === 1) doc.rect(colX, y, colW, rowH).fill('#F5F5F5');

        let cx = colX;
        for (let s = 0; s < SUB_COLS.length; s++) {
          const sc = SUB_COLS[s];
          if (sc.key === 'box') {
            const boxSize = Math.min(subW[s] - 4, rowH - 4);
            doc.rect(cx + (subW[s] - boxSize) / 2, y + (rowH - boxSize) / 2, boxSize, boxSize)
              .lineWidth(0.75).stroke('#000000');
          } else {
            const raw = row[sc.key] as string;
            const isTime = sc.key === 'waveMeetingTime' || sc.key === 'stagingTime' || sc.key === 'raceStart';
            const val = isTime ? (raw ? formatTime12Hour(raw) : '—') : raw;
            doc.fillColor('#000000').font('Helvetica').fontSize(fontSize);
            this.oneLine(doc, val, cx + 2, y + 1, subW[s] - 4, sc.align);
          }
          cx += subW[s];
        }
        y += rowH;
      }
    }
  }

  // ─── Pocket printout: flatten + sort athletes by wave order, then first name ─
  private buildPocketEntries(schedule: TeamWaveSchedule): PocketEntry[] {
    const entries: PocketEntry[] = [];
    for (const wave of schedule.waves) {
      const waveEntries: PocketEntry[] = [];
      for (const cat of wave.categories) {
        for (const a of cat.athletes) {
          waveEntries.push({
            waveName: wave.waveName,
            name: `${a.lastName}, ${a.firstName}`,
            firstName: a.firstName,
            lastName: a.lastName,
            categoryName: cat.categoryName,
            startTime: cat.startTime,
          });
        }
      }
      waveEntries.sort((x, y) =>
        x.firstName.localeCompare(y.firstName) || x.lastName.localeCompare(y.lastName),
      );
      entries.push(...waveEntries);
    }
    return entries;
  }

  // ─── One physical page (front or back) of the pocket printout: 2x2 panels ─
  private renderPocketPage(
    doc: PDFKit.PDFDocument,
    panels: PocketEntry[][],
    brand: PdfBranding,
  ): void {
    const positions = [
      { x: 0, y: 0 }, { x: PANEL_W, y: 0 },
      { x: 0, y: PANEL_H }, { x: PANEL_W, y: PANEL_H },
    ];
    for (let i = 0; i < PANELS_PER_SHEET; i++) {
      this.renderPocketPanel(doc, panels[i] ?? [], positions[i].x, positions[i].y, brand);
    }

    // Fold guides at the physical quarter-fold creases
    doc.dash(4, { space: 3 }).lineWidth(0.5).strokeColor('#999999');
    doc.moveTo(PANEL_W, 0).lineTo(PANEL_W, PANEL_H * 2).stroke();
    doc.moveTo(0, PANEL_H).lineTo(PANEL_W * 2, PANEL_H).stroke();
    doc.undash();
  }

  private renderPocketPanel(
    doc: PDFKit.PDFDocument,
    entries: PocketEntry[],
    px: number,
    py: number,
    brand: PdfBranding,
  ): void {
    const PAD = 10;
    const innerW = PANEL_W - PAD * 2;

    const waveNames = [...new Set(entries.map((e) => this.shortWaveLabel(e.waveName)))];
    const headerLabel = this.mergeWaveLabel(waveNames);

    doc.rect(px, py, PANEL_W, 22).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    this.oneLine(doc, headerLabel, px + PAD, py + 6, innerW);

    let y = py + 22 + 6;
    const nameW = innerW * 0.34;
    const waveW = innerW * 0.18;
    const catW = innerW * 0.28;
    const startW = innerW * 0.20;

    doc.fillColor('#555555').fontSize(6).font('Helvetica-Bold');
    this.oneLine(doc, 'NAME', px + PAD, y, nameW);
    this.oneLine(doc, 'WAVE', px + PAD + nameW, y, waveW);
    this.oneLine(doc, 'CAT', px + PAD + nameW + waveW, y, catW);
    this.oneLine(doc, 'START', px + PAD + nameW + waveW + catW, y, startW, 'right');
    y += POCKET_COLHDR_H;

    const rowH = POCKET_ROW_H;
    const fontSize = 9;

    for (const e of entries) {
      doc.fillColor('#000000').font('Helvetica').fontSize(fontSize);
      this.oneLine(doc, e.name, px + PAD, y, nameW);
      this.oneLine(doc, this.shortWaveLabel(e.waveName), px + PAD + nameW, y, waveW);
      this.oneLine(doc, e.categoryName, px + PAD + nameW + waveW, y, catW);
      this.oneLine(doc, formatTime12Hour(e.startTime), px + PAD + nameW + waveW + catW, y, startW, 'right');
      y += rowH;
    }
  }

  // "Wave 7 - JD" -> "Wave 7"
  private shortWaveLabel(waveName: string): string {
    return waveName.replace(/\s*-\s*(HS|JD)$/i, '');
  }

  // Panels can span more than one wave once entries are packed densely rather than
  // spread thin — label that as "Wave 7 and 8" (or "Wave 7, 8 and 9"), not a vague
  // "Multiple Waves", so the reader still knows exactly what's on the panel.
  private mergeWaveLabel(waveNames: string[]): string {
    if (waveNames.length === 0) return '';
    if (waveNames.length === 1) return waveNames[0];

    const parsed = waveNames.map((n) => /^(.*?)(\d+)$/.exec(n));
    const prefixes = new Set(parsed.map((m) => m?.[1]?.trim()));
    if (parsed.every((m): m is RegExpExecArray => m !== null) && prefixes.size === 1) {
      const prefix = parsed[0][1].trim();
      const numbers = parsed.map((m) => m[2]);
      const last = numbers[numbers.length - 1];
      return `${prefix} ${numbers.slice(0, -1).join(', ')} and ${last}`;
    }

    const last = waveNames[waveNames.length - 1];
    return `${waveNames.slice(0, -1).join(', ')} and ${last}`;
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
