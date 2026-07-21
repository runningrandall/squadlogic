import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockRaceEventService = {
  importEvent: vi.fn(),
  getTeamList: vi.fn(),
  getParticipantsForTeam: vi.fn(),
};

const mockWaveConfigService = { getConfig: vi.fn(), updateWave: vi.fn(), seedDefaults: vi.fn() };
const mockScheduleService = { generateSchedule: vi.fn() };
const mockLogisticsService = { calculateDefaults: vi.fn(), enrichSchedule: vi.fn() };
const mockPdfService = { generatePdf: vi.fn(), generateFilename: vi.fn() };
const mockBrandingService = { getBranding: vi.fn(), createOrUpdateBranding: vi.fn(), getDefaults: vi.fn() };

vi.mock('../../../adapters/raceresult-client.js', () => ({ RaceResultClient: vi.fn() }));
vi.mock('../../../adapters/raceresult-parser.js', () => ({ RaceResultHtmlParser: vi.fn() }));
vi.mock('../../../adapters/eventbridge-publisher.js', () => ({ EventBridgePublisher: vi.fn() }));
vi.mock('../../../adapters/team-branding-dynamo-repository.js', () => ({ TeamBrandingDynamoRepository: vi.fn() }));
vi.mock('../../../adapters/wave-config-dynamo-repository.js', () => ({ WaveConfigDynamoRepository: vi.fn() }));

