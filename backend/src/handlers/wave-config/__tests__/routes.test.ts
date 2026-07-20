import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  getConfig: vi.fn(),
  updateWave: vi.fn(),
  seedDefaults: vi.fn(),
};

vi.mock('../../../adapters/wave-config-dynamo-repository.js', () => ({
  WaveConfigDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/wave-config-service.js', () => ({
  WaveConfigService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: waveConfigRoutes } = await import('../routes.js');

const sampleConfig = {
  configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
  entries: [{ categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 }],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const adminHeaders = { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-123' };

describe('Wave config routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(waveConfigRoutes);
  });

  describe('GET /wave-config', () => {
    it('returns wave configs', async () => {
      mockService.getConfig.mockResolvedValue([sampleConfig]);
      const res = await app.inject({ method: 'GET', url: '/wave-config', headers: adminHeaders });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });

    it('returns empty when none exist', async () => {
      mockService.getConfig.mockResolvedValue([]);
      const res = await app.inject({ method: 'GET', url: '/wave-config', headers: adminHeaders });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe('PUT /wave-config/:configId', () => {
    it('updates with SuperAdmin', async () => {
      mockService.updateWave.mockResolvedValue(sampleConfig);
      const res = await app.inject({
        method: 'PUT', url: '/wave-config/w1', headers: adminHeaders,
        payload: { waveName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('allows OrgAdmin', async () => {
      mockService.updateWave.mockResolvedValue(sampleConfig);
      const res = await app.inject({
        method: 'PUT', url: '/wave-config/w1',
        headers: { 'x-user-role': 'OrgAdmin', 'x-organization-id': 'org-123' },
        payload: { waveName: 'Test' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/wave-config/w1',
        headers: { 'x-user-role': 'Athlete', 'x-organization-id': 'org-123' },
        payload: { waveName: 'Test' },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
