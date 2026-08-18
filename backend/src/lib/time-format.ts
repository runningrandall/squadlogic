// Converts a 24-hour "HH:MM" string (as produced by LogisticsService) to 12-hour "h:mm AM/PM"
// for display in exports (PDF, Sheets). Empty/malformed input passes through unchanged.
export function formatTime12Hour(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${minutes} ${period}`;
}
