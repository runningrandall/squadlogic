import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  createTeam: vi.fn(),
  getTeam: vi.fn(),
  listTeams: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
};

vi.mock('../../../adapters/team-dynamo-repository.js', () => ({
  TeamDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/team-service.js', () => ({
  TeamService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: teamRoutes } = await import('../routes.js');

const mockTeam = {
  teamId: 'team-123',
  organizationId: 'org-123',
  name: 'Varsity Football',
  sport: 'Football',
  season: 'Fall 2026',
  status: 'active',
  description: 'The varsity football team',
  maxRosterSize: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const superAdminHeaders = {
  'x-user-role': 'SuperAdmin',
  'x-organization-id': 'org-123',
};

describe('Team routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(teamRoutes);
  });

  describe('POST /teams', () => {
    it('creates team and returns 201', async () => {
      mockService.createTeam.mockResolvedValue(mockTeam);
      const res = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: superAdminHeaders,
        payload: {
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().teamId).toBe('team-123');
    });

    it('rejects Athlete role with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { 'x-user-role': 'Athlete', 'x-organization-id': 'org-123' },
        payload: {
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows OrgAdmin to create', async () => {
      mockService.createTeam.mockResolvedValue(mockTeam);
      const res = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { 'x-user-role': 'OrgAdmin', 'x-organization-id': 'org-123' },
        payload: {
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows OrgManager to create', async () => {
      mockService.createTeam.mockResolvedValue(mockTeam);
      const res = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { 'x-user-role': 'OrgManager', 'x-organization-id': 'org-123' },
        payload: {
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects when no org context', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { 'x-user-role': 'SuperAdmin' },
        payload: {
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /teams', () => {
    it('returns list of teams', async () => {
      mockService.listTeams.mockResolvedValue({
        items: [mockTeam],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/teams',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listTeams.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams?cursor=abc&limit=10',
        headers: superAdminHeaders,
      });
      expect(mockService.listTeams).toHaveBeenCalledWith('org-123', {
        cursor: 'abc',
        limit: 10,
      });
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listTeams.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams',
        headers: superAdminHeaders,
      });
      expect(mockService.listTeams).toHaveBeenCalledWith('org-123', {
        cursor: undefined,
        limit: undefined,
      });
    });
  });

  describe('GET /teams/:teamId', () => {
    it('returns team by id', async () => {
      mockService.getTeam.mockResolvedValue(mockTeam);
      const res = await app.inject({
        method: 'GET',
        url: '/teams/team-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().teamId).toBe('team-123');
      expect(mockService.getTeam).toHaveBeenCalledWith('org-123', 'team-123');
    });
  });

  describe('PUT /teams/:teamId', () => {
    it('updates team', async () => {
      const updated = { ...mockTeam, name: 'Updated' };
      mockService.updateTeam.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/teams/team-123',
        headers: superAdminHeaders,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Updated');
      expect(mockService.updateTeam).toHaveBeenCalledWith(
        'org-123',
        'team-123',
        expect.objectContaining({ name: 'Updated' }),
      );
    });

    it('allows TeamAdmin to update', async () => {
      mockService.updateTeam.mockResolvedValue(mockTeam);
      const res = await app.inject({
        method: 'PUT',
        url: '/teams/team-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-123' },
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('rejects Athlete role with 403', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/teams/team-123',
        headers: { 'x-user-role': 'Athlete', 'x-organization-id': 'org-123' },
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /teams/:teamId', () => {
    it('deletes team and returns 204', async () => {
      mockService.deleteTeam.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/teams/team-123',
        headers: superAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.deleteTeam).toHaveBeenCalledWith('org-123', 'team-123');
    });

    it('allows OrgAdmin to delete', async () => {
      mockService.deleteTeam.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/teams/team-123',
        headers: { 'x-user-role': 'OrgAdmin', 'x-organization-id': 'org-123' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('rejects OrgManager role with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/teams/team-123',
        headers: { 'x-user-role': 'OrgManager', 'x-organization-id': 'org-123' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects TeamAdmin role with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/teams/team-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-123' },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
