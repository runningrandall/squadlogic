import ExcelJS from 'exceljs';
import type { RaceParticipant } from '../domain/race-event.js';

export interface CallUpCategorySchedule {
  categoryName: string;
  stageTime: string;
  startTime: string;
  participants: RaceParticipant[];
}

export interface CallUpListImportResult {
  eventDate: string;
  categories: CallUpCategorySchedule[];
}

// e.g. "STAGING TIME: 09/20/2025 @ 7:45 AM" / "START TIME: 09/20/2025 @ 8:00 AM"
const TIME_LINE_REGEX =
  /^(STAGING TIME|START TIME):\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*@\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function to24Hour(hour: number, minute: number, meridiem: string): string {
  let h = hour % 12;
  if (meridiem.toUpperCase() === 'PM') h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function toIsoDate(month: number, day: number, year: number): string {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const v = value as { text?: unknown; richText?: Array<{ text?: unknown }>; result?: unknown };
    if (Array.isArray(v.richText)) {
      return v.richText.map((r) => String(r.text ?? '')).join('').trim();
    }
    if ('text' in v) return String(v.text ?? '').trim();
    if ('result' in v) return String(v.result ?? '').trim();
    return '';
  }
  return String(value).trim();
}

export async function parseCallUpList(buffer: Buffer): Promise<CallUpListImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Uploaded file has no worksheets.');
  }

  const categories: CallUpCategorySchedule[] = [];
  let current: CallUpCategorySchedule | null = null;
  let eventDate = '';

  worksheet.eachRow((row) => {
    const colA = cellText(row.getCell(1).value);
    const colB = cellText(row.getCell(2).value);

    if (!colA && !colB) return; // fully blank row

    const timeMatch = colA.match(TIME_LINE_REGEX);
    if (timeMatch) {
      const [, label, month, day, year, hour, minute, meridiem] = timeMatch;
      const time = to24Hour(Number(hour), Number(minute), meridiem);
      if (!eventDate) eventDate = toIsoDate(Number(month), Number(day), Number(year));
      if (current) {
        if (label.toUpperCase() === 'STAGING TIME') current.stageTime = time;
        else current.startTime = time;
      }
      return;
    }

    const callUpNumber = Number(colB);
    const isDataRow = colB !== '' && Number.isInteger(callUpNumber) && callUpNumber > 0;

    if (!isDataRow) {
      // Category header row — skip the literal "STAGING / CALLUP / PLATE / ..." table header row.
      if (colA && colA.toUpperCase() !== 'STAGING') {
        current = { categoryName: colA, stageTime: '', startTime: '', participants: [] };
        categories.push(current);
      }
      return;
    }

    if (!current) return; // data row before any category header — ignore defensively

    const rawName = cellText(row.getCell(5).value);
    const parts = rawName.split(/\s+/).filter(Boolean);
    const lastName = toTitleCase(parts.pop() ?? '');
    const firstName = toTitleCase(parts.join(' '));
    const team = cellText(row.getCell(8).value);
    const category = cellText(row.getCell(9).value) || current.categoryName;
    const bibNumber = cellText(row.getCell(3).value);

    if (!firstName || !lastName || !team) return;

    current.participants.push({
      firstName,
      lastName,
      team,
      category,
      bibNumber,
      callUpNumber: colB,
    });
  });

  const nonEmpty = categories.filter((c) => c.participants.length > 0);
  if (nonEmpty.length === 0) {
    throw new Error('No categories found in the call-up list. Check the file format.');
  }

  return { eventDate, categories: nonEmpty };
}
