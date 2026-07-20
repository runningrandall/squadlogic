import type { RaceEventMetadata, RaceParticipant } from '../domain/race-event.js';
import type { RaceResultParser } from '../ports/raceresult-port.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { RaceResultClient } from '../adapters/raceresult-client.js';

export interface RaceEventImportResult {
  metadata: RaceEventMetadata;
  participants: RaceParticipant[];
}

export class RaceEventService {
  constructor(
    private readonly client: RaceResultClient,
    private readonly parser: RaceResultParser,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async importEvent(
    url: string,
    eventId: string,
  ): Promise<RaceEventImportResult> {
    // Phase 1: Fetch config from the RaceResult config endpoint (returns key, server, lists)
    const config = await this.client.fetchEventConfig(eventId);

    // Phase 2: Fetch the HTML page for teams dropdown and additional metadata
    const html = await this.client.fetchEventPage(url);
    const metadata = this.parser.parseEventMetadata(html, eventId, url);

    // Override event name from config if available (more reliable than HTML scraping)
    if (config.eventname) {
      metadata.eventName = config.eventname;
    }

    // Phase 3: Find the active list and fetch participants
    const activeList = config.TabConfig?.Lists?.find((l) => l.Mode !== 'hidden');
    const listName = activeList?.Name ?? '';

    const responseBody = await this.client.fetchParticipants(
      eventId,
      config.key,
      listName,
      config.server,
    );
    const participants = this.parser.parseParticipants(responseBody);

    if (participants.length === 0) {
      throw new Error('No participants found for this event.');
    }

    // Prefer groupFilters (Type 1 = club/team) from config — it has the full registered team list
    // even when the participants endpoint only returns data for some teams.
    const teamFilter = config.groupFilters?.find((f) => f.Type === 1);
    if (teamFilter?.Values && teamFilter.Values.length > 0) {
      metadata.teams = teamFilter.Values
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    } else {
      // Fallback: derive from participants when groupFilters is absent
      const uniqueTeams = [...new Set(participants.map((p) => p.team).filter(Boolean))];
      metadata.teams = uniqueTeams.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    // Publish domain event (fire-and-forget)
    this.eventPublisher
      .publish('RaceEventImported', {
        eventId,
        eventName: metadata.eventName,
        participantCount: participants.length,
        teamCount: metadata.teams.length,
      })
      .catch(() => {
        // Failed event publication does not block the response
      });

    return { metadata, participants };
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
