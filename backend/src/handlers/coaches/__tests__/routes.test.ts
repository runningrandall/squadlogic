import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  createCoach: vi.fn(),
  getCoach: vi.fn(),
  listCoaches: vi.fn(),
  updateCoach: vi.fn(),
  deleteCoach: vi.fn(),
};

vi.mock('../../../adapters/coach-dynamo-repository.js', () => ({
  CoachDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/coach-service.js', () => ({
  CoachService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: coachRoutes } = await import('../routes.js');

const mockCoach = {
  coachId: 'coach-123',
  organizationId: 'org-123',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '555-0100',
  certifications: ['CPR', 'First Aid'],
  specialties: ['Offense'],
  status: 'active',
  notes: 'Great coach',
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

describe('Coach routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(coachRoutes);
  });

  describe('POST /coaches', () => {
    it('creates coach and returns 201', async () => {
      mockService.createCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: orgAdminHeaders,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().coachId).toBe('coach-123');
    });

    it('allows SuperAdmin to create', async () => {
      mockService.createCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: superAdminHeaders,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows OrgManager to create', async () => {
      mockService.createCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: orgManagerHeaders,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects Athlete role with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: athleteRoleHeaders,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects TeamAdmin with 403 for create', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: teamAdminHeaders,
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/coaches',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /coaches', () => {
    it('returns list of coaches', async () => {
      mockService.listCoaches.mockResolvedValue({
        items: [mockCoach],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/coaches',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listCoaches.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/coaches?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockService.listCoaches).toHaveBeenCalledWith('org-123', {
        cursor: 'abc',
        limit: 10,
      });
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listCoaches.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/coaches',
        headers: orgAdminHeaders,
      });
      expect(mockService.listCoaches).toHaveBeenCalledWith('org-123', {
        cursor: undefined,
        limit: undefined,
      });
    });

    it('allows any role with org context to list', async () => {
      mockService.listCoaches.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/coaches',
        headers: athleteRoleHeaders,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /coaches/:coachId', () => {
    it('returns coach by id', async () => {
      mockService.getCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'GET',
        url: '/coaches/coach-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().coachId).toBe('coach-123');
      expect(mockService.getCoach).toHaveBeenCalledWith('org-123', 'coach-123');
    });
  });

  describe('PUT /coaches/:coachId', () => {
    it('updates coach', async () => {
      const updated = { ...mockCoach, firstName: 'Updated' };
      mockService.updateCoach.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/coaches/coach-123',
        headers: orgAdminHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().firstName).toBe('Updated');
      expect(mockService.updateCoach).toHaveBeenCalledWith(
        'org-123',
        'coach-123',
        expect.objectContaining({ firstName: 'Updated' }),
      );
    });

    it('allows TeamAdmin to update', async () => {
      mockService.updateCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'PUT',
        url: '/coaches/coach-123',
        headers: teamAdminHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('allows TeamManager to update', async () => {
      mockService.updateCoach.mockResolvedValue(mockCoach);
      const res = await app.inject({
        method: 'PUT',
        url: '/coaches/coach-123',
        headers: teamManagerHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('rejects Athlete role with 403 for update', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/coaches/coach-123',
        headers: athleteRoleHeaders,
        payload: { firstName: 'Updated' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /coaches/:coachId', () => {
    it('deletes coach and returns 204', async () => {
      mockService.deleteCoach.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/coaches/coach-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.deleteCoach).toHaveBeenCalledWith('org-123', 'coach-123');
    });

    it('allows SuperAdmin to delete', async () => {
      mockService.deleteCoach.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/coaches/coach-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
    });

    it('rejects OrgManager with 403 for delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/coaches/coach-123',
        headers: orgManagerHeaders,
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects TeamAdmin with 403 for delete', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/coaches/coach-123',
        headers: teamAdminHeaders,
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
