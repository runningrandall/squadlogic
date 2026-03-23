import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  createGroup: vi.fn(),
  getGroup: vi.fn(),
  listGroupsByTeam: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
};

vi.mock('../../../adapters/group-dynamo-repository.js', () => ({
  GroupDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/group-service.js', () => ({
  GroupService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: groupRoutes } = await import('../routes.js');

const mockGroup = {
  groupId: 'group-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  name: 'Offense',
  description: 'Offense unit',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const orgAdminHeaders = {
  'x-user-role': 'OrgAdmin',
  'x-organization-id': 'org-789',
};

const athleteHeaders = {
  'x-user-role': 'Athlete',
  'x-organization-id': 'org-789',
};

describe('Group routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(groupRoutes);
  });

  describe('POST /teams/:teamId/groups', () => {
    it('creates group and returns 201', async () => {
      mockService.createGroup.mockResolvedValue(mockGroup);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/groups',
        headers: orgAdminHeaders,
        payload: {
          name: 'Offense',
          description: 'Offense unit',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().groupId).toBe('group-123');
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/groups',
        headers: athleteHeaders,
        payload: {
          name: 'Offense',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/groups',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          name: 'Offense',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows TeamAdmin role', async () => {
      mockService.createGroup.mockResolvedValue(mockGroup);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/groups',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
        payload: { name: 'Defense' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows TeamManager role', async () => {
      mockService.createGroup.mockResolvedValue(mockGroup);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/groups',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
        payload: { name: 'Special Teams' },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /teams/:teamId/groups', () => {
    it('returns list of groups', async () => {
      mockService.listGroupsByTeam.mockResolvedValue({
        items: [mockGroup],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/teams/team-456/groups',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listGroupsByTeam.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/groups?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockService.listGroupsByTeam).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: 'abc', limit: 10 },
      );
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listGroupsByTeam.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/groups',
        headers: orgAdminHeaders,
      });
      expect(mockService.listGroupsByTeam).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: undefined, limit: undefined },
      );
    });
  });

  describe('GET /groups/:groupId', () => {
    it('returns group by id', async () => {
      mockService.getGroup.mockResolvedValue(mockGroup);
      const res = await app.inject({
        method: 'GET',
        url: '/groups/group-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().groupId).toBe('group-123');
      expect(mockService.getGroup).toHaveBeenCalledWith('org-789', 'group-123');
    });
  });

  describe('PUT /groups/:groupId', () => {
    it('updates group', async () => {
      const updated = { ...mockGroup, name: 'Updated' };
      mockService.updateGroup.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/groups/group-123',
        headers: orgAdminHeaders,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Updated');
      expect(mockService.updateGroup).toHaveBeenCalledWith(
        'org-789',
        'group-123',
        expect.objectContaining({ name: 'Updated' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/groups/group-123',
        headers: athleteHeaders,
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /groups/:groupId', () => {
    it('deletes group and returns 204', async () => {
      mockService.deleteGroup.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/groups/group-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.deleteGroup).toHaveBeenCalledWith('org-789', 'group-123');
    });

    it('rejects OrgManager with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/groups/group-123',
        headers: { 'x-user-role': 'OrgManager', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows SuperAdmin to delete', async () => {
      mockService.deleteGroup.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/groups/group-123',
        headers: { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows TeamAdmin to delete', async () => {
      mockService.deleteGroup.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/groups/group-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
