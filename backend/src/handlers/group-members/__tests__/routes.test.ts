import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockGroupMemberService = {
  addMember: vi.fn(),
  getMember: vi.fn(),
  listGroupMembers: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
};

const mockGroupService = {
  createGroup: vi.fn(),
  getGroup: vi.fn(),
  listGroupsByTeam: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
};

vi.mock('../../../adapters/group-member-dynamo-repository.js', () => ({
  GroupMemberDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/group-dynamo-repository.js', () => ({
  GroupDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/group-member-service.js', () => ({
  GroupMemberService: vi.fn(() => mockGroupMemberService),
}));

vi.mock('../../../application/group-service.js', () => ({
  GroupService: vi.fn(() => mockGroupService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: groupMemberRoutes } = await import('../routes.js');

const mockGroup = {
  groupId: 'group-456',
  teamId: 'team-789',
  organizationId: 'org-001',
  name: 'Offense',
  description: '',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockMember = {
  groupMemberId: 'gm-123',
  groupId: 'group-456',
  teamId: 'team-789',
  organizationId: 'org-001',
  athleteId: 'athlete-002',
  role: 'member',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const orgAdminHeaders = {
  'x-user-role': 'OrgAdmin',
  'x-organization-id': 'org-001',
};

const athleteHeaders = {
  'x-user-role': 'Athlete',
  'x-organization-id': 'org-001',
};

describe('GroupMember routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(groupMemberRoutes);
  });

  describe('POST /groups/:groupId/members', () => {
    it('adds member and returns 201', async () => {
      mockGroupService.getGroup.mockResolvedValue(mockGroup);
      mockGroupMemberService.addMember.mockResolvedValue(mockMember);
      const res = await app.inject({
        method: 'POST',
        url: '/groups/group-456/members',
        headers: orgAdminHeaders,
        payload: {
          athleteId: 'athlete-002',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().groupMemberId).toBe('gm-123');
    });

    it('fetches group to get teamId', async () => {
      mockGroupService.getGroup.mockResolvedValue(mockGroup);
      mockGroupMemberService.addMember.mockResolvedValue(mockMember);
      await app.inject({
        method: 'POST',
        url: '/groups/group-456/members',
        headers: orgAdminHeaders,
        payload: {
          athleteId: 'athlete-002',
        },
      });
      expect(mockGroupService.getGroup).toHaveBeenCalledWith('org-001', 'group-456');
      expect(mockGroupMemberService.addMember).toHaveBeenCalledWith(
        'org-001',
        'group-456',
        'team-789',
        expect.objectContaining({ athleteId: 'athlete-002' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/groups/group-456/members',
        headers: athleteHeaders,
        payload: {
          athleteId: 'athlete-002',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/groups/group-456/members',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          athleteId: 'athlete-002',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows TeamManager role', async () => {
      mockGroupService.getGroup.mockResolvedValue(mockGroup);
      mockGroupMemberService.addMember.mockResolvedValue(mockMember);
      const res = await app.inject({
        method: 'POST',
        url: '/groups/group-456/members',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-001' },
        payload: {
          athleteId: 'athlete-003',
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /groups/:groupId/members', () => {
    it('returns list of group members', async () => {
      mockGroupMemberService.listGroupMembers.mockResolvedValue({
        items: [mockMember],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/groups/group-456/members',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockGroupMemberService.listGroupMembers.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/groups/group-456/members?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockGroupMemberService.listGroupMembers).toHaveBeenCalledWith(
        'org-001',
        'group-456',
        { cursor: 'abc', limit: 10 },
      );
    });

    it('passes undefined limit when not provided', async () => {
      mockGroupMemberService.listGroupMembers.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/groups/group-456/members',
        headers: orgAdminHeaders,
      });
      expect(mockGroupMemberService.listGroupMembers).toHaveBeenCalledWith(
        'org-001',
        'group-456',
        { cursor: undefined, limit: undefined },
      );
    });
  });

  describe('PUT /group-members/:groupMemberId', () => {
    it('updates group member', async () => {
      const updated = { ...mockMember, role: 'leader' };
      mockGroupMemberService.updateMember.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/group-members/gm-123',
        headers: orgAdminHeaders,
        payload: { role: 'leader' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().role).toBe('leader');
      expect(mockGroupMemberService.updateMember).toHaveBeenCalledWith(
        'org-001',
        'gm-123',
        expect.objectContaining({ role: 'leader' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/group-members/gm-123',
        headers: athleteHeaders,
        payload: { role: 'leader' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /group-members/:groupMemberId', () => {
    it('removes group member and returns 204', async () => {
      mockGroupMemberService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/group-members/gm-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockGroupMemberService.removeMember).toHaveBeenCalledWith('org-001', 'gm-123');
    });

    it('rejects TeamManager with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/group-members/gm-123',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-001' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows SuperAdmin to delete', async () => {
      mockGroupMemberService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/group-members/gm-123',
        headers: { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-001' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows TeamAdmin to delete', async () => {
      mockGroupMemberService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/group-members/gm-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-001' },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
