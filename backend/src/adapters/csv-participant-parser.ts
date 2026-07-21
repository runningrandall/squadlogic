import type { RaceParticipant } from '../domain/race-event.js';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseCsvParticipants(csvText: string, teamName: string): RaceParticipant[] {
  const participants: RaceParticipant[] = [];
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim());

    // Blank row or category header row (col[0] non-empty) — skip
    if (!cols[1]) continue;

    // Athlete row: col[0] empty, col[1] = name
    const rawName = cols[1].replace(/^\*/, '').trim();
    if (!rawName) continue;

    const parts = rawName.split(/\s+/);
    /* v8 ignore next */
    const lastName = toTitleCase(parts.pop() ?? '');
    const firstName = toTitleCase(parts.join(' '));
    const category = cols[5]?.trim() ?? '';

    if (!firstName || !lastName || !category) continue;

    participants.push({ firstName, lastName, team: teamName, category, bibNumber: '' });
  }

  return participants;
}
