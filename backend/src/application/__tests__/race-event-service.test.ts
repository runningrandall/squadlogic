import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RaceEventService } from '../race-event-service.js';
import type { RaceResultParser } from '../../ports/raceresult-port.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { RaceEventMetadata, RaceParticipant } from '../../domain/race-event.js';
import type { RaceResultClient, RaceResultConfig } from '../../adapters/raceresult-client.js';

function createMocks() {
  const client = {
    fetchEventPage: vi.fn(),
    fetchEventConfig: vi.fn(),
    fetchParticipants: vi.fn(),
  } as unknown as RaceResultClient & {
    fetchEventPage: ReturnType<typeof vi.fn>;
    fetchEventConfig: ReturnType<typeof vi.fn>;
    fetchParticipants: ReturnType<typeof vi.fn>;
  };
  const parser: RaceResultParser = {
    parseEventMetadata: vi.fn(),
    discoverApiParams: vi.fn(),
    parseParticipants: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  };
  return { client, parser, eventPublisher };
}

const sampleConfig: RaceResultConfig = {
  key: 'abc123def456',
  server: 'my-us-1.raceresult.com',
  eventname: 'UTAH HS MTB 2026 - REGION 5',
  contests: { '1': 'Varsity Boys' },
  TabConfig: {
    Lists: [
      { Name: 'Hidden List', Mode: 'hidden', ID: '1' },
      { Name: 'Active List', Mode: '', ID: '2' },
    ],
  },
};

const sampleMetadata: RaceEventMetadata = {
  eventName: 'UTAH HS MTB 2026 - REGION 5',
  eventDate: '2026-08-02',
  eventLocation: 'American Fork, UT',
  eventId: '411620',
  sourceUrl: 'https://my.raceresult.com/411620/',
  teams: ['Alpine Riders', 'Brighton Blazers', 'Canyon Chargers'],
};

const sampleParticipants: RaceParticipant[] = [
  { firstName: 'John', lastName: 'Adams', team: 'Brighton Blazers', category: 'Varsity Boys', bibNumber: '101' },
  { firstName: 'Jane', lastName: 'Baker', team: 'Alpine Riders', category: 'Varsity Girls', bibNumber: '202' },
  { firstName: 'Mike', lastName: 'Clark', team: 'Brighton Blazers', category: 'JV A Boys', bibNumber: '303' },
  { firstName: 'Sara', lastName: 'Davis', team: 'Brighton Blazers', category: 'JV B Boys', bibNumber: '404' },
  { firstName: 'Tom', lastName: 'Evans', team: 'Alpine Riders', category: 'JV A Boys', bibNumber: '505' },
  { firstName: 'Amy', lastName: 'Frank', team: 'Alpine Riders', category: 'Freshman A Boys', bibNumber: '606' },
  { firstName: 'Dan', lastName: 'Green', team: 'Canyon Chargers', category: 'Varsity Boys', bibNumber: '707' },
];

