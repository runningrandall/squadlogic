import { randomUUID } from 'node:crypto';
import type { RaceEventMetadata, RaceParticipant } from '../domain/race-event.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import { parseCallUpList } from '../adapters/callup-list-parser.js';
import { parseCallUpListPdf } from '../adapters/callup-list-pdf-parser.js';
import { detectCallUpListFormat } from '../adapters/callup-list-format.js';
import { ValidationError } from '../lib/errors.js';

export interface CategorySchedule {
  stageTime: string;
  startTime: string;
}

export interface CallUpListImportResult {
  metadata: RaceEventMetadata;
  participants: RaceParticipant[];
  categorySchedule: Record<string, CategorySchedule>;
}

export class CallUpListService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async importCallUpList(
    buffer: Buffer,
    overrides?: { eventName?: string; eventLocation?: string },
  ): Promise<CallUpListImportResult> {
    const format = detectCallUpListFormat(buffer);
    if (!format) {
      throw new ValidationError('Unsupported call-up list file. Upload a .xlsx or .pdf file.');
    }
    const parsed = format === 'pdf' ? await parseCallUpListPdf(buffer) : await parseCallUpList(buffer);

    const participants: RaceParticipant[] = [];
    const categorySchedule: Record<string, CategorySchedule> = {};

    for (const category of parsed.categories) {
      categorySchedule[category.categoryName] = {
        stageTime: category.stageTime,
        startTime: category.startTime,
      };
      participants.push(...category.participants);
    }

    const teams = [...new Set(participants.map((p) => p.team).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

    const eventId = randomUUID();
    const metadata: RaceEventMetadata = {
      eventName: overrides?.eventName ?? 'Race Event',
      eventDate: parsed.eventDate,
      eventLocation: overrides?.eventLocation ?? '',
      eventId,
      sourceUrl: '',
      teams,
    };

    // Publish domain event (fire-and-forget) — failure does not block the response
    this.eventPublisher
      .publish('RaceEventImported', {
        eventId,
        eventName: metadata.eventName,
        participantCount: participants.length,
        teamCount: teams.length,
      })
      .catch(() => {});

    return { metadata, participants, categorySchedule };
  }

  getTeamList(
    teams: string[],
    participants: RaceParticipant[],
  ): { name: string; count: number }[] {
    const countMap = new Map<string, number>();

    for (const p of participants) {
      if (!p.team) continue;
      countMap.set(p.team, (countMap.get(p.team) ?? 0) + 1);
    }

    // Show ALL registered teams — some may have 0 participants if data hasn't been uploaded yet
    return teams
      .map((name) => ({ name, count: countMap.get(name) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
}
