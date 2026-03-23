import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockService = {
  addMember: vi.fn(),
  getMember: vi.fn(),
  listTeamMembers: vi.fn(),
  listMemberTeams: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
};

vi.mock('../../../adapters/team-member-dynamo-repository.js', () => ({
  TeamMemberDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/team-member-service.js', () => ({
  TeamMemberService: vi.fn(() => mockService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: teamMemberRoutes } = await import('../routes.js');

const mockMember = {
  teamMemberId: 'tm-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  memberId: 'athlete-001',
  memberType: 'athlete',
  role: 'player',
  jerseyNumber: '42',
  status: 'active',
  joinedAt: '2026-01-01T00:00:00.000Z',
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

describe('TeamMember routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(teamMemberRoutes);
  });

  describe('POST /teams/:teamId/members', () => {
    it('adds member and returns 201', async () => {
      mockService.addMember.mockResolvedValue(mockMember);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/members',
        headers: orgAdminHeaders,
        payload: {
          memberId: 'athlete-001',
          memberType: 'athlete',
          role: 'player',
          jerseyNumber: '42',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().teamMemberId).toBe('tm-123');
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/members',
        headers: athleteHeaders,
        payload: {
          memberId: 'athlete-001',
          memberType: 'athlete',
          role: 'player',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/members',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          memberId: 'athlete-001',
          memberType: 'athlete',
          role: 'player',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows TeamManager role', async () => {
      mockService.addMember.mockResolvedValue(mockMember);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/members',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
        payload: {
          memberId: 'athlete-002',
          memberType: 'athlete',
          role: 'player',
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /teams/:teamId/members', () => {
    it('returns list of team members', async () => {
      mockService.listTeamMembers.mockResolvedValue({
        items: [mockMember],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/teams/team-456/members',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockService.listTeamMembers.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/members?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockService.listTeamMembers).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: 'abc', limit: 10 },
      );
    });

    it('passes undefined limit when not provided', async () => {
      mockService.listTeamMembers.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/members',
        headers: orgAdminHeaders,
      });
      expect(mockService.listTeamMembers).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: undefined, limit: undefined },
      );
    });
  });

  describe('GET /team-members/:teamMemberId', () => {
    it('returns team member by id', async () => {
      mockService.getMember.mockResolvedValue(mockMember);
      const res = await app.inject({
        method: 'GET',
        url: '/team-members/tm-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().teamMemberId).toBe('tm-123');
      expect(mockService.getMember).toHaveBeenCalledWith('org-789', 'tm-123');
    });
  });

  describe('PUT /team-members/:teamMemberId', () => {
    it('updates team member', async () => {
      const updated = { ...mockMember, role: 'captain' };
      mockService.updateMember.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/team-members/tm-123',
        headers: orgAdminHeaders,
        payload: { role: 'captain' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().role).toBe('captain');
      expect(mockService.updateMember).toHaveBeenCalledWith(
        'org-789',
        'tm-123',
        expect.objectContaining({ role: 'captain' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/team-members/tm-123',
        headers: athleteHeaders,
        payload: { role: 'captain' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /team-members/:teamMemberId', () => {
    it('removes team member and returns 204', async () => {
      mockService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/team-members/tm-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockService.removeMember).toHaveBeenCalledWith('org-789', 'tm-123');
    });

    it('rejects OrgManager with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/team-members/tm-123',
        headers: { 'x-user-role': 'OrgManager', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows SuperAdmin to delete', async () => {
      mockService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/team-members/tm-123',
        headers: { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows TeamAdmin to delete', async () => {
      mockService.removeMember.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/team-members/tm-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
