import type { RaceParticipant } from '../domain/race-event.js';
import { TIME_LINE_REGEX, to24Hour, toIsoDate, toTitleCase } from './callup-list-format.js';
import type { CallUpCategorySchedule, CallUpListImportResult } from './callup-list-parser.js';

// The league's PDF export repeats an event-specific title line ending in "Callup List" and a
// fixed column-header row on every page — neither is category data.
const TITLE_LINE_REGEX = /Callup List$/i;
const COLUMN_HEADER_LINE = 'STAGING CALLUP PLATE Region NAME DIV GRD TEAM CONTEST';
const RECORDS_COUNT_REGEX = /^Number of records:/i;
const PAGE_NUMBER_REGEX = /^\d+$/;

// e.g. "7:45 AM 1 2636 5 KIPTON PILLING 1 10 Lehi HS JV B Boys"
const DATA_PREFIX_REGEX = /^(\d{1,2}:\d{2}\s*[AP]M)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/;
const NAME_DIV_GRD_TEAM_REGEX = /^(.+?)\s+([1-9])\s+(7|8|9|10|11|12)\s+(.+)$/;

async function extractLines(buffer: Buffer): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const lines: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const str = item.str.trim();
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], str });
    }

    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .trim();
      if (line) lines.push(line);
    }
  }
  return lines;
}

export async function parseCallUpListPdf(buffer: Buffer): Promise<CallUpListImportResult> {
  const lines = await extractLines(buffer);

  const categories: CallUpCategorySchedule[] = [];
  let current: CallUpCategorySchedule | null = null;
  let eventDate = '';

  for (const line of lines) {
    if (
      TITLE_LINE_REGEX.test(line) ||
      line === COLUMN_HEADER_LINE ||
      RECORDS_COUNT_REGEX.test(line) ||
      PAGE_NUMBER_REGEX.test(line)
    ) {
      continue;
    }

    const timeMatch = line.match(TIME_LINE_REGEX);
    if (timeMatch) {
      const [, label, month, day, year, hour, minute, meridiem] = timeMatch;
      const time = to24Hour(Number(hour), Number(minute), meridiem);
      if (!eventDate) eventDate = toIsoDate(Number(month), Number(day), Number(year));
      if (current) {
        if (label.toUpperCase() === 'STAGING TIME') current.stageTime = time;
        else current.startTime = time;
      }
      continue;
    }

    const dataMatch = line.match(DATA_PREFIX_REGEX);
    if (!dataMatch) {
      // Anything else on its own line is a new category header.
      current = { categoryName: line, stageTime: '', startTime: '', participants: [] };
      categories.push(current);
      continue;
    }

    if (!current) continue; // data row before any category header — ignore defensively

    const [, , callUpNumber, bibNumber, , rest] = dataMatch;
    const body = rest.endsWith(current.categoryName)
      ? rest.slice(0, rest.length - current.categoryName.length).trim()
      : null;
    if (body === null) continue; // category name in the row doesn't match the current header — skip

    const nameMatch = body.match(NAME_DIV_GRD_TEAM_REGEX);
    if (!nameMatch) continue;

    const [, rawName, , , team] = nameMatch;
    const parts = rawName.trim().split(/\s+/).filter(Boolean);
    const lastName = toTitleCase(parts.pop() ?? '');
    const firstName = toTitleCase(parts.join(' '));

    if (!firstName || !lastName || !team) continue;

    const participant: RaceParticipant = {
      firstName,
      lastName,
      team: team.trim(),
      category: current.categoryName,
      bibNumber,
      callUpNumber,
    };
    current.participants.push(participant);
  }

  const nonEmpty = categories.filter((c) => c.participants.length > 0);
  if (nonEmpty.length === 0) {
    throw new Error('No categories found in the call-up list. Check the file format.');
  }

  return { eventDate, categories: nonEmpty };
}
