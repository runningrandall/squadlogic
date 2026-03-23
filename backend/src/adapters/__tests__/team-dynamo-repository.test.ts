import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockRemove = vi.fn(() => ({ go: mockGo }));
const mockSet = vi.fn(() => ({ go: mockGo, remove: mockRemove }));

vi.mock('../../entities/team.js', () => ({
  TeamEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byOrganization: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { TeamDynamoRepository } = await import(
  '../team-dynamo-repository.js'
);
const { TeamEntity } = await import(
  '../../entities/team.js'
);

const mockTeam = {
  teamId: 'team-123',
  organizationId: 'org-123',
  name: 'Varsity Football',
  sport: 'Football',
  season: 'Fall 2026',
  status: 'active' as const,
  description: 'The varsity football team',
  maxRosterSize: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TeamDynamoRepository', () => {
  let repo: InstanceType<typeof TeamDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TeamDynamoRepository();
  });

  describe('create', () => {
    it('creates team via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockTeam });
      const result = await repo.create({ ...mockTeam });
      expect(TeamEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockTeam);
    });

    it('creates team without maxRosterSize when null', async () => {
      const teamWithoutMax = { ...mockTeam, maxRosterSize: null };
      mockGo.mockResolvedValueOnce({ data: teamWithoutMax });
      const result = await repo.create({ ...teamWithoutMax });
      expect(TeamEntity.create).toHaveBeenCalled();
      expect(result).toEqual(teamWithoutMax);
    });
  });

  describe('getById', () => {
    it('returns team when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockTeam });
      const result = await repo.getById('org-123', 'team-123');
      expect(TeamEntity.get).toHaveBeenCalledWith({
        organizationId: 'org-123',
        teamId: 'team-123',
      });
      expect(result).toEqual(mockTeam);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-123', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByOrganization', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockTeam], cursor: 'next-page' });
      const result = await repo.listByOrganization('org-123', { limit: 10 });
      expect(result.items).toEqual([mockTeam]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByOrganization('org-123');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByOrganization('org-123', { cursor: 'abc', limit: 5 });
      expect(TeamEntity.query.byOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });
    });
  });

  describe('update', () => {
    it('updates team', async () => {
      const updated = { ...mockTeam, name: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', 'team-123', { name: 'Updated' });
      expect(TeamEntity.patch).toHaveBeenCalledWith({
        organizationId: 'org-123',
        teamId: 'team-123',
      });
      expect(mockSet).toHaveBeenCalledWith({ name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('updates team with maxRosterSize value', async () => {
      const updated = { ...mockTeam, maxRosterSize: 30 };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', 'team-123', { maxRosterSize: 30 });
      expect(mockSet).toHaveBeenCalledWith({ maxRosterSize: 30 });
      expect(result).toEqual(updated);
    });

    it('removes maxRosterSize when set to null', async () => {
      const updated = { ...mockTeam, maxRosterSize: null };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', 'team-123', { maxRosterSize: null });
      expect(mockSet).toHaveBeenCalledWith({});
      expect(mockRemove).toHaveBeenCalledWith(['maxRosterSize']);
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-123', 'missing', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes team', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-123', 'team-123');
      expect(TeamEntity.delete).toHaveBeenCalledWith({
        organizationId: 'org-123',
        teamId: 'team-123',
      });
    });
  });
});
