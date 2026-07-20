import { describe, it, expect } from 'vitest';
import { RaceResultHtmlParser } from '../raceresult-parser.js';

const parser = new RaceResultHtmlParser();

const validHtml = `
<html>
<head>
<script type="application/ld+json">
{
  "name": "UTAH HS MTB 2026",
  "startDate": "08/02/2026",
  "location": {
    "name": "Venue",
    "address": {
      "addressLocality": "American Fork",
      "addressRegion": "UT"
    }
  }
}
</script>
</head>
<body>
<select>
  <option>All</option>
  <option>Brighton Blazers</option>
  <option>Alpine Riders</option>
</select>
</body>
</html>
`;

describe('RaceResultHtmlParser', () => {
  describe('parseEventMetadata', () => {
    it('TC-008: extracts eventName, eventDate, eventLocation from valid page', () => {
      const result = parser.parseEventMetadata(validHtml, '411620', 'https://my.raceresult.com/411620/');
      expect(result.eventName).toBe('UTAH HS MTB 2026');
      expect(result.eventDate).toBe('2026-08-02');
      expect(result.eventLocation).toBe('American Fork, UT');
      expect(result.eventId).toBe('411620');
    });

    it('TC-009: normalizes date format MM/DD/YYYY to ISO 8601', () => {
      const result = parser.parseEventMetadata(validHtml, '411620', 'https://my.raceresult.com/411620/');
      expect(result.eventDate).toBe('2026-08-02');
    });

    it('TC-012: throws parse error when eventName is missing', () => {
      const htmlNoName = `
        <html><head>
        <script type="application/ld+json">{"startDate":"2026-08-02","location":{"address":{"addressLocality":"Test","addressRegion":"UT"}}}</script>
        </head></html>
      `;
      expect(() =>
        parser.parseEventMetadata(htmlNoName, '411620', 'https://my.raceresult.com/411620/'),
      ).toThrow('missing required metadata fields: eventName');
    });

    it('TC-013: returns empty teams array when no select element exists', () => {
      const htmlNoSelect = `
        <html><head>
        <script type="application/ld+json">{"name":"Test","startDate":"2026-08-02","location":{"address":{"addressLocality":"Test","addressRegion":"UT"}}}</script>
        </head><body></body></html>
      `;
      const result = parser.parseEventMetadata(htmlNoSelect, '411620', 'https://my.raceresult.com/411620/');
      expect(result.teams).toEqual([]);
    });

    it('TC-014: teams array matches select list size (excluding All and --)', () => {
      const result = parser.parseEventMetadata(validHtml, '411620', 'https://my.raceresult.com/411620/');
      expect(result.teams).toEqual(['Brighton Blazers', 'Alpine Riders']);
      expect(result.teams).toHaveLength(2);
    });
  });

  describe('parseParticipants', () => {
    it('TC-016: each participant record contains required fields', () => {
      const json = JSON.stringify([
        { firstName: 'John', lastName: 'Adams', team: 'Brighton', category: 'Varsity Boys', bib: '101' },
      ]);
      const result = parser.parseParticipants(json);
      expect(result[0]).toEqual({
        firstName: 'John',
        lastName: 'Adams',
        team: 'Brighton',
        category: 'Varsity Boys',
        bibNumber: '101',
      });
    });

    it('TC-017: preserves exact team name without normalization', () => {
      const json = JSON.stringify([
        { firstName: 'A', lastName: 'B', team: 'Corner Canyon Chargers', category: 'X', bib: '1' },
      ]);
      const result = parser.parseParticipants(json);
      expect(result[0].team).toBe('Corner Canyon Chargers');
    });

    it('TC-018: sets empty string for missing bib number', () => {
      const json = JSON.stringify([
        { firstName: 'A', lastName: 'B', team: 'X', category: 'Y' },
      ]);
      const result = parser.parseParticipants(json);
      expect(result[0].bibNumber).toBe('');
    });

    it('TC-020: deduplicates by firstName+lastName+team, keeps most complete', () => {
      const json = JSON.stringify([
        { firstName: 'John', lastName: 'Adams', team: 'Brighton', category: '', bib: '' },
        { firstName: 'John', lastName: 'Adams', team: 'Brighton', category: 'Varsity Boys', bib: '101' },
      ]);
      const result = parser.parseParticipants(json);
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Varsity Boys');
      expect(result[0].bibNumber).toBe('101');
    });

    it('TC-015: extracts all participants from a larger dataset', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        firstName: `First${i}`,
        lastName: `Last${i}`,
        team: `Team${i % 5}`,
        category: `Cat${i % 3}`,
        bib: String(100 + i),
      }));
      const result = parser.parseParticipants(JSON.stringify(data));
      expect(result).toHaveLength(50);
    });

    it('parses HTML table rows when response is not JSON', () => {
      const html = `
        <table>
          <tr><td>101</td><td>John</td><td>Adams</td><td>Brighton</td><td>Varsity Boys</td></tr>
          <tr><td>202</td><td>Jane</td><td>Baker</td><td>Alpine</td><td>JV A Girls</td></tr>
        </table>
      `;
      const result = parser.parseParticipants(html);
      expect(result).toHaveLength(2);
      expect(result[0].bibNumber).toBe('101');
      expect(result[0].firstName).toBe('John');
      expect(result[1].team).toBe('Alpine');
    });

    it('handles alternative JSON field names (Firstname, Lastname, Club, Contest)', () => {
      const json = JSON.stringify([
        { Firstname: 'John', Lastname: 'Adams', Club: 'Brighton', Contest: 'Varsity Boys', Bib: '101' },
      ]);
      const result = parser.parseParticipants(json);
      expect(result[0].firstName).toBe('John');
      expect(result[0].team).toBe('Brighton');
      expect(result[0].category).toBe('Varsity Boys');
    });
  });

  describe('discoverApiParams', () => {
    it('extracts API key from page content', () => {
      const html = `<script>var key = "abc123def456789012345678abcdef12";</script>`;
      const result = parser.discoverApiParams(html);
      expect(result).not.toBeNull();
      expect(result?.apiKey).toBe('abc123def456789012345678abcdef12');
    });

    it('returns null when no API key found', () => {
      const result = parser.discoverApiParams('<html><body>no key here</body></html>');
      expect(result).toBeNull();
    });

    it('extracts listname when present', () => {
      const html = `<script>var key="abc123def456789012345678abcdef12"; listname="2026 League Report"</script>`;
      const result = parser.discoverApiParams(html);
      expect(result?.listName).toBe('2026 League Report');
    });
  });

  describe('parseEventMetadata edge cases', () => {
    it('handles location as plain string', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"Test","startDate":"2026-08-02","location":"American Fork, UT"}</script></head></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.eventLocation).toBeTruthy();
    });

    it('handles ISO date format without conversion', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"Test","startDate":"2026-08-02","location":{"address":{"addressLocality":"Test","addressRegion":"UT"}}}</script></head></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.eventDate).toBe('2026-08-02');
    });

    it('handles location with name only', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"Test","startDate":"2026-08-02","location":{"name":"Some Venue"}}</script></head></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.eventLocation).toBe('Some Venue');
    });

    it('throws when all metadata fields missing', () => {
      const html = '<html><head></head></html>';
      expect(() => parser.parseEventMetadata(html, '1', 'url')).toThrow('missing required metadata fields');
    });

    it('filters out "All" and "--" from team select options', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"T","startDate":"2026-08-02","location":{"address":{"addressLocality":"A","addressRegion":"B"}}}</script></head><body><select><option>All</option><option>--</option><option>Real Team</option></select></body></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.teams).toEqual(['Real Team']);
    });

    it('handles malformed JSON-LD gracefully', () => {
      const html = '<html><head><script type="application/ld+json">{invalid json</script></head></html>';
      expect(() => parser.parseEventMetadata(html, '1', 'url')).toThrow('missing required metadata fields');
    });

    it('handles date fallback via Date.parse', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"T","startDate":"August 2, 2026","location":{"address":{"addressLocality":"A","addressRegion":"B"}}}</script></head></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('throws when date is completely unparseable (not ISO, not MM/DD/YYYY, not Date.parse-able)', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"T","startDate":"not-a-date-at-all","location":{"address":{"addressLocality":"A","addressRegion":"B"}}}</script></head></html>`;
      // normalizeDate returns '' → eventDate is missing → throws
      expect(() => parser.parseEventMetadata(html, '1', 'url')).toThrow('missing required metadata fields: eventDate');
    });

    it('handles location with no address but has name', () => {
      const html = `<html><head><script type="application/ld+json">{"name":"T","startDate":"2026-08-02","location":{"name":"Venue Name"}}</script></head></html>`;
      const result = parser.parseEventMetadata(html, '1', 'url');
      expect(result.eventLocation).toBe('Venue Name');
    });
  });

  describe('parseParticipants edge cases', () => {
    it('handles non-JSON non-HTML input (empty result)', () => {
      const result = parser.parseParticipants('just plain text');
      expect(result).toEqual([]);
    });

    it('skips header rows in HTML tables (rows with fewer than 3 cells)', () => {
      const html = `<table><tr><th>Name</th><th>Team</th></tr><tr><td>101</td><td>John</td><td>Adams</td><td>Brighton</td><td>VB</td></tr></table>`;
      const result = parser.parseParticipants(html);
      expect(result).toHaveLength(1);
    });
  });

  describe('parseParticipants — RaceResult nested API format', () => {
    const buildNestedResponse = (
      dataFields: string[],
      groupedData: Record<string, Record<string, unknown[][]>>,
    ) => JSON.stringify({ data: groupedData, DataFields: dataFields });

    it('parses CPT-style response with DisplayName and no separate first/last fields', () => {
      const body = buildNestedResponse(
        ['BIB', 'ID', 'iif([Upgrade]=1;"*" & ucase([DisplayName]);ucase([DisplayName]))', 'Grade', 'CONTEST.NAME'],
        {
          '#1_Lehi HS': {
            '#1_Varsity Girls': [['182', '39', 'ASHLYN ADAMS', '12', 'Varsity Girls']],
            '#2_JV A Girls': [['453', '11', 'LARISSA BORBA', '10', 'JV A Girls']],
          },
        },
      );

      const result = parser.parseParticipants(body);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        bibNumber: '182',
        firstName: 'ASHLYN',
        lastName: 'ADAMS',
        team: 'Lehi HS',
        category: 'Varsity Girls',
      });
      expect(result[1]).toEqual({
        bibNumber: '453',
        firstName: 'LARISSA',
        lastName: 'BORBA',
        team: 'Lehi HS',
        category: 'JV A Girls',
      });
    });

    it('parses standard response with separate Firstname/Lastname fields', () => {
      const body = buildNestedResponse(
        ['BIB', 'Firstname', 'Lastname', 'Club', 'Contest'],
        {
          '#1_Brighton': {
            '#1_Varsity Boys': [['101', 'John', 'Adams', 'Brighton', 'Varsity Boys']],
          },
        },
      );

      const result = parser.parseParticipants(body);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        bibNumber: '101',
        firstName: 'John',
        lastName: 'Adams',
        team: 'Brighton',
        category: 'Varsity Boys',
      });
    });

    it('uses outer group key as team when no Club field is present', () => {
      const body = buildNestedResponse(
        ['BIB', 'iif(1;ucase([DisplayName]);"")', 'CONTEST.NAME'],
        { '#1_Alpine Riders': { '#1_JV B Boys': [['55', 'JAKE SMITH', 'JV B Boys']] } },
      );

      const result = parser.parseParticipants(body);

      expect(result[0].team).toBe('Alpine Riders');
    });

    it('uses inner group key as category when no CONTEST.NAME field', () => {
      const body = buildNestedResponse(
        ['BIB', 'Firstname', 'Lastname'],
        { '#1_Team A': { '#1_Varsity Girls': [['10', 'Jane', 'Doe']] } },
      );

      const result = parser.parseParticipants(body);

      expect(result[0].category).toBe('Varsity Girls');
    });

    it('extracts participants across multiple teams and categories', () => {
      const body = buildNestedResponse(
        ['BIB', 'iif(1;ucase([DisplayName]);"")', 'CONTEST.NAME'],
        {
          '#1_Team A': {
            '#1_Cat 1': [
              ['1', 'ALICE ONE', 'Cat 1'],
              ['2', 'BOB TWO', 'Cat 1'],
            ],
          },
          '#2_Team B': {
            '#1_Cat 2': [['3', 'CAROL THREE', 'Cat 2']],
          },
        },
      );

      const result = parser.parseParticipants(body);

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.team)).toEqual(['Team A', 'Team A', 'Team B']);
    });

    it('handles single-word DisplayName (no space → empty lastName)', () => {
      const body = buildNestedResponse(
        ['iif(1;ucase([DisplayName]);"")'],
        { '#1_Team': { '#1_Cat': [['MADONNA']] } },
      );

      const result = parser.parseParticipants(body);

      expect(result[0].firstName).toBe('MADONNA');
      expect(result[0].lastName).toBe('');
    });

    it('returns empty bibNumber when no BIB field present', () => {
      const body = buildNestedResponse(
        ['Firstname', 'Lastname'],
        { '#1_Team': { '#1_Cat': [['Jane', 'Doe']] } },
      );

      const result = parser.parseParticipants(body);

      expect(result[0].bibNumber).toBe('');
    });

    it('returns empty names when no name field is recognizable', () => {
      const body = buildNestedResponse(
        ['Grade', 'Score'],
        { '#1_Team': { '#1_Cat': [['10', '95']] } },
      );

      const result = parser.parseParticipants(body);

      expect(result[0].firstName).toBe('');
      expect(result[0].lastName).toBe('');
    });

    it('skips non-object team data gracefully', () => {
      const raw = JSON.stringify({
        DataFields: ['BIB'],
        data: { '#1_Team A': 'not-an-object' },
      });

      const result = parser.parseParticipants(raw);

      expect(result).toHaveLength(0);
    });

    it('skips non-array category data gracefully', () => {
      const raw = JSON.stringify({
        DataFields: ['BIB'],
        data: { '#1_Team A': { '#1_Cat': 'not-an-array' } },
      });

      const result = parser.parseParticipants(raw);

      expect(result).toHaveLength(0);
    });

    it('skips non-array rows gracefully', () => {
      const raw = JSON.stringify({
        DataFields: ['BIB'],
        data: { '#1_Team A': { '#1_Cat': ['not-a-row'] } },
      });

      const result = parser.parseParticipants(raw);

      expect(result).toHaveLength(0);
    });
  });
});
