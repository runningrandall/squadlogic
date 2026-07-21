import type { RaceEventMetadata, RaceParticipant } from '../domain/race-event.js';

export interface RaceResultPort {
  fetchEventPage(url: string): Promise<string>;
  fetchParticipants(
    eventId: string,
    apiKey: string,
    listName: string,
    server?: string,
    teamName?: string,
  ): Promise<string>;
}

export interface RaceResultParser {
  parseEventMetadata(html: string, eventId: string, sourceUrl: string): RaceEventMetadata;
  discoverApiParams(html: string): { apiKey: string; listName: string } | null;
  parseParticipants(responseBody: string): RaceParticipant[];
}
