import type { TeamWaveSchedule, WaveGroup, WaveScheduleEntry } from '../domain/race-event.js';

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

const L = 36;          // left margin
const PW = 612;        // page width
const PH = 792;        // page height
const CW = PW - L * 2; // content width = 540
const HEADER_H = 52;   // compact page header height

export class PdfExportService {
  async generatePdf(
    schedule: TeamWaveSchedule,
    branding?: Partial<PdfBranding>,
    eventLocation?: string,
  ): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const brand = { ...DEFAULT_BRANDING, ...branding };
    const logoBuffer = await this.fetchLogoBuffer(brand.logoUrl);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Page 1: summary
      this.renderPageHeader(doc, schedule, brand, logoBuffer, eventLocation);
      this.renderSummary(doc, schedule, brand);

      // Subsequent pages: one per wave
      for (const wave of schedule.waves) {
        doc.addPage();
        this.renderPageHeader(doc, schedule, brand, logoBuffer, eventLocation);
        this.renderWave(doc, wave, brand);
      }

      doc.end();
    });
  }

  generateFilename(teamName: string, eventDate: string): string {
    const sanitized = teamName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    return `${sanitized}_${eventDate}_schedule.pdf`;
  }

  // ─── Compact page header (repeats on every page) ──────────────────────────
  private renderPageHeader(
    doc: PDFKit.PDFDocument,
    schedule: TeamWaveSchedule,
    brand: PdfBranding,
    logoBuffer: Buffer | null,
    eventLocation?: string,
  ): void {
    doc.rect(0, 0, PW, HEADER_H).fill(brand.primaryColor);

    const logoW = 46;
    const logoGap = logoBuffer ? logoW + 8 : 0;

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, L, 7, { height: 38, fit: [logoW, 38] });
      /* v8 ignore next */
      } catch { /* skip if image format unsupported */ }
    }

    const displayName = brand.teamDisplayName || schedule.teamName;
    const textX = L + logoGap;
    const textW = CW - logoGap;

    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold');
    doc.text(displayName, textX, 10, { width: textW, lineBreak: false });

    doc.fontSize(8).font('Helvetica');
    const subtitle = [schedule.eventName, schedule.eventDate, eventLocation]
      .filter(Boolean).join('  •  ');
    doc.text(subtitle, textX, 34, { width: textW, lineBreak: false });

    doc.y = HEADER_H + 10;
  }

  // ─── Summary page ─────────────────────────────────────────────────────────
  private renderSummary(doc: PDFKit.PDFDocument, schedule: TeamWaveSchedule, brand: PdfBranding): void {
    // Large title
    doc.fillColor('#000000').fontSize(28).font('Helvetica-Bold');
    doc.text('RIDER PREP &', L, doc.y, { width: CW, align: 'center', lineBreak: false });
    doc.y += 34;
    doc.fontSize(28).font('Helvetica-Bold');
    doc.text('RACE TIMES', L, doc.y, { width: CW, align: 'center', lineBreak: false });
    doc.y += 44;

    // Column layout: Wave | Category | WaveMtg | WarmUp | Stage | RaceStart | Athletes
    const cols = [55, 185, 65, 65, 65, 65, 40];
    const hdrs = ['WAVE', 'CATEGORY', 'WAVE MTG', 'WARM UP', 'STAGE', 'RACE START', '#'];
    const hdrColors = [
      brand.primaryColor, brand.primaryColor,
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.stage,   TIME_COL_COLORS.race,
      TIME_COL_COLORS.athletes,
    ];
    const tableW = cols.reduce((s, w) => s + w, 0);

    // Header row — each column gets its own accent color
    const thY = doc.y;
    let x = L;
    for (let i = 0; i < hdrs.length; i++) {
      doc.rect(x, thY, cols[i], 24).fill(hdrColors[i]);
      const txtColor = i < 2 ? '#FFFFFF' : '#000000';
      doc.fillColor(txtColor).fontSize(9).font('Helvetica-Bold');
      doc.text(hdrs[i], x + 4, thY + 7, { width: cols[i] - 8, lineBreak: false });
      x += cols[i];
    }
    doc.y = thY + 24;

    // Data rows
    let colorIdx = 0;
    for (const wave of schedule.waves) {
      const firstCat = wave.categories[0];
      const logistics = firstCat?.athletes[0]?.logistics;
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      const athleteCount = wave.categories.reduce((s, c) => s + c.athletes.length, 0);
      const rowH = 22;
      const rowY = doc.y;
      const rowColor = ROW_COLORS[colorIdx % ROW_COLORS.length];
      colorIdx++;

      doc.rect(L, rowY, tableW, rowH).fill(rowColor);
      doc.fillColor('#000000');

      const rowVals = [
        wave.waveName,
        this.truncate(categoryList, cols[1] - 8, 10),
        logistics?.waveMeetingTime ?? '—',
        logistics?.warmupStart ?? '—',
        firstCat?.stageTime ?? '—',
        firstCat?.startTime ?? '—',
        String(athleteCount),
      ];
      x = L;
      for (let i = 0; i < rowVals.length; i++) {
        const bold = i < 2;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
        doc.text(rowVals[i], x + 4, rowY + 6, { width: cols[i] - 8, lineBreak: false });
        x += cols[i];
      }
      doc.y = rowY + rowH;
    }

    // Footer
    doc.fontSize(7).fillColor('#999999').font('Helvetica');
    doc.text(
      `Generated by Switchback  •  ${schedule.totalAthletes} athletes  •  ${schedule.waves.length} waves`,
      L, PH - 26, { lineBreak: false },
    );
  }

  // ─── Individual wave page ─────────────────────────────────────────────────
  private renderWave(doc: PDFKit.PDFDocument, wave: WaveGroup, brand: PdfBranding): void {
    const tableW = CW;
    const firstCat = wave.categories[0];
    const logistics = firstCat?.athletes[0]?.logistics;

    // Wave name banner
    const waveY = doc.y;
    doc.rect(L, waveY, tableW, 32).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(17).font('Helvetica-Bold');
    doc.text(wave.waveName, L + 10, waveY + 8, { width: tableW - 20, lineBreak: false });
    doc.y = waveY + 32;

    // Timing block: label row + value row spanning full width
    const timeCols = [CW / 5, CW / 5, CW / 5, CW / 5, CW / 5];
    const timeLabels = ['WAVE MEETING', 'WU START', 'WU END', 'STAGE', 'RACE START'];
    const timeColBg = [
      TIME_COL_COLORS.waveMtg, TIME_COL_COLORS.warmUp,
      TIME_COL_COLORS.warmUp,  TIME_COL_COLORS.stage,
      TIME_COL_COLORS.race,
    ];
    const timeVals = [
      logistics?.waveMeetingTime ?? '—',
      logistics?.warmupStart ?? '—',
      logistics?.warmupEnd ?? '—',
      firstCat?.stageTime ?? '—',
      firstCat?.startTime ?? '—',
    ];

    // Label row
    const lblY = doc.y;
    let x = L;
    for (let i = 0; i < timeLabels.length; i++) {
      doc.rect(x, lblY, timeCols[i], 15).fill(timeColBg[i]);
      doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
      doc.text(timeLabels[i], x + 4, lblY + 4, { width: timeCols[i] - 8, lineBreak: false });
      x += timeCols[i];
    }
    doc.y = lblY + 15;

    // Value row
    const valY = doc.y;
    x = L;
    for (let i = 0; i < timeVals.length; i++) {
      doc.rect(x, valY, timeCols[i], 22).fill(i % 2 === 0 ? '#FFFFFF' : brand.tertiaryColor);
      doc.fillColor('#000000').fontSize(13).font('Helvetica-Bold');
      doc.text(timeVals[i], x + 4, valY + 4, { width: timeCols[i] - 8, lineBreak: false });
      x += timeCols[i];
    }
    doc.y = valY + 26;

    // Two independent columns: even-indexed categories on left, odd on right.
    // Each column flows downward on its own — no height coupling between neighbours.
    const COL_W = 260; // name (196) + bib (56) + 8px padding
    const COL_GAP = 20;
    const R = L + COL_W + COL_GAP;

    const leftCats = wave.categories.filter((_, i) => i % 2 === 0);
    const rightCats = wave.categories.filter((_, i) => i % 2 === 1);

    if (doc.y > PH - 80) {
      doc.addPage();
      doc.y = HEADER_H + 10;
    }

    const colStartY = doc.y;
    let leftY = colStartY;
    let rightY = colStartY;

    for (const cat of leftCats) {
      leftY = this.renderCategoryBlock(doc, cat, L, leftY, COL_W, brand);
      leftY += 8;
    }

    for (const cat of rightCats) {
      rightY = this.renderCategoryBlock(doc, cat, R, rightY, COL_W, brand);
      rightY += 8;
    }

    doc.y = Math.max(leftY, rightY);
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
    const nameW = 196;
    const bibW = 56;
    let y = startY;

    // Two-line category header
    doc.rect(cx, y, colW, 32).fill(brand.tertiaryColor);
    doc.fillColor('#222222').fontSize(11).font('Helvetica-Bold');
    doc.text(`${cat.categoryName}  (${cat.athletes.length})`, cx + 8, y + 5, { width: colW - 16, lineBreak: false });
    doc.fillColor('#444444').fontSize(8).font('Helvetica');
    doc.text(
      `Stage: ${cat.stageTime}   Race: ${cat.startTime}   ${cat.laps ?? '—'} laps`,
      cx + 8, y + 20, { width: colW - 16, lineBreak: false },
    );
    y += 32;

    // Column headers
    doc.rect(cx, y, colW, 14).fill('#E0E0E0');
    doc.fillColor('#555555').fontSize(7).font('Helvetica-Bold');
    doc.text('ATHLETE', cx + 4, y + 4, { width: nameW - 4, lineBreak: false });
    doc.text('BIB', cx + nameW + 8, y + 4, { width: bibW - 4, lineBreak: false });
    y += 14;

    // Athlete rows
    for (let r = 0; r < cat.athletes.length; r++) {
      if (r % 2 === 1) {
        doc.rect(cx, y, colW, 13).fill('#F5F5F5');
      }
      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      const a = cat.athletes[r];
      doc.text(`${a.lastName}, ${a.firstName}`, cx + 4, y + 2, { width: nameW - 4, lineBreak: false });
      doc.text(a.bibNumber, cx + nameW + 8, y + 2, { width: bibW - 4, lineBreak: false });
      y += 13;
    }

    return y;
  }

  // Truncate text so it fits within pixelWidth at the given fontSize (Helvetica avg ~0.55em).
  private truncate(text: string, pixelWidth: number, fontSize: number): string {
    const avgCharWidth = fontSize * 0.55;
    const maxChars = Math.floor(pixelWidth / avgCharWidth);
    return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + '…';
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
