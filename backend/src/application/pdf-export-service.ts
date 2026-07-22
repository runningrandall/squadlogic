import type { TeamWaveSchedule, WaveGroup } from '../domain/race-event.js';

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
      doc.rect(x, thY, cols[i], 20).fill(hdrColors[i]);
      const txtColor = i < 2 ? '#FFFFFF' : '#000000';
      doc.fillColor(txtColor).fontSize(7).font('Helvetica-Bold');
      doc.text(hdrs[i], x + 4, thY + 6, { width: cols[i] - 8, lineBreak: false });
      x += cols[i];
    }
    doc.y = thY + 20;

    // Data rows
    doc.fontSize(8).font('Helvetica');
    let colorIdx = 0;
    for (const wave of schedule.waves) {
      const firstCat = wave.categories[0];
      const logistics = firstCat?.athletes[0]?.logistics;
      const categoryList = wave.categories.map((c) => c.categoryName).join(' / ');
      const athleteCount = wave.categories.reduce((s, c) => s + c.athletes.length, 0);
      const rowH = 18;
      const rowY = doc.y;
      const rowColor = ROW_COLORS[colorIdx % ROW_COLORS.length];
      colorIdx++;

      doc.rect(L, rowY, tableW, rowH).fill(rowColor);
      doc.fillColor('#000000');

      const rowVals = [
        wave.waveName,
        categoryList,
        logistics?.waveMeetingTime ?? '—',
        logistics?.warmupStart ?? '—',
        firstCat?.stageTime ?? '—',
        firstCat?.startTime ?? '—',
        String(athleteCount),
      ];
      x = L;
      for (let i = 0; i < rowVals.length; i++) {
        const bold = i < 2;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        doc.text(rowVals[i], x + 4, rowY + 5, { width: cols[i] - 8, lineBreak: false });
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
    doc.rect(L, waveY, tableW, 26).fill(brand.primaryColor);
    doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold');
    doc.text(wave.waveName, L + 8, waveY + 7, { width: tableW - 16, lineBreak: false });
    doc.y = waveY + 26;

    // Timing block: label row + value row spanning full width
    const timeCols = [CW / 5, CW / 5, CW / 5, CW / 5, CW / 5];
    const timeLabels = ['WAVE MEETING', 'WU START', 'WU END', 'STAGE', 'RACE START'];
    const timeColBg  = [
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
      doc.rect(x, lblY, timeCols[i], 14).fill(timeColBg[i]);
      doc.fillColor('#000000').fontSize(6).font('Helvetica-Bold');
      doc.text(timeLabels[i], x + 4, lblY + 4, { width: timeCols[i] - 8, lineBreak: false });
      x += timeCols[i];
    }
    doc.y = lblY + 14;

    // Value row
    const valY = doc.y;
    x = L;
    for (let i = 0; i < timeVals.length; i++) {
      doc.rect(x, valY, timeCols[i], 18).fill(i % 2 === 0 ? '#FFFFFF' : brand.tertiaryColor);
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
      doc.text(timeVals[i], x + 4, valY + 3, { width: timeCols[i] - 8, lineBreak: false });
      x += timeCols[i];
    }
    doc.y = valY + 22;

    // Athlete table: Name + Bib only
    const nameCW = 300;
    const bibCW  = 80;

    for (const cat of wave.categories) {
      if (doc.y > PH - 80) {
        doc.addPage();
        doc.y = HEADER_H + 10;
      }

      // Category header: stage time first, then race start
      const catY = doc.y;
      doc.rect(L, catY, tableW, 18).fill(brand.tertiaryColor);
      doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
      const catLabel = `${cat.categoryName}   Stage: ${cat.stageTime}   Race: ${cat.startTime}   ${cat.laps ?? '—'} laps`;
      doc.text(catLabel, L + 6, catY + 5, { width: tableW - 12, lineBreak: false });
      doc.y = catY + 18;

      // Column headers
      const colHdrY = doc.y;
      doc.rect(L, colHdrY, nameCW + bibCW, 13).fill('#E0E0E0');
      doc.fillColor('#555555').fontSize(7).font('Helvetica-Bold');
      doc.text('ATHLETE', L + 4, colHdrY + 3, { width: nameCW - 8, lineBreak: false });
      doc.text('BIB', L + nameCW + 4, colHdrY + 3, { width: bibCW - 8, lineBreak: false });
      doc.y = colHdrY + 13;

      // Athlete rows
      let rowIdx = 0;
      for (const athlete of cat.athletes) {
        if (doc.y > PH - 40) {
          doc.addPage();
          doc.y = HEADER_H + 10;
        }
        const rowY = doc.y;
        if (rowIdx % 2 === 1) {
          doc.rect(L, rowY, nameCW + bibCW, 13).fill('#F5F5F5');
        }
        doc.fillColor('#000000').fontSize(8).font('Helvetica');
        doc.text(`${athlete.lastName}, ${athlete.firstName}`, L + 4, rowY + 2, { width: nameCW - 8, lineBreak: false });
        doc.text(athlete.bibNumber, L + nameCW + 4, rowY + 2, { width: bibCW - 8, lineBreak: false });
        doc.y = rowY + 13;
        rowIdx++;
      }
      doc.y += 6;
    }
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
