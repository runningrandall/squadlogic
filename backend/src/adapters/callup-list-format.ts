// Shared parsing helpers for the league's call-up-list export format (used by both the
// .xlsx and .pdf adapters, which otherwise duplicate this exact text-format logic).

// e.g. "STAGING TIME: 09/20/2025 @ 7:45 AM" / "START TIME: 09/20/2025 @ 8:00 AM"
export const TIME_LINE_REGEX =
  /^(STAGING TIME|START TIME):\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*@\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function to24Hour(hour: number, minute: number, meridiem: string): string {
  let h = hour % 12;
  if (meridiem.toUpperCase() === 'PM') h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function toIsoDate(month: number, day: number, year: number): string {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export type CallUpListFileFormat = 'xlsx' | 'pdf';

// Detect format from magic bytes rather than trusting a filename/content-type, since the
// upload is just base64 file data. PDF: "%PDF". XLSX (a ZIP/OOXML container): "PK".
export function detectCallUpListFormat(buffer: Buffer): CallUpListFileFormat | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) return 'xlsx';
  return null;
}
