import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockSheetsService = {
  exportSchedule: vi.fn(),
};

vi.mock('../../../adapters/google-sheets-adapter.js', () => ({
  GoogleSheetsAdapter: vi.fn(),
  GoogleSheetsAuthError: class extends Error { statusCode = 401; },
}));

vi.mock('../../../application/sheets-export-service.js', () => ({
  SheetsExportService: vi.fn(() => mockSheetsService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(), eventBridgeClient: {},
}));

const { default: exportRoutes } = await import('../routes.js');

const headers = { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-123' };

const sampleSchedule = {
  teamName: 'Brighton', eventName: 'Test', eventDate: '2026-08-02',
  totalAthletes: 1, waves: [],
};

describe('Export routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(exportRoutes);
  });

  describe('POST /race-events/:eventId/export/sheets', () => {
    it('returns spreadsheet URL on success', async () => {
      mockSheetsService.exportSchedule.mockResolvedValue('https://docs.google.com/spreadsheets/d/abc');
      const res = await app.inject({
        method: 'POST', url: '/race-events/411620/export/sheets', headers,
        payload: { schedule: sampleSchedule },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().spreadsheetUrl).toContain('google.com');
    });

    it('returns 400 when schedule missing', async () => {
      const res = await app.inject({
        method: 'POST', url: '/race-events/411620/export/sheets', headers,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 401 on auth error', async () => {
      const { GoogleSheetsAuthError } = await import('../../../adapters/google-sheets-adapter.js');
      mockSheetsService.exportSchedule.mockRejectedValue(new GoogleSheetsAuthError('Auth failed'));
      const res = await app.inject({
        method: 'POST', url: '/race-events/411620/export/sheets', headers,
        payload: { schedule: sampleSchedule },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
