import type { RaceResultParser } from '../ports/raceresult-port.js';
import type { RaceEventMetadata, RaceParticipant } from '../domain/race-event.js';

export class RaceResultHtmlParser implements RaceResultParser {
  parseEventMetadata(
    html: string,
    eventId: string,
    sourceUrl: string,
  ): RaceEventMetadata {
    const jsonLd = this.extractJsonLd(html);
    const teams = this.extractTeams(html);

    const eventName = String(jsonLd?.name ?? '');
    const eventDate = this.normalizeDate(String(jsonLd?.startDate ?? ''));
    const eventLocation = this.extractLocation(jsonLd);

    const missingFields: string[] = [];
    if (!eventName) missingFields.push('eventName');
    if (!eventDate) missingFields.push('eventDate');
    if (!eventLocation) missingFields.push('eventLocation');

    if (missingFields.length > 0) {
      throw new Error(
        `Parse error: missing required metadata fields: ${missingFields.join(', ')}`,
      );
    }

    return {
      eventName,
      eventDate,
      eventLocation,
      eventId,
      sourceUrl,
      teams,
    };
  }

  discoverApiParams(html: string): { apiKey: string; listName: string } | null {
    // Look for the RRPublish constructor call to extract the event configuration
    // Pattern: new RRPublish(element, eventId, 'participants', ...)
    // The API key is typically found in script blocks or embedded data
    const keyMatch = html.match(
      /["']([a-f0-9]{32,})["']/i,
    );

    // Look for listname in the page content
    const listNameMatch = html.match(
      /listname[=:]\s*["']([^"']+)["']/i,
    );

    if (!keyMatch) return null;

    return {
      apiKey: keyMatch[1],
      listName: listNameMatch ? listNameMatch[1] : '',
    };
  }

  parseParticipants(responseBody: string): RaceParticipant[] {
    const participants: RaceParticipant[] = [];
    const seen = new Map<string, number>();

    // RaceResult API returns HTML table rows or JSON-like data
    // Parse rows from the response
    const rows = this.extractParticipantRows(responseBody);

    for (const row of rows) {
      const key = `${row.firstName}|${row.lastName}|${row.team}`;
      const completeness = [row.firstName, row.lastName, row.team, row.category, row.bibNumber]
        .filter((f) => f !== '').length;

      const existingIndex = seen.get(key);
      if (existingIndex !== undefined) {
        const existing = participants[existingIndex];
        const existingCompleteness = [
          existing.firstName, existing.lastName, existing.team,
          existing.category, existing.bibNumber,
        ].filter((f) => f !== '').length;

        if (completeness > existingCompleteness) {
          participants[existingIndex] = row;
        }
        continue;
      }

      seen.set(key, participants.length);
      participants.push(row);
    }

    return participants;
  }

  private extractJsonLd(html: string): Record<string, unknown> | null {
    const match = html.match(
      /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    if (!match) return null;

    try {
      return JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private extractTeams(html: string): string[] {
    // Extract team options from the ListControl select element
    const selectMatch = html.match(
      /<select[^>]*>([\s\S]*?)<\/select>/i,
    );
    if (!selectMatch) return [];

    const options: string[] = [];
    const optionRegex = /<option[^>]*>([^<]+)<\/option>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(selectMatch[1])) !== null) {
      const value = optMatch[1].trim();
      if (value && value !== 'All' && value !== '--') {
        options.push(value);
      }
    }
    return options;
  }

  private normalizeDate(dateStr: string): string {
    if (!dateStr) return '';

    // If already ISO format (YYYY-MM-DD), return as-is
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }

    // Parse MM/DD/YYYY format
    const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try Date.parse as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }

    return '';
  }

  private extractLocation(
    jsonLd: Record<string, unknown> | null,
  ): string {
    if (!jsonLd?.location) return '';

    const location = jsonLd.location as Record<string, unknown>;
    if (typeof location === 'string') return location;

    const address = location.address as Record<string, unknown> | undefined;
    if (address) {
      const parts = [
        address.addressLocality,
        address.addressRegion,
      ].filter(Boolean);
      return parts.join(', ');
    }

    return (location.name as string) ?? '';
  }

