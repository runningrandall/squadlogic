import Fastify from 'fastify';
import authPlugin from '../../../lib/auth.js';
import errorHandlerPlugin from '../../../lib/errors.js';

const mockChallengeService = {
  createChallenge: vi.fn(),
  getChallenge: vi.fn(),
  listChallengesByTeam: vi.fn(),
  updateChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
};

const mockCompletionService = {
  markCompleted: vi.fn(),
  listByChallenge: vi.fn(),
  listByGroup: vi.fn(),
  removeCompletion: vi.fn(),
};

vi.mock('../../../adapters/challenge-dynamo-repository.js', () => ({
  ChallengeDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/challenge-completion-dynamo-repository.js', () => ({
  ChallengeCompletionDynamoRepository: vi.fn(),
}));

vi.mock('../../../adapters/eventbridge-publisher.js', () => ({
  EventBridgePublisher: vi.fn(),
}));

vi.mock('../../../application/challenge-service.js', () => ({
  ChallengeService: vi.fn(() => mockChallengeService),
}));

vi.mock('../../../application/challenge-completion-service.js', () => ({
  ChallengeCompletionService: vi.fn(() => mockCompletionService),
}));

vi.mock('../../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

vi.mock('../../../lib/eventbridge.js', () => ({
  putEvent: vi.fn(),
  eventBridgeClient: {},
}));

const { default: challengeRoutes } = await import('../routes.js');

const mockChallenge = {
  challengeId: 'challenge-123',
  teamId: 'team-456',
  organizationId: 'org-789',
  title: 'Sprint Challenge',
  description: 'Run fast',
  dueDate: '2026-04-01',
  status: 'active',
  points: 10,
  createdBy: 'user-001',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCompletion = {
  completionId: 'comp-123',
  challengeId: 'challenge-123',
  groupId: 'group-456',
  teamId: 'team-456',
  organizationId: 'org-789',
  completedBy: 'dev-user',
  completedAt: '2026-01-15T12:00:00.000Z',
  notes: 'Good job',
  status: 'completed',
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

describe('Challenge routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    await app.register(challengeRoutes);
  });

  describe('POST /teams/:teamId/challenges', () => {
    it('creates challenge and returns 201', async () => {
      mockChallengeService.createChallenge.mockResolvedValue(mockChallenge);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/challenges',
        headers: orgAdminHeaders,
        payload: {
          title: 'Sprint Challenge',
          description: 'Run fast',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().challengeId).toBe('challenge-123');
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/challenges',
        headers: athleteHeaders,
        payload: {
          title: 'Sprint Challenge',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/challenges',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          title: 'Sprint Challenge',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows TeamAdmin role', async () => {
      mockChallengeService.createChallenge.mockResolvedValue(mockChallenge);
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/challenges',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
        payload: { title: 'Defense Drill' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects TeamManager with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/teams/team-456/challenges',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
        payload: { title: 'Test' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /teams/:teamId/challenges', () => {
    it('returns list of challenges', async () => {
      mockChallengeService.listChallengesByTeam.mockResolvedValue({
        items: [mockChallenge],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/teams/team-456/challenges',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockChallengeService.listChallengesByTeam.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/challenges?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockChallengeService.listChallengesByTeam).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: 'abc', limit: 10 },
      );
    });

    it('passes undefined limit when not provided', async () => {
      mockChallengeService.listChallengesByTeam.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/teams/team-456/challenges',
        headers: orgAdminHeaders,
      });
      expect(mockChallengeService.listChallengesByTeam).toHaveBeenCalledWith(
        'org-789',
        'team-456',
        { cursor: undefined, limit: undefined },
      );
    });
  });

  describe('GET /challenges/:challengeId', () => {
    it('returns challenge by id', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      const res = await app.inject({
        method: 'GET',
        url: '/challenges/challenge-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().challengeId).toBe('challenge-123');
      expect(mockChallengeService.getChallenge).toHaveBeenCalledWith('org-789', 'challenge-123');
    });
  });

  describe('PUT /challenges/:challengeId', () => {
    it('updates challenge', async () => {
      const updated = { ...mockChallenge, title: 'Updated' };
      mockChallengeService.updateChallenge.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PUT',
        url: '/challenges/challenge-123',
        headers: orgAdminHeaders,
        payload: { title: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Updated');
      expect(mockChallengeService.updateChallenge).toHaveBeenCalledWith(
        'org-789',
        'challenge-123',
        expect.objectContaining({ title: 'Updated' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/challenges/challenge-123',
        headers: athleteHeaders,
        payload: { title: 'Updated' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /challenges/:challengeId', () => {
    it('deletes challenge and returns 204', async () => {
      mockChallengeService.deleteChallenge.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenges/challenge-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockChallengeService.deleteChallenge).toHaveBeenCalledWith('org-789', 'challenge-123');
    });

    it('rejects TeamManager with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenges/challenge-123',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows SuperAdmin to delete', async () => {
      mockChallengeService.deleteChallenge.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenges/challenge-123',
        headers: { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows TeamAdmin to delete', async () => {
      mockChallengeService.deleteChallenge.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenges/challenge-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('POST /challenges/:challengeId/completions', () => {
    it('creates completion and returns 201', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      mockCompletionService.markCompleted.mockResolvedValue(mockCompletion);
      const res = await app.inject({
        method: 'POST',
        url: '/challenges/challenge-123/completions',
        headers: orgAdminHeaders,
        payload: {
          groupId: 'group-456',
          notes: 'Good job',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().completionId).toBe('comp-123');
    });

    it('fetches challenge to get teamId', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      mockCompletionService.markCompleted.mockResolvedValue(mockCompletion);
      await app.inject({
        method: 'POST',
        url: '/challenges/challenge-123/completions',
        headers: orgAdminHeaders,
        payload: {
          groupId: 'group-456',
        },
      });
      expect(mockChallengeService.getChallenge).toHaveBeenCalledWith('org-789', 'challenge-123');
      expect(mockCompletionService.markCompleted).toHaveBeenCalledWith(
        'org-789',
        'challenge-123',
        'team-456',
        'dev-user',
        expect.objectContaining({ groupId: 'group-456' }),
      );
    });

    it('rejects Athlete with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/challenges/challenge-123/completions',
        headers: athleteHeaders,
        payload: {
          groupId: 'group-456',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows TeamManager role', async () => {
      mockChallengeService.getChallenge.mockResolvedValue(mockChallenge);
      mockCompletionService.markCompleted.mockResolvedValue(mockCompletion);
      const res = await app.inject({
        method: 'POST',
        url: '/challenges/challenge-123/completions',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
        payload: {
          groupId: 'group-456',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('rejects missing org context with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/challenges/challenge-123/completions',
        headers: { 'x-user-role': 'OrgAdmin' },
        payload: {
          groupId: 'group-456',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /challenges/:challengeId/completions', () => {
    it('returns list of completions', async () => {
      mockCompletionService.listByChallenge.mockResolvedValue({
        items: [mockCompletion],
        cursor: undefined,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/challenges/challenge-123/completions',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(1);
    });

    it('passes cursor and limit query params', async () => {
      mockCompletionService.listByChallenge.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/challenges/challenge-123/completions?cursor=abc&limit=10',
        headers: orgAdminHeaders,
      });
      expect(mockCompletionService.listByChallenge).toHaveBeenCalledWith(
        'org-789',
        'challenge-123',
        { cursor: 'abc', limit: 10 },
      );
    });

    it('passes undefined limit when not provided', async () => {
      mockCompletionService.listByChallenge.mockResolvedValue({
        items: [],
        cursor: undefined,
      });
      await app.inject({
        method: 'GET',
        url: '/challenges/challenge-123/completions',
        headers: orgAdminHeaders,
      });
      expect(mockCompletionService.listByChallenge).toHaveBeenCalledWith(
        'org-789',
        'challenge-123',
        { cursor: undefined, limit: undefined },
      );
    });
  });

  describe('DELETE /challenge-completions/:completionId', () => {
    it('removes completion and returns 204', async () => {
      mockCompletionService.removeCompletion.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenge-completions/comp-123',
        headers: orgAdminHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(mockCompletionService.removeCompletion).toHaveBeenCalledWith('org-789', 'comp-123');
    });

    it('rejects TeamManager with 403', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenge-completions/comp-123',
        headers: { 'x-user-role': 'TeamManager', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows SuperAdmin to delete', async () => {
      mockCompletionService.removeCompletion.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenge-completions/comp-123',
        headers: { 'x-user-role': 'SuperAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows TeamAdmin to delete', async () => {
      mockCompletionService.removeCompletion.mockResolvedValue(undefined);
      const res = await app.inject({
        method: 'DELETE',
        url: '/challenge-completions/comp-123',
        headers: { 'x-user-role': 'TeamAdmin', 'x-organization-id': 'org-789' },
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