describe('RaceEventService', () => {
  describe('importEvent', () => {
    it('TC-008: extracts metadata and participants from a valid event', async () => {
      const { client, parser, eventPublisher } = createMocks();
      const service = new RaceEventService(client, parser, eventPublisher);

      vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
      vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
      vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
      vi.mocked(client.fetchParticipants).mockResolvedValue('[...]');
      vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);

      const result = await service.importEvent('https://my.raceresult.com/411620/', '411620');

      expect(result.metadata.eventName).toBe('UTAH HS MTB 2026 - REGION 5');
      expect(result.participants).toHaveLength(7);
      // Verify it used the config endpoint
      expect(client.fetchEventConfig).toHaveBeenCalledWith('411620');
      // Verify it used the correct server and active list
      expect(client.fetchParticipants).toHaveBeenCalledWith(
        '411620', 'abc123def456', 'Active List', 'my-us-1.raceresult.com',
      );
    });

    it('TC-019: throws when no participants found', async () => {
      const { client, parser, eventPublisher } = createMocks();
      const service = new RaceEventService(client, parser, eventPublisher);

      vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
      vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
      vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
      vi.mocked(client.fetchParticipants).mockResolvedValue('[]');
      vi.mocked(parser.parseParticipants).mockReturnValue([]);

      await expect(
        service.importEvent('https://my.raceresult.com/411620/', '411620'),
      ).rejects.toThrow('No participants found for this event.');
    });

    it('publishes RaceEventImported event on success', async () => {
      const { client, parser, eventPublisher } = createMocks();
      const service = new RaceEventService(client, parser, eventPublisher);

      vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
      vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
      vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
      vi.mocked(client.fetchParticipants).mockResolvedValue('[...]');
      vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);

      await service.importEvent('https://my.raceresult.com/411620/', '411620');

      expect(eventPublisher.publish).toHaveBeenCalledWith('RaceEventImported', {
        eventId: '411620',
        eventName: 'UTAH HS MTB 2026 - REGION 5',
        participantCount: 7,
        teamCount: 3,
      });
    });

    it('does not throw when event publication fails', async () => {
      const { client, parser, eventPublisher } = createMocks();
      const service = new RaceEventService(client, parser, eventPublisher);

      vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
      vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
      vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
      vi.mocked(client.fetchParticipants).mockResolvedValue('[...]');
      vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);
      vi.mocked(eventPublisher.publish).mockRejectedValue(new Error('EventBridge down'));

      const result = await service.importEvent('https://my.raceresult.com/411620/', '411620');
      expect(result.participants).toHaveLength(7);
    });
  });

  it('uses empty listName when TabConfig has no non-hidden lists', async () => {
    const { client, parser, eventPublisher } = createMocks();
    const service = new RaceEventService(client, parser, eventPublisher);

    const allHiddenConfig: RaceResultConfig = {
      ...sampleConfig,
      TabConfig: { Lists: [{ Name: 'A', Mode: 'hidden', ID: '1' }] },
    };
    vi.mocked(client.fetchEventConfig).mockResolvedValue(allHiddenConfig);
    vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
    vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
    vi.mocked(client.fetchParticipants).mockResolvedValue('[...]');
    vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);

    await service.importEvent('https://my.raceresult.com/411620/', '411620');

    expect(client.fetchParticipants).toHaveBeenCalledWith(
      '411620', 'abc123def456', '', 'my-us-1.raceresult.com',
    );
  });

  it('uses groupFilters Type=1 as the authoritative team list', async () => {
    const { client, parser, eventPublisher } = createMocks();
    const service = new RaceEventService(client, parser, eventPublisher);

    // groupFilters lives in the participants list response body, not the config
    const participantsBody = JSON.stringify({
      groupFilters: [
        { Type: 1, Values: ['Lehi HS', 'Brighton Blazers', 'Alta HS', 'Canyon Chargers'] },
        { Type: 2, Values: ['Varsity Boys', 'JV A Boys'] }, // ignored — not Type 1
      ],
      data: {},
    });

    vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
    vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
    vi.mocked(parser.parseEventMetadata).mockReturnValue({ ...sampleMetadata, teams: [] });
    vi.mocked(client.fetchParticipants).mockResolvedValue(participantsBody);
    // Only Lehi HS has participants — but all 4 teams should appear in metadata
    vi.mocked(parser.parseParticipants).mockReturnValue([
      { firstName: 'John', lastName: 'Adams', team: 'Lehi HS', category: 'Varsity Boys', bibNumber: '1' },
    ]);

    const result = await service.importEvent('https://my.raceresult.com/411620/', '411620');

    expect(result.metadata.teams).toEqual(['Alta HS', 'Brighton Blazers', 'Canyon Chargers', 'Lehi HS']);
  });

  it('falls back to participant-derived teams when groupFilters is absent', async () => {
    const { client, parser, eventPublisher } = createMocks();
    const service = new RaceEventService(client, parser, eventPublisher);

    // Response body with no groupFilters — service falls back to participant teams
    const participantsBody = JSON.stringify({ data: {} });

    vi.mocked(client.fetchEventConfig).mockResolvedValue(sampleConfig);
    vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
    vi.mocked(parser.parseEventMetadata).mockReturnValue({ ...sampleMetadata, teams: [] });
    vi.mocked(client.fetchParticipants).mockResolvedValue(participantsBody);
    vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);

    const result = await service.importEvent('https://my.raceresult.com/411620/', '411620');

    expect(result.metadata.teams).toEqual(['Alpine Riders', 'Brighton Blazers', 'Canyon Chargers']);
  });

  it('uses empty listName when TabConfig is absent', async () => {
    const { client, parser, eventPublisher } = createMocks();
    const service = new RaceEventService(client, parser, eventPublisher);

    const noTabConfig: RaceResultConfig = { ...sampleConfig, TabConfig: undefined };
    vi.mocked(client.fetchEventConfig).mockResolvedValue(noTabConfig);
    vi.mocked(client.fetchEventPage).mockResolvedValue('<html>...</html>');
    vi.mocked(parser.parseEventMetadata).mockReturnValue(sampleMetadata);
    vi.mocked(client.fetchParticipants).mockResolvedValue('[...]');
    vi.mocked(parser.parseParticipants).mockReturnValue(sampleParticipants);

    await service.importEvent('https://my.raceresult.com/411620/', '411620');

    expect(client.fetchParticipants).toHaveBeenCalledWith(
      '411620', 'abc123def456', '', 'my-us-1.raceresult.com',
    );
  });

  describe('getTeamList', () => {
    let service: RaceEventService;

    beforeEach(() => {
      const { client, parser, eventPublisher } = createMocks();
      service = new RaceEventService(client, parser, eventPublisher);
    });

    it('TC-022: returns teams sorted alphabetically', () => {
      const teams = service.getTeamList(
        ['Canyon Chargers', 'Alpine Riders', 'Brighton Blazers'],
        sampleParticipants,
      );
      expect(teams.map((t) => t.name)).toEqual([
        'Alpine Riders',
        'Brighton Blazers',
        'Canyon Chargers',
      ]);
    });

    it('TC-023: displays participant count per team', () => {
      const teams = service.getTeamList(
        ['Alpine Riders', 'Brighton Blazers', 'Canyon Chargers'],
        sampleParticipants,
      );
      expect(teams.find((t) => t.name === 'Brighton Blazers')?.count).toBe(3);
      expect(teams.find((t) => t.name === 'Alpine Riders')?.count).toBe(3);
      expect(teams.find((t) => t.name === 'Canyon Chargers')?.count).toBe(1);
    });

    it('TC-024: includes all registered teams even those with zero participants', () => {
      const teams = service.getTeamList(
        ['Alpine Riders', 'Ghost Team', 'Brighton Blazers'],
        sampleParticipants,
      );
      // Ghost Team has no participants but is still included (from groupFilters)
      expect(teams.map((t) => t.name)).toContain('Ghost Team');
      expect(teams).toHaveLength(3);
      expect(teams.find((t) => t.name === 'Ghost Team')?.count).toBe(0);
    });

    it('TC-025: returns empty array when teams array is empty', () => {
      const teams = service.getTeamList([], sampleParticipants);
      expect(teams).toEqual([]);
    });

    it('skips participants with empty team string', () => {
      const withNoTeam = [
        ...sampleParticipants,
        { firstName: 'X', lastName: 'Y', team: '', category: 'Varsity', bibNumber: '999' },
      ];
      const teams = service.getTeamList(['Brighton Blazers'], withNoTeam);
      // The empty-team participant does not inflate any team count
      expect(teams.find((t) => t.name === 'Brighton Blazers')?.count).toBe(3);
    });
  });
});
