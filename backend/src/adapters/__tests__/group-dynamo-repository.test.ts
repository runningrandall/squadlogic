import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/group.js', () => ({
  GroupEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byTeam: vi.fn(() => ({ go: mockGo })),
      allGroups: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { GroupDynamoRepository } = await import(
  '../group-dynamo-repository.js'
);
const { GroupEntity } = await import(
  '../../entities/group.js'
);

const mockGroup = {
  groupId: 'group-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  name: 'Offense',
  description: 'Offense unit',
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GroupDynamoRepository', () => {
  let repo: InstanceType<typeof GroupDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new GroupDynamoRepository();
  });

  describe('create', () => {
    it('creates group via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockGroup });
      const result = await repo.create({ ...mockGroup });
      expect(GroupEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockGroup);
    });
  });

  describe('getById', () => {
    it('returns group when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockGroup });
      const result = await repo.getById('org-789', 'group-123');
      expect(GroupEntity.get).toHaveBeenCalledWith({ organizationId: 'org-789', groupId: 'group-123' });
      expect(result).toEqual(mockGroup);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-789', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByTeam', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockGroup], cursor: 'next-page' });
      const result = await repo.listByTeam('org-789', 'team-456', { limit: 10 });
      expect(result.items).toEqual([mockGroup]);
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
      expect(GroupEntity.query.byTeam).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates group', async () => {
      const updated = { ...mockGroup, name: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-789', 'group-123', { name: 'Updated' });
      expect(GroupEntity.patch).toHaveBeenCalledWith({ organizationId: 'org-789', groupId: 'group-123' });
      expect(mockSet).toHaveBeenCalledWith({ name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-789', 'missing', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes group', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-789', 'group-123');
      expect(GroupEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-789', groupId: 'group-123' });
    });
  });
});