vi.mock('../../../application/race-event-service.js', () => ({
  RaceEventService: vi.fn(() => mockRaceEventService),
}));
vi.mock('../../../application/wave-config-service.js', () => ({
  WaveConfigService: vi.fn(() => mockWaveConfigService),
}));
vi.mock('../../../application/wave-schedule-service.js', () => ({
  WaveScheduleService: vi.fn(() => mockScheduleService),
}));
vi.mock('../../../application/logistics-service.js', () => ({
  LogisticsService: vi.fn(() => mockLogisticsService),
}));
vi.mock('../../../application/pdf-export-service.js', () => ({
  PdfExportService: vi.fn(() => mockPdfService),
}));
vi.mock('../../../application/team-branding-service.js', () => ({
  TeamBrandingService: vi.fn(() => mockBrandingService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({ tableConfig: { table: 'TestTable', client: {} }, dynamoClient: {}, TABLE_NAME: 'TestTable' }));
vi.mock('../../../lib/eventbridge.js', () => ({ putEvent: vi.fn(), eventBridgeClient: {} }));
vi.mock('../../../lib/race-session-store.js', () => ({
  setRaceSession: vi.fn().mockResolvedValue(undefined),
  getRaceSession: vi.fn().mockResolvedValue(null),
}));

const mockParseCsvParticipants = vi.fn();
vi.mock('../../../adapters/csv-participant-parser.js', () => ({
  parseCsvParticipants: (...args: unknown[]) => mockParseCsvParticipants(...args),
}));

const { default: raceEventRoutes } = await import('../routes.js');

const headers = { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-123' };

describe('Race event routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(raceEventRoutes);
  });

  describe('POST /race-events/import', () => {
    it('imports event and returns metadata', async () => {
      mockRaceEventService.importEvent.mockResolvedValue({
        metadata: {
          eventName: 'Test Event', eventDate: '2026-08-02', eventLocation: 'Test, UT',
          eventId: '411620', sourceUrl: 'https://my.raceresult.com/411620/', teams: ['Team A'],
        },
        participants: [{ firstName: 'J', lastName: 'D', team: 'Team A', category: 'V Boys', bibNumber: '1' }],
        fetchConfig: { eventId: '411620', key: 'testkey', server: 'my-us-1.raceresult.com', listName: '' },
      });

      const res = await app.inject({
        method: 'POST', url: '/race-events/import', headers,
        payload: { url: 'https://my.raceresult.com/411620/' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().eventId).toBe('411620');
      expect(res.json().teams).toEqual(['Team A']);
    });

    it('returns 400 when url is missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import', headers, payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid url format', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import', headers,
        payload: { url: 'https://example.com/bad' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  const sampleMetadata = {
    eventName: 'Test Event', eventDate: '2026-08-02', eventLocation: 'Test, UT',
    eventId: '2', sourceUrl: 'https://my.raceresult.com/2/', teams: ['Team A'],
  };
  const sampleParticipants = [
    { firstName: 'J', lastName: 'D', team: 'Team A', category: 'V Boys', bibNumber: '1' },
  ];
  const sampleSchedule = {
    teamName: 'Team A', eventName: 'Test Event', eventDate: '2026-08-02',
    totalAthletes: 1, waves: [],
  };

  const sampleFetchConfig = {
    eventId: '2', key: 'testkey', server: 'my-us-1.raceresult.com', listName: 'Test List',
  };

  async function importAndGetEventId(eventId = '2') {
    mockRaceEventService.importEvent.mockResolvedValue({
      metadata: { ...sampleMetadata, eventId },
      participants: sampleParticipants,
      fetchConfig: { ...sampleFetchConfig, eventId },
    });
    await app.inject({
      method: 'POST', url: '/race-events/import', headers,
      payload: { url: `https://my.raceresult.com/${eventId}/` },
    });
    return eventId;
  }

  describe('GET /race-events/:eventId/teams', () => {
    it('returns 400 when event not imported', async () => {
      const res = await app.inject({
        method: 'GET', url: '/race-events/999/teams', headers,
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns teams when event is imported', async () => {
      const eventId = await importAndGetEventId();
      mockRaceEventService.getTeamList.mockReturnValue([{ name: 'Team A', count: 1 }]);
      const res = await app.inject({
        method: 'GET', url: `/race-events/${eventId}/teams`, headers,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().teams).toHaveLength(1);
    });
  });

  describe('POST /race-events/:eventId/schedule', () => {
    it('returns 400 when event not imported', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/999/schedule', headers,
        payload: { teamName: 'Test' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when teamName missing', async () => {
      mockRaceEventService.importEvent.mockResolvedValue({
        metadata: { eventName: 'E', eventDate: 'D', eventLocation: 'L', eventId: '1', sourceUrl: 'u', teams: [] },
        participants: [{ firstName: 'A', lastName: 'B', team: 'T', category: 'C', bibNumber: '1' }],
        fetchConfig: { eventId: '1', key: 'k', server: 's', listName: '' },
      });
      await app.inject({ method: 'POST', url: '/race-events/import', headers, payload: { url: 'https://my.raceresult.com/1/' } });

      const res = await app.inject({
        method: 'POST', url: '/race-events/1/schedule', headers, payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('generates and returns enriched schedule', async () => {
      const eventId = await importAndGetEventId('3');
      mockRaceEventService.getParticipantsForTeam.mockResolvedValue(sampleParticipants);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 30, stagingBeforeMinutes: 20 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/schedule`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('generates schedule with custom logistics overrides', async () => {
      const eventId = await importAndGetEventId('4');
      mockRaceEventService.getParticipantsForTeam.mockResolvedValue(sampleParticipants);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 20, stagingBeforeMinutes: 15 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/schedule`, headers,
        payload: { teamName: 'Team A', warmupDurationMinutes: 20, stagingBeforeMinutes: 15 },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /race-events/:eventId/export/pdf', () => {
    it('returns 400 when event not imported', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/999/export/pdf', headers,
        payload: { teamName: 'Test' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('generates PDF with branding', async () => {
      const eventId = await importAndGetEventId('5');
      mockRaceEventService.getParticipantsForTeam.mockResolvedValue(sampleParticipants);
      mockBrandingService.getBranding.mockResolvedValue({
        teamDisplayName: 'Team A', primaryColor: '#000', tertiaryColor: '#FFF', logoUrl: null,
      });
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 30, stagingBeforeMinutes: 20 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_2026-08-02_schedule.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('generates PDF without branding (uses teamName as filename fallback)', async () => {
      const eventId = await importAndGetEventId('6');
      mockRaceEventService.getParticipantsForTeam.mockResolvedValue(sampleParticipants);
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 30, stagingBeforeMinutes: 20 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_2026-08-02_schedule.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /race-events/import/csv', () => {
    it('imports participants from a valid CSV', async () => {
      mockParseCsvParticipants.mockReturnValue(sampleParticipants);

      const res = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'Varsity Boys,,,,,\n,J D,,,, V Boys', teamName: 'Team A', eventName: 'Test', eventDate: '2026-08-02', eventLocation: 'UT' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().participantCount).toBe(1);
      expect(res.json().teams).toEqual(['Team A']);
      expect(res.json().eventName).toBe('Test');
    });

    it('uses defaults when eventName/Date/Location are omitted', async () => {
      mockParseCsvParticipants.mockReturnValue(sampleParticipants);

      const res = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'some,csv', teamName: 'Team A' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().eventName).toBe('Race Event');
      expect(res.json().eventDate).toBe('');
    });

    it('returns 400 when csvData is missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when teamName is missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'data' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when CSV has no participants', async () => {
      mockParseCsvParticipants.mockReturnValue([]);
      const res = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'empty,csv', teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('CSV import path in schedule and PDF routes', () => {
    async function importViaCsv(eventId: string) {
      mockParseCsvParticipants.mockReturnValue(
        sampleParticipants.map((p) => ({ ...p })),
      );
      await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'csv', teamName: 'Team A', eventName: 'E', eventDate: '2026-08-02', eventLocation: 'L' },
      });
      // The CSV import uses Date.now() as eventId — we need to retrieve it
      return eventId;
    }

    it('schedule uses cached participants when fetchConfig is null (CSV import)', async () => {
      // Import via CSV so fetchConfig is null
      mockParseCsvParticipants.mockReturnValue(sampleParticipants);
      const importRes = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'csv', teamName: 'Team A' },
      });
      const { eventId } = importRes.json();

      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 30, stagingBeforeMinutes: 20 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/schedule`, headers,
        payload: { teamName: 'Team A' },
      });

      expect(res.statusCode).toBe(200);
      // Must NOT have called getParticipantsForTeam (that's for URL imports only)
      expect(mockRaceEventService.getParticipantsForTeam).not.toHaveBeenCalled();
    });

    it('PDF uses cached participants when fetchConfig is null (CSV import)', async () => {
      mockParseCsvParticipants.mockReturnValue(sampleParticipants);
      const importRes = await app.inject({
        method: 'POST', url: '/race-events/import/csv', headers,
        payload: { csvData: 'csv', teamName: 'Team A' },
      });
      const { eventId } = importRes.json();

      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.calculateDefaults.mockReturnValue({ arrivalOverrides: new Map(), warmupDurationMinutes: 30, stagingBeforeMinutes: 20 });
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_schedule.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockRaceEventService.getParticipantsForTeam).not.toHaveBeenCalled();
    });
  });
});
