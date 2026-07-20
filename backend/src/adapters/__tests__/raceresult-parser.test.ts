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
  });
});