  private extractParticipantRows(body: string): RaceParticipant[] {
    const participants: RaceParticipant[] = [];

    // Try JSON format first
    try {
      const data = JSON.parse(body);

      // Handle RaceResult API nested format:
      // { data: { "#N_Team": { "#N_Category": [[row_values], ...] } }, DataFields: [...], ... }
      if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && 'DataFields' in data) {
        return this.parseRaceResultNestedFormat(
          data as { data: unknown; DataFields: string[] },
        );
      }

      if (Array.isArray(data)) {
        for (const row of data) {
          participants.push({
            firstName: String(row.firstName ?? row.Firstname ?? row.first_name ?? ''),
            lastName: String(row.lastName ?? row.Lastname ?? row.last_name ?? ''),
            team: String(row.team ?? row.Team ?? row.club ?? row.Club ?? ''),
            category: String(row.category ?? row.Category ?? row.contest ?? row.Contest ?? ''),
            bibNumber: String(row.bib ?? row.Bib ?? row.bibNumber ?? row.BibNumber ?? ''),
          });
        }
        return participants;
      }
    } catch {
      // Not JSON, try HTML table parsing
    }

    // Parse HTML table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(body)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
      }

      // Skip header rows and empty rows
      if (cells.length >= 3) {
        participants.push({
          bibNumber: cells[0] ?? '',
          firstName: cells[1] ?? '',
          lastName: cells[2] ?? '',
          team: cells[3] ?? '',
          category: cells[4] ?? '',
        });
      }
    }

    return participants;
  }

  private parseRaceResultNestedFormat(apiResponse: {
    data: unknown;
    DataFields: string[];
  }): RaceParticipant[] {
    const participants: RaceParticipant[] = [];
    const fields = apiResponse.DataFields;
    const data = apiResponse.data as Record<string, unknown>;

    // Locate standard field indices by name
    const bibIdx = fields.findIndex((f) => /^BIB$/i.test(f));
    const firstIdx = fields.findIndex((f) => /^Firstname$/i.test(f));
    const lastIdx = fields.findIndex((f) => /^Lastname$/i.test(f));
    const clubIdx = fields.findIndex((f) => /^Club$/i.test(f));
    const contestNameIdx = fields.findIndex((f) =>
      /^CONTEST\.NAME$/i.test(f) || /^Contest$/i.test(f),
    );
    // Fallback: a combined name field (e.g. DisplayName formula in CPT reports)
    const nameIdx =
      firstIdx === -1 || lastIdx === -1
        ? fields.findIndex((f) => /DisplayName/i.test(f))
        : -1;

    for (const [teamKey, teamData] of Object.entries(data)) {
      // Strip "#N_" prefix: "#1_Lehi HS" → "Lehi HS"
      const teamName = teamKey.replace(/^#\d+_/, '');

      if (typeof teamData !== 'object' || teamData === null) continue;

      for (const [catKey, catRows] of Object.entries(
        teamData as Record<string, unknown>,
      )) {
        const categoryName = catKey.replace(/^#\d+_/, '');

        if (!Array.isArray(catRows)) continue;

        for (const row of catRows) {
          if (!Array.isArray(row)) continue;

          let firstName = '';
          let lastName = '';

          if (firstIdx !== -1 && lastIdx !== -1) {
            firstName = String(row[firstIdx] ?? '');
            lastName = String(row[lastIdx] ?? '');
          } else if (nameIdx !== -1) {
            // Split combined "FIRST LAST" display name on first space
            const fullName = String(row[nameIdx] ?? '').trim();
            const spaceAt = fullName.indexOf(' ');
            firstName = spaceAt !== -1 ? fullName.slice(0, spaceAt) : fullName;
            lastName = spaceAt !== -1 ? fullName.slice(spaceAt + 1) : '';
          }

          const team = clubIdx !== -1 ? String(row[clubIdx] ?? '') : teamName;
          const category =
            contestNameIdx !== -1
              ? String(row[contestNameIdx] ?? '')
              : categoryName;
          const bibNumber = bibIdx !== -1 ? String(row[bibIdx] ?? '') : '';

          participants.push({ firstName, lastName, team, category, bibNumber });
        }
      }
    }

    return participants;
  }
}
