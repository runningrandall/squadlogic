import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/group-member.js', () => ({
  GroupMemberEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byGroup: vi.fn(() => ({ go: mockGo })),
      byAthlete: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { GroupMemberDynamoRepository } = await import(
  '../group-member-dynamo-repository.js'
);
const { GroupMemberEntity } = await import(
  '../../entities/group-member.js'
);

const mockMember = {
  groupMemberId: 'gm-123',
  groupId: 'group-456',
  teamId: 'team-789',
  organizationId: 'org-001',
  athleteId: 'athlete-002',
  role: 'member' as const,
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GroupMemberDynamoRepository', () => {
  let repo: InstanceType<typeof GroupMemberDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new GroupMemberDynamoRepository();
  });

  describe('add', () => {
    it('creates group member via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockMember });
      const result = await repo.add({ ...mockMember });
      expect(GroupMemberEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    it('creates group member without role (uses default "member")', async () => {
      const noRole = { ...mockMember, role: undefined };
      mockGo.mockResolvedValueOnce({ data: mockMember });
      await repo.add(noRole as any);
      expect(GroupMemberEntity.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns group member when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockMember });
      const result = await repo.getById('org-001', 'gm-123');
      expect(GroupMemberEntity.get).toHaveBeenCalledWith({ organizationId: 'org-001', groupMemberId: 'gm-123' });
      expect(result).toEqual(mockMember);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-001', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByGroupAndAthlete', () => {
    it('returns group member when found', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember] });
      const result = await repo.getByGroupAndAthlete('org-001', 'group-456', 'athlete-002');
      expect(GroupMemberEntity.query.byGroup).toHaveBeenCalledWith({
        organizationId: 'org-001',
        groupId: 'group-456',
        athleteId: 'athlete-002',
      });
      expect(result).toEqual(mockMember);
    });

    it('returns null when no results', async () => {
      mockGo.mockResolvedValueOnce({ data: [] });
      const result = await repo.getByGroupAndAthlete('org-001', 'group-456', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByGroup', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember], cursor: 'next-page' });
      const result = await repo.listByGroup('org-001', 'group-456', { limit: 10 });
      expect(result.items).toEqual([mockMember]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByGroup('org-001', 'group-456');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByGroup('org-001', 'group-456', { cursor: 'abc', limit: 5 });
      expect(GroupMemberEntity.query.byGroup).toHaveBeenCalled();
    });
  });

  describe('listByAthlete', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockMember], cursor: 'next-page' });
      const result = await repo.listByAthlete('org-001', 'athlete-002', { limit: 10 });
      expect(result.items).toEqual([mockMember]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByAthlete('org-001', 'athlete-002');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByAthlete('org-001', 'athlete-002', { cursor: 'abc', limit: 5 });
      expect(GroupMemberEntity.query.byAthlete).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates group member', async () => {
      const updated = { ...mockMember, role: 'leader' as const };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-001', 'gm-123', { role: 'leader' });
      expect(GroupMemberEntity.patch).toHaveBeenCalledWith({ organizationId: 'org-001', groupMemberId: 'gm-123' });
      expect(mockSet).toHaveBeenCalledWith({ role: 'leader' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-001', 'missing', { role: 'leader' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('removes group member', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.remove('org-001', 'gm-123');
      expect(GroupMemberEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-001', groupMemberId: 'gm-123' });
    });
  });
});
