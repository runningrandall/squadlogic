import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/challenge.js', () => ({
  ChallengeEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byTeam: vi.fn(() => ({ go: mockGo })),
      allChallenges: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { ChallengeDynamoRepository } = await import(
  '../challenge-dynamo-repository.js'
);
const { ChallengeEntity } = await import(
  '../../entities/challenge.js'
);

const mockChallenge = {
  challengeId: 'challenge-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  title: 'Sprint Challenge',
  description: 'Run fast',
  dueDate: '2026-04-01',
  routeUrl: null,
  status: 'active' as const,
  points: 10,
  createdBy: 'user-001',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ChallengeDynamoRepository', () => {
  let repo: InstanceType<typeof ChallengeDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ChallengeDynamoRepository();
  });

  describe('create', () => {
    it('creates challenge via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockChallenge });
      const result = await repo.create({ ...mockChallenge });
      expect(ChallengeEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockChallenge);
    });

    it('creates challenge without description/dueDate/points (uses ?? defaults)', async () => {
      const minimal = {
        challengeId: 'c-min', teamId: 'team-1', organizationId: 'org-1', createdBy: 'user-1', title: 'Min',
      };
      mockGo.mockResolvedValueOnce({ data: mockChallenge });
      await repo.create(minimal as any);
      expect(ChallengeEntity.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns challenge when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockChallenge });
      const result = await repo.getById('org-789', 'challenge-123');
      expect(ChallengeEntity.get).toHaveBeenCalledWith({ organizationId: 'org-789', challengeId: 'challenge-123' });
      expect(result).toEqual(mockChallenge);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-789', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByTeam', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockChallenge], cursor: 'next-page' });
      const result = await repo.listByTeam('org-789', 'team-456', { limit: 10 });
      expect(result.items).toEqual([mockChallenge]);
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
      expect(ChallengeEntity.query.byTeam).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates challenge', async () => {
      const updated = { ...mockChallenge, title: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-789', 'challenge-123', { title: 'Updated' });
      expect(ChallengeEntity.patch).toHaveBeenCalledWith({ organizationId: 'org-789', challengeId: 'challenge-123' });
      expect(mockSet).toHaveBeenCalledWith({ title: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-789', 'missing', { title: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('updates challenge with a string dueDate (enters if block, keeps value)', async () => {
      const updated = { ...mockChallenge, dueDate: '2026-06-01' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-789', 'challenge-123', { dueDate: '2026-06-01' });
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2026-06-01' }));
      expect(result.dueDate).toBe('2026-06-01');
    });

    it('updates challenge with null dueDate (enters if block, clears to undefined via ??)', async () => {
      const updated = { ...mockChallenge, dueDate: undefined };
      mockGo.mockResolvedValueOnce({ data: updated });
      await repo.update('org-789', 'challenge-123', { dueDate: null as any });
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ dueDate: undefined }));
    });
  });

  describe('delete', () => {
    it('deletes challenge', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-789', 'challenge-123');
      expect(ChallengeEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-789', challengeId: 'challenge-123' });
    });
  });
});
