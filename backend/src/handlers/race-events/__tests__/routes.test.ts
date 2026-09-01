import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockCallUpListService = {
  importCallUpList: vi.fn(),
  getTeamList: vi.fn(),
};

const mockWaveConfigService = { getConfig: vi.fn(), updateWave: vi.fn(), seedDefaults: vi.fn() };
const mockScheduleService = { generateSchedule: vi.fn() };
const mockLogisticsService = { calculateDefaults: vi.fn(), enrichSchedule: vi.fn() };
const mockPdfService = {
  generatePdf: vi.fn(),
  generateSchedulePdf: vi.fn(),
  generateRosterPdf: vi.fn(),
  generatePocketPdf: vi.fn(),
  generateFilename: vi.fn(),
};
const mockBrandingService = { getBranding: vi.fn(), createOrUpdateBranding: vi.fn(), getDefaults: vi.fn() };

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({ EventBridgePublisher: vi.fn() }));
vi.mock('../../../adapters/team-branding-dynamo-repository.js', () => ({ TeamBrandingDynamoRepository: vi.fn() }));
vi.mock('../../../adapters/wave-config-dynamo-repository.js', () => ({ WaveConfigDynamoRepository: vi.fn() }));

vi.mock('../../../application/callup-list-service.js', () => ({
  CallUpListService: vi.fn(() => mockCallUpListService),
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
const mockEnforceRateLimit = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../lib/rate-limiter.js', () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

const { default: raceEventRoutes } = await import('../routes.js');

const headers = { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-123' };

const sampleParticipants = [
  { firstName: 'J', lastName: 'D', team: 'Team A', category: 'V Boys', bibNumber: '1', callUpNumber: '1' },
];
const sampleCategorySchedule = { 'V Boys': { stageTime: '08:00', startTime: '08:15' } };
const sampleSchedule = {
  teamName: 'Team A', eventName: 'Test Event', eventDate: '2026-08-02',
  totalAthletes: 1, waves: [],
};

function sampleImportResult(eventId: string) {
  return {
    metadata: {
      eventName: 'Test Event', eventDate: '2026-08-02', eventLocation: 'Test, UT',
      eventId, sourceUrl: '', teams: ['Team A'],
    },
    participants: sampleParticipants,
    categorySchedule: sampleCategorySchedule,
  };
}

describe('Race event routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(raceEventRoutes);
  });

  describe('POST /race-events/import/callup', () => {
    it('imports a call-up list upload and returns metadata', async () => {
      mockCallUpListService.importCallUpList.mockResolvedValue(sampleImportResult('evt-1'));

      const res = await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().eventId).toBe('evt-1');
      expect(res.json().teams).toEqual(['Team A']);
      expect(res.json().participantCount).toBe(1);
    });

    it('passes decoded buffer and overrides through to the service', async () => {
      mockCallUpListService.importCallUpList.mockResolvedValue(sampleImportResult('evt-2'));

      await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: {
          fileData: Buffer.from('fake xlsx').toString('base64'),
          eventName: 'UTAH HS MTB', eventLocation: 'Beaver County, UT',
        },
      });

      expect(mockCallUpListService.importCallUpList).toHaveBeenCalledWith(
        expect.any(Buffer),
        { eventName: 'UTAH HS MTB', eventLocation: 'Beaver County, UT' },
      );
    });

    it('returns 400 when fileData is missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers, payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when fileData is empty', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('propagates parser errors (e.g. malformed workbook) as an error response', async () => {
      mockCallUpListService.importCallUpList.mockRejectedValue(
        new Error('No categories found in the call-up list. Check the file format.'),
      );

      const res = await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('garbage').toString('base64') },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('checks the rate limit keyed by request IP before importing', async () => {
      mockCallUpListService.importCallUpList.mockResolvedValue(sampleImportResult('evt-3'));

      await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
      });

      expect(mockEnforceRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        100,
        300,
      );
    });

    it('returns 429 and skips the import when the rate limit is exceeded', async () => {
      const { TooManyRequestsError } = await import('../../../lib/errors.js');
      mockEnforceRateLimit.mockRejectedValueOnce(new TooManyRequestsError());

      const res = await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
      });

      expect(res.statusCode).toBe(429);
      expect(mockCallUpListService.importCallUpList).not.toHaveBeenCalled();
    });
  });

  async function importAndGetEventId(eventId = '2') {
    mockCallUpListService.importCallUpList.mockResolvedValue(sampleImportResult(eventId));
    await app.inject({
      method: 'POST', url: '/race-events/import/callup', headers,
      payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
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
      mockCallUpListService.getTeamList.mockReturnValue([{ name: 'Team A', count: 1 }]);
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
      const eventId = await importAndGetEventId('1');
      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/schedule`, headers, payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('generates and returns enriched schedule, using categorySchedule from the import', async () => {
      const eventId = await importAndGetEventId('3');
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/schedule`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockScheduleService.generateSchedule).toHaveBeenCalledWith(
        'Team A', sampleParticipants, [], sampleCategorySchedule, 'Test Event', '2026-08-02',
      );
    });

    it('passes the whole race field to generateSchedule, not just the requested team\'s riders', async () => {
      // generateSchedule computes each category's call-up threshold off the whole-race field
      // size and does its own team filtering internally — passing an already-filtered,
      // single-team list here would silently cap every category's threshold at its lowest tier.
      const multiTeamImport = sampleImportResult('multi-1');
      multiTeamImport.participants = [
        ...sampleParticipants,
        { firstName: 'K', lastName: 'M', team: 'Team B', category: 'V Boys', bibNumber: '2', callUpNumber: '2' },
      ];
      multiTeamImport.metadata.teams = ['Team A', 'Team B'];
      mockCallUpListService.importCallUpList.mockResolvedValue(multiTeamImport);
      await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
      });

      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);

      await app.inject({
        method: 'POST', url: '/race-events/multi-1/schedule', headers,
        payload: { teamName: 'Team A' },
      });

      expect(mockScheduleService.generateSchedule).toHaveBeenCalledWith(
        'Team A', multiTeamImport.participants, [], sampleCategorySchedule, 'Test Event', '2026-08-02',
      );
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
      mockBrandingService.getBranding.mockResolvedValue({
        teamDisplayName: 'Team A', primaryColor: '#000', tertiaryColor: '#FFF', logoUrl: null,
      });
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateSchedulePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
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
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateSchedulePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_2026-08-02_schedule.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('generates a schedule on the fly when no cached schedule exists (skips the /schedule step)', async () => {
      const eventId = await importAndGetEventId('7');
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateSchedulePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_schedule.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockScheduleService.generateSchedule).toHaveBeenCalledWith(
        'Team A', sampleParticipants, [], sampleCategorySchedule, 'Test Event', '2026-08-02',
      );
    });

    it('passes the whole race field to generateSchedule on the on-the-fly path too', async () => {
      const multiTeamImport = sampleImportResult('multi-2');
      multiTeamImport.participants = [
        ...sampleParticipants,
        { firstName: 'K', lastName: 'M', team: 'Team B', category: 'V Boys', bibNumber: '2', callUpNumber: '2' },
      ];
      multiTeamImport.metadata.teams = ['Team A', 'Team B'];
      mockCallUpListService.importCallUpList.mockResolvedValue(multiTeamImport);
      await app.inject({
        method: 'POST', url: '/race-events/import/callup', headers,
        payload: { fileData: Buffer.from('fake xlsx').toString('base64') },
      });

      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateSchedulePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_schedule.pdf');

      await app.inject({
        method: 'POST', url: '/race-events/multi-2/export/pdf', headers,
        payload: { teamName: 'Team A' },
      });

      expect(mockScheduleService.generateSchedule).toHaveBeenCalledWith(
        'Team A', multiTeamImport.participants, [], sampleCategorySchedule, 'Test Event', '2026-08-02',
      );
    });

    it('re-reads WaveConfig instead of reusing an expired cached schedule', async () => {
      const eventId = await importAndGetEventId('10');
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateSchedulePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_schedule.pdf');

      // Only Date is mocked (not timers) — faking setTimeout/setInterval breaks
      // Fastify's internal async scheduling and hangs `app.inject`.
      const realNow = Date.now();
      try {
        // Populate the schedule cache via the /schedule step, same as a normal user flow.
        await app.inject({
          method: 'POST', url: `/race-events/${eventId}/schedule`, headers,
          payload: { teamName: 'Team A' },
        });
        expect(mockScheduleService.generateSchedule).toHaveBeenCalledTimes(1);

        // A WaveConfig correction made after caching — e.g. a lap count fix — should
        // be picked up once the cache entry's TTL has elapsed, not silently ignored.
        vi.setSystemTime(realNow + 6 * 60 * 1000);

        const res = await app.inject({
          method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
          payload: { teamName: 'Team A' },
        });
        expect(res.statusCode).toBe(200);
        expect(mockScheduleService.generateSchedule).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('dispatches to generateRosterPdf when variant is "roster"', async () => {
      const eventId = await importAndGetEventId('8');
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generateRosterPdf.mockResolvedValue(Buffer.from('%PDF-1.4 roster'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_2026-08-02_roster.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A', variant: 'roster' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockPdfService.generateRosterPdf).toHaveBeenCalled();
      expect(mockPdfService.generateSchedulePdf).not.toHaveBeenCalled();
      expect(mockPdfService.generateFilename).toHaveBeenCalledWith('Team A', '2026-08-02', 'roster');
    });

    it('dispatches to generatePocketPdf when variant is "pocket"', async () => {
      const eventId = await importAndGetEventId('9');
      mockBrandingService.getBranding.mockResolvedValue(null);
      mockWaveConfigService.getConfig.mockResolvedValue([]);
      mockScheduleService.generateSchedule.mockReturnValue(sampleSchedule);
      mockLogisticsService.enrichSchedule.mockReturnValue(sampleSchedule);
      mockPdfService.generatePocketPdf.mockResolvedValue(Buffer.from('%PDF-1.4 pocket'));
      mockPdfService.generateFilename.mockReturnValue('Team_A_2026-08-02_pocket.pdf');

      const res = await app.inject({
        method: 'POST', url: `/race-events/${eventId}/export/pdf`, headers,
        payload: { teamName: 'Team A', variant: 'pocket' },
      });
      expect(res.statusCode).toBe(200);
      expect(mockPdfService.generatePocketPdf).toHaveBeenCalled();
      expect(mockPdfService.generateSchedulePdf).not.toHaveBeenCalled();
      expect(mockPdfService.generateFilename).toHaveBeenCalledWith('Team A', '2026-08-02', 'pocket');
    });
  });
});
