import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockRaceEventService = {
  importEvent: vi.fn(),
  getTeamList: vi.fn(),
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

vi.mock('../../../lib/dynamodb.js', () => ({ tableConfig: { table: 'TestTable', client: {} } }));
vi.mock('../../../lib/eventbridge.js', () => ({ putEvent: vi.fn(), eventBridgeClient: {} }));

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

  describe('GET /race-events/:eventId/teams', () => {
    it('returns 400 when event not imported', async () => {
      const res = await app.inject({
        method: 'GET', url: '/race-events/999/teams', headers,
      });
      expect(res.statusCode).toBe(400);
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
      // First import an event
      mockRaceEventService.importEvent.mockResolvedValue({
        metadata: { eventName: 'E', eventDate: 'D', eventLocation: 'L', eventId: '1', sourceUrl: 'u', teams: [] },
        participants: [{ firstName: 'A', lastName: 'B', team: 'T', category: 'C', bibNumber: '1' }],
      });
      await app.inject({ method: 'POST', url: '/race-events/import', headers, payload: { url: 'https://my.raceresult.com/1/' } });

      const res = await app.inject({
        method: 'POST', url: '/race-events/1/schedule', headers, payload: {},
      });
      expect(res.statusCode).toBe(400);
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
  });
});
