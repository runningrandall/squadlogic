import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  createOrganization: vi.fn(),
  getOrganization: vi.fn(),
  listOrganizations: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
};

vi.mock('../../../adapters/organization-dynamo-repository.js', () => ({
  OrganizationDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/organization-service.js', () => ({
  OrganizationService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: organizationRoutes } = await import('../routes.js');

const mockOrg = {
  organizationId: 'org-123',
  name: 'Test Org',
  slug: 'test-org',
  status: 'active',
  ownerUserId: 'user-456',
  billingEmail: 'billing@test.com',
  phone: '555-0100',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  timezone: 'America/Chicago',
  config: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const superAdminHeaders = {
  'x-user-role': 'SuperAdmin',
  'x-organization-id': 'org-123',
};

describe('Organization routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(organizationRoutes);
  });

  describe('POST /organizations', () => {
    it('creates organization and returns 201', async () => {
      mockService.createOrganization.mockResolvedValue(mockOrg);
      const res = await app.inject({
        method: 'POST',
        url: '/organizations',
        headers: superAdminHeaders,
        payload: {
          name: 'Test Org',
          slug: 'test-org',
          ownerUserId: 'user-456',
          billingEmail: 'billing@test.com',
          phone: '555-0100',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().organizationId).toBe('org-123');
    });

    it('rejects non-SuperAdmin with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/organizations',
        headers: { 'x-user-role': 'OrgAdmin', 'x-organization-id': 'org-123' },
        payload: {
          name: 'Test Org',
          slug: 'test-org',
          ownerUserId: 'user-456',
          billingEmail: 'billing@test.com',
          phone: '555-0100',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /organizations', () => {
    it('returns list of organizations', async () => {
      mockService.listOrganizations.mockResolvedValue({
        items: [mockOrg],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/organizations',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listOrganizations.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/organizations?cursor=abc&limit=10',
        headers: superAdminHeaders,
      });
      expect(mockService.listOrganizations).toHaveBeenCalledWith({
        cursor: 'abc',
        limit: 10,
      });
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listOrganizations.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/organizations',
        headers: superAdminHeaders,
      });
      expect(mockService.listOrganizations).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
      });
    });
  });

  describe('GET /organizations/:id', () => {
    it('returns organization by id', async () => {
      mockService.getOrganization.mockResolvedValue(mockOrg);
      const res = await app.inject({
        method: 'GET',
        url: '/organizations/org-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().organizationId).toBe('org-123');
      expect(mockService.getOrganization).toHaveBeenCalledWith('org-123');
    });
  });

  describe('PUT /organizations/:id', () => {
    it('updates organization', async () => {
      const updated = { ...mockOrg, name: 'Updated' };
      mockService.updateOrganization.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/organizations/org-123',
        headers: superAdminHeaders,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Updated');
      expect(mockService.updateOrganization).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ name: 'Updated' }),
      );
    });
  });

  describe('DELETE /organizations/:id', () => {
    it('deletes organization and returns 204', async () => {
      mockService.deleteOrganization.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.deleteOrganization).toHaveBeenCalledWith('org-123');
    });
  });
});
