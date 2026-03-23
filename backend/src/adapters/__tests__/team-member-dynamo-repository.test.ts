import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/team-member.js', () => ({
  TeamMemberEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byTeam: vi.fn(() => ({ go: mockGo })),
      byMember: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { TeamMemberDynamoRepository } = await import(
  '../team-member-dynamo-repository.js'
);
const { TeamMemberEntity } = await import(
  '../../entities/team-member.js'
);

const mockMember = {
  teamMemberId: 'tm-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  memberId: 'athlete-001',
  memberType: 'athlete' as const,
  role: 'player' as const,
  jerseyNumber: '42',
  status: 'active' as const,
  joinedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TeamMemberDynamoRepository', () => {
  let repo: InstanceType<typeof TeamMemberDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TeamMemberDynamoRepository();
  });

  describe('add', () => {
    it('creates team member via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockMember });
      const result = await repo.add({ ...mockMember });
      expect(TeamMemberEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });
  });

  describe('getById', () => {
    it('returns team member when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockMember });
      const result = await repo.getById('org-789', 'tm-123');
      expect(TeamMemberEntity.get).toHaveBeenCalledWith({ organizationId: 'org-789', teamMemberId: 'tm-123' });
      expect(result).toEqual(mockMember);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-789', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByTeamAndMember', () => {
    it('returns team member when found', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember] });
      const result = await repo.getByTeamAndMember('org-789', 'team-456', 'athlete', 'athlete-001');
      expect(TeamMemberEntity.query.byTeam).toHaveBeenCalledWith({
        organizationId: 'org-789',
        teamId: 'team-456',
        memberType: 'athlete',
        memberId: 'athlete-001',
      });
      expect(result).toEqual(mockMember);
    });

    it('returns null when no results', async () => {
      mockGo.mockResolvedValueOnce({ data: [] });
      const result = await repo.getByTeamAndMember('org-789', 'team-456', 'athlete', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByTeam', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember], cursor: 'next-page' });
      const result = await repo.listByTeam('org-789', 'team-456', { limit: 10 });
      expect(result.items).toEqual([mockMember]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByTeam('org-789', 'team-456');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByTeam('org-789', 'team-456', { cursor: 'abc', limit: 5 });
      expect(TeamMemberEntity.query.byTeam).toHaveBeenCalled();
    });
  });

  describe('listByMember', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember], cursor: 'next-page' });
      const result = await repo.listByMember('org-789', 'athlete-001', { limit: 10 });
      expect(result.items).toEqual([mockMember]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByMember('org-789', 'athlete-001');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates team member', async () => {
      const updated = { ...mockMember, role: 'captain' as const };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-789', 'tm-123', { role: 'captain' });
      expect(TeamMemberEntity.patch).toHaveBeenCalledWith({ organizationId: 'org-789', teamMemberId: 'tm-123' });
      expect(mockSet).toHaveBeenCalledWith({ role: 'captain' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-789', 'missing', { role: 'captain' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('removes team member', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.remove('org-789', 'tm-123');
      expect(TeamMemberEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-789', teamMemberId: 'tm-123' });
    });
  });
});
