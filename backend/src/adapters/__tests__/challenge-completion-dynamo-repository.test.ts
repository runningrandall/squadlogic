const mockGo = vi.fn();

vi.mock('../../entities/challenge-completion.js', () => ({
  ChallengeCompletionEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byChallenge: vi.fn(() => ({ go: mockGo })),
      byGroup: vi.fn(() => ({ go: mockGo })),
    },
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { ChallengeCompletionDynamoRepository } = await import(
  '../challenge-completion-dynamo-repository.js'
);
const { ChallengeCompletionEntity } = await import(
  '../../entities/challenge-completion.js'
);

const mockCompletion = {
  completionId: 'comp-123',
  challengeId: 'challenge-456',
  groupId: 'group-789',
  teamId: 'team-001',
  organizationId: 'org-002',
  completedBy: 'user-003',
  completedAt: '2026-01-15T12:00:00.000Z',
  notes: 'Well done',
  status: 'completed' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ChallengeCompletionDynamoRepository', () => {
  let repo: InstanceType<typeof ChallengeCompletionDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ChallengeCompletionDynamoRepository();
  });

  describe('create', () => {
    it('creates completion via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockCompletion });
      const result = await repo.create({ ...mockCompletion });
      expect(ChallengeCompletionEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockCompletion);
    });
  });

  describe('getById', () => {
    it('returns completion when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockCompletion });
      const result = await repo.getById('org-002', 'comp-123');
      expect(ChallengeCompletionEntity.get).toHaveBeenCalledWith({ organizationId: 'org-002', completionId: 'comp-123' });
      expect(result).toEqual(mockCompletion);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-002', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByChallengeAndGroup', () => {
    it('returns completion when found', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockCompletion] });
      const result = await repo.getByChallengeAndGroup('org-002', 'challenge-456', 'group-789');
      expect(ChallengeCompletionEntity.query.byChallenge).toHaveBeenCalledWith({
        organizationId: 'org-002',
        challengeId: 'challenge-456',
        groupId: 'group-789',
      });
      expect(result).toEqual(mockCompletion);
    });

    it('returns null when no results', async () => {
      mockGo.mockResolvedValueOnce({ data: [] });
      const result = await repo.getByChallengeAndGroup('org-002', 'challenge-456', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByChallenge', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockCompletion], cursor: 'next-page' });
      const result = await repo.listByChallenge('org-002', 'challenge-456', { limit: 10 });
      expect(result.items).toEqual([mockCompletion]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByChallenge('org-002', 'challenge-456');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByChallenge('org-002', 'challenge-456', { cursor: 'abc', limit: 5 });
      expect(ChallengeCompletionEntity.query.byChallenge).toHaveBeenCalled();
    });
  });

  describe('listByGroup', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockCompletion], cursor: 'next-page' });
      const result = await repo.listByGroup('org-002', 'group-789', { limit: 10 });
      expect(result.items).toEqual([mockCompletion]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByGroup('org-002', 'group-789');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes completion', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-002', 'comp-123');
      expect(ChallengeCompletionEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-002', completionId: 'comp-123' });
    });
  });
});
