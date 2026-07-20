import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  getBranding: vi.fn(),
  createOrUpdateBranding: vi.fn(),
  updateLogo: vi.fn(),
  validateLogoFile: vi.fn(),
  getDefaults: vi.fn(() => ({ primaryColor: '#333333', tertiaryColor: '#F5F5F5', logoUrl: null })),
};

vi.mock('../../../adapters/team-branding-dynamo-repository.js', () => ({
  TeamBrandingDynamoRepository: vi.fn(),
}));
vi.mock('../../../application/team-branding-service.js', () => ({
  TeamBrandingService: vi.fn(() => mockService),
}));
vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));
vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(), eventBridgeClient: {},
}));

// Mock S3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.presigned.url/test'),
}));

const { default: brandingRoutes } = await import('../routes.js');

const headers = { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-123', 'x-user-id': 'user-1' };

const sampleBranding = {
  brandingId: 'b-1', userId: 'user-1', teamDisplayName: 'Brighton',
  primaryColor: '#1E3A5F', tertiaryColor: '#FFFFFF', logoUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('Branding routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(brandingRoutes);
  });

  describe('GET /branding', () => {
    it('returns defaults when unconfigured', async () => {
      mockService.getBranding.mockResolvedValue(null);
      const res = await app.inject({ method: 'GET', url: '/branding', headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().configured).toBe(false);
      expect(res.json().primaryColor).toBe('#333333');
    });

    it('returns branding when configured', async () => {
      mockService.getBranding.mockResolvedValue(sampleBranding);
      const res = await app.inject({ method: 'GET', url: '/branding', headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().configured).toBe(true);
      expect(res.json().teamDisplayName).toBe('Brighton');
    });
  });

  describe('PUT /branding', () => {
    it('saves branding', async () => {
      mockService.createOrUpdateBranding.mockResolvedValue(sampleBranding);
      const res = await app.inject({
        method: 'PUT', url: '/branding', headers,
        payload: { teamDisplayName: 'Brighton', primaryColor: '#1E3A5F', tertiaryColor: '#FFFFFF' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('rejects invalid hex color', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/branding', headers,
        payload: { teamDisplayName: 'Test', primaryColor: '#ZZZ' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /branding/logo/upload-url', () => {
    it('returns presigned URL for valid file', async () => {
      const res = await app.inject({
        method: 'POST', url: '/branding/logo/upload-url', headers,
        payload: { mimeType: 'image/png', sizeBytes: 1000000, filename: 'logo.png' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().uploadUrl).toContain('presigned');
    });

    it('rejects oversized file', async () => {
      mockService.validateLogoFile.mockImplementation(() => {
        throw new Error('Logo must be 2 MB or smaller');
      });
      const res = await app.inject({
        method: 'POST', url: '/branding/logo/upload-url', headers,
        payload: { mimeType: 'image/png', sizeBytes: 3145728, filename: 'big.png' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe('POST /branding/logo', () => {
    it('sets logo URL', async () => {
      mockService.updateLogo.mockResolvedValue({ ...sampleBranding, logoUrl: 'https://s3/logo.png' });
      const res = await app.inject({
        method: 'POST', url: '/branding/logo', headers,
        payload: { logoUrl: 'https://s3/logo.png' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /branding/logo', () => {
    it('removes logo', async () => {
      mockService.getBranding.mockResolvedValue(sampleBranding);
      mockService.updateLogo.mockResolvedValue({ ...sampleBranding, logoUrl: null });
      const res = await app.inject({ method: 'DELETE', url: '/branding/logo', headers });
      expect(res.statusCode).toBe(200);
    });
  });
});
