import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  createAthlete: vi.fn(),
  getAthlete: vi.fn(),
  listAthletes: vi.fn(),
  updateAthlete: vi.fn(),
  deleteAthlete: vi.fn(),
};

vi.mock('../../../adapters/athlete-dynamo-repository.js', () => ({
  AthleteDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/athlete-service.js', () => ({
  AthleteService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: athleteRoutes } = await import('../routes.js');

const mockAthlete = {
  athleteId: 'ath-123',
  organizationId: 'org-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-0100',
  dateOfBirth: '2000-01-15',
  positions: ['Forward'],
  jerseyNumber: '10',
  status: 'active',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '555-0200',
  notes: 'Good player',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const orgAdminHeaders = {
  'x-user-role': 'OrgAdmin',
  'x-organization-id': 'org-123',
};

const orgManagerHeaders = {
  'x-user-role': 'OrgManager',
  'x-organization-id': 'org-123',
};

const teamAdminHeaders = {
  'x-user-role': 'TeamAdmin',
  'x-organization-id': 'org-123',
};

const teamManagerHeaders = {
  'x-user-role': 'TeamManager',
  'x-organization-id': 'org-123',
};

const athleteRoleHeaders = {
  'x-user-role': 'Athlete',
  'x-organization-id': 'org-123',
};

const superAdminHeaders = {
  'x-user-role': 'SuperAdmin',
  'x-organization-id': 'org-123',
};

describe('Athlete routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(athleteRoutes);
  });

  describe('POST /athletes', () => {
    it('creates athlete and returns 201', async () => {
      mockService.createAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: orgAdminHeaders,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().athleteId).toBe('ath-123');
    });

    it('allows SuperAdmin to create', async () => {
      mockService.createAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: superAdminHeaders,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows OrgManager to create', async () => {
      mockService.createAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: orgManagerHeaders,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects Athlete role with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: athleteRoleHeaders,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects TeamAdmin with 403 for create', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: teamAdminHeaders,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/athletes',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /athletes', () => {
    it('returns list of athletes', async () => {
      mockService.listAthletes.mockResolvedValue({
        items: [mockAthlete],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/athletes',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listAthletes.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/athletes?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockService.listAthletes).toHaveBeenCalledWith('org-123', {
        cursor: 'abc',
        limit: 10,
      });
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listAthletes.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/athletes',
        headers: orgAdminHeaders,
      });
      expect(mockService.listAthletes).toHaveBeenCalledWith('org-123', {
        cursor: undefined,
        limit: undefined,
      });
    });

    it('allows any role with org context to list', async () => {
      mockService.listAthletes.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/athletes',
        headers: athleteRoleHeaders,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /athletes/:athleteId', () => {
    it('returns athlete by id', async () => {
      mockService.getAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'GET',
        url: '/athletes/ath-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().athleteId).toBe('ath-123');
      expect(mockService.getAthlete).toHaveBeenCalledWith('org-123', 'ath-123');
    });
  });

  describe('PUT /athletes/:athleteId', () => {
    it('updates athlete', async () => {
      const updated = { ...mockAthlete, firstName: 'Updated' };
      mockService.updateAthlete.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/athletes/ath-123',
        headers: orgAdminHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().firstName).toBe('Updated');
      expect(mockService.updateAthlete).toHaveBeenCalledWith(
        'org-123',
        'ath-123',
        expect.objectContaining({ firstName: 'Updated' }),
      );
    });

    it('allows TeamAdmin to update', async () => {
      mockService.updateAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'PUT',
        url: '/athletes/ath-123',
        headers: teamAdminHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('allows TeamManager to update', async () => {
      mockService.updateAthlete.mockResolvedValue(mockAthlete);
      const res = await app.inject({
        method: 'PUT',
        url: '/athletes/ath-123',
        headers: teamManagerHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('rejects Athlete role with 403 for update', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/athletes/ath-123',
        headers: athleteRoleHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /athletes/:athleteId', () => {
    it('deletes athlete and returns 204', async () => {
      mockService.deleteAthlete.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/athletes/ath-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.deleteAthlete).toHaveBeenCalledWith('org-123', 'ath-123');
    });

    it('allows SuperAdmin to delete', async () => {
      mockService.deleteAthlete.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/athletes/ath-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
    });

    it('rejects OrgManager with 403 for delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/athletes/ath-123',
        headers: orgManagerHeaders,
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects TeamAdmin with 403 for delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/athletes/ath-123',
        headers: teamAdminHeaders,
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
