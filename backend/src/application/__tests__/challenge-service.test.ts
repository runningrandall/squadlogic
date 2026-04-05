import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeService } from '../challenge-service.js';
import type { ChallengeRepository } from '../../ports/challenge-repository.js';
import type { ChallengeCompletionRepository } from '../../ports/challenge-completion-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Challenge } from '../../domain/challenge.js';
import type { ChallengeCompletion } from '../../domain/challenge-completion.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockChallenge(
  overrides: Partial<Challenge> = {},
): Challenge {
  return {
    challengeId: 'challenge-123',
    teamId: 'team-456',
    organizationId: 'org-789',
    title: 'Sprint Challenge',
    description: 'Run fast',
    dueDate: '2026-04-01',
    routeUrl: null,
    status: 'active',
    points: 10,
    createdBy: 'user-001',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockCompletion(
  overrides: Partial<ChallengeCompletion> = {},
): ChallengeCompletion {
  return {
    completionId: 'completion-001',
    challengeId: 'challenge-123',
    groupId: 'squad-a',
    teamId: 'team-456',
    organizationId: 'org-789',
    completedBy: 'user-001',
    completedAt: '2026-01-02T00:00:00.000Z',
    notes: '',
    status: 'completed',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): ChallengeRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    listByTeam: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockCompletionRepository(): ChallengeCompletionRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    getByChallengeAndGroup: vi.fn(),
    listByChallenge: vi.fn(),
    listByGroup: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('ChallengeService', () => {
  let service: ChallengeService;
  let repository: ChallengeRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new ChallengeService(repository, publisher);
  });

  describe('createChallenge', () => {
    it('should create a challenge and publish event', async () => {
      const dto = {
        title: 'Sprint Challenge',
        description: 'Run fast',
        dueDate: '2026-04-01' as string | null,
        points: 10,
      };

      const mockChallenge = createMockChallenge({
        title: dto.title,
        description: dto.description,
      });

      vi.mocked(repository.create).mockResolvedValue(mockChallenge);

      const result = await service.createChallenge('org-789', 'team-456', 'user-001', dto);

      expect(result).toEqual(mockChallenge);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sprint Challenge',
          teamId: 'team-456',
          organizationId: 'org-789',
          createdBy: 'user-001',
          challengeId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'ChallengeCreated',
        expect.objectContaining({
          organizationId: 'org-789',
          teamId: 'team-456',
          challengeId: mockChallenge.challengeId,
          title: mockChallenge.title,
        }),
      );
    });
  });

  describe('getChallenge', () => {
    it('should return the challenge by id', async () => {
      const mockChallenge = createMockChallenge();
      vi.mocked(repository.getById).mockResolvedValue(mockChallenge);

      const result = await service.getChallenge('org-789', 'challenge-123');

      expect(result).toEqual(mockChallenge);
      expect(repository.getById).toHaveBeenCalledWith('org-789', 'challenge-123');
    });

    it('should throw NotFoundError if challenge does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getChallenge('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listChallengesByTeam', () => {
    it('should return paginated list of challenges', async () => {
      const mockChallenges = [
        createMockChallenge({ challengeId: 'challenge-1' }),
        createMockChallenge({ challengeId: 'challenge-2' }),
      ];

      vi.mocked(repository.listByTeam).mockResolvedValue({
        items: mockChallenges,
        cursor: undefined,
      });

      const result = await service.listChallengesByTeam('org-789', 'team-456', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByTeam).toHaveBeenCalledWith('org-789', 'team-456', { limit: 10 });
    });
  });

  describe('updateChallenge', () => {
    it('should update the challenge and publish event', async () => {
      const mockChallenge = createMockChallenge();
      const updatedChallenge = createMockChallenge({ title: 'Updated Title' });

      vi.mocked(repository.getById).mockResolvedValue(mockChallenge);
      vi.mocked(repository.update).mockResolvedValue(updatedChallenge);

      const result = await service.updateChallenge('org-789', 'challenge-123', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(publisher.publish).toHaveBeenCalledWith(
        'ChallengeUpdated',
        expect.objectContaining({
          organizationId: 'org-789',
          challengeId: 'challenge-123',
          changes: ['title'],
        }),
      );
    });

    it('should throw NotFoundError if challenge does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateChallenge('org-789', 'non-existent', { title: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteChallenge', () => {
    it('should delete the challenge and publish event', async () => {
      const mockChallenge = createMockChallenge();
      vi.mocked(repository.getById).mockResolvedValue(mockChallenge);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteChallenge('org-789', 'challenge-123');

      expect(repository.delete).toHaveBeenCalledWith('org-789', 'challenge-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'ChallengeDeleted',
        expect.objectContaining({
          organizationId: 'org-789',
          challengeId: 'challenge-123',
          title: 'Sprint Challenge',
        }),
      );
    });

    it('should throw NotFoundError if challenge does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteChallenge('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getChallengeStats', () => {
    let completionRepository: ChallengeCompletionRepository;
    let statsService: ChallengeService;

    beforeEach(() => {
      completionRepository = createMockCompletionRepository();
      statsService = new ChallengeService(repository, publisher, completionRepository);
    });

    it('should return zeroed stats when no challenges exist', async () => {
      vi.mocked(repository.listByTeam).mockResolvedValue({
        items: [],
        cursor: undefined,
      });

      const stats = await statsService.getChallengeStats('org-789', 'team-456');

      expect(stats).toEqual({
        totalChallenges: 0,
        totalCompletions: 0,
        totalPointsAvailable: 0,
        totalPointsEarned: 0,
        squadStats: [],
      });
    });

    it('should aggregate stats across challenges and completions', async () => {
      const challenge1 = createMockChallenge({
        challengeId: 'c1',
        points: 10,
      });
      const challenge2 = createMockChallenge({
        challengeId: 'c2',
        points: 20,
      });

      vi.mocked(repository.listByTeam).mockResolvedValue({
        items: [challenge1, challenge2],
        cursor: undefined,
      });

      vi.mocked(completionRepository.listByChallenge)
        .mockResolvedValueOnce({
          items: [
            createMockCompletion({ challengeId: 'c1', groupId: 'squad-a' }),
            createMockCompletion({ challengeId: 'c1', groupId: 'squad-b' }),
          ],
          cursor: undefined,
        })
        .mockResolvedValueOnce({
          items: [
            createMockCompletion({ challengeId: 'c2', groupId: 'squad-a' }),
          ],
          cursor: undefined,
        });

      const stats = await statsService.getChallengeStats('org-789', 'team-456');

      expect(stats.totalChallenges).toBe(2);
      expect(stats.totalCompletions).toBe(3);
      expect(stats.totalPointsAvailable).toBe(30);
      expect(stats.totalPointsEarned).toBe(40); // 10 + 10 + 20
      expect(stats.squadStats).toHaveLength(2);

      const squadA = stats.squadStats.find((s) => s.groupId === 'squad-a');
      expect(squadA).toEqual({
        groupId: 'squad-a',
        completionCount: 2,
        pointsEarned: 30, // 10 + 20
      });

      const squadB = stats.squadStats.find((s) => s.groupId === 'squad-b');
      expect(squadB).toEqual({
        groupId: 'squad-b',
        completionCount: 1,
        pointsEarned: 10,
      });
    });

    it('should paginate through all challenges', async () => {
      const challenge1 = createMockChallenge({ challengeId: 'c1', points: 5 });
      const challenge2 = createMockChallenge({ challengeId: 'c2', points: 15 });

      vi.mocked(repository.listByTeam)
        .mockResolvedValueOnce({
          items: [challenge1],
          cursor: 'next-page',
        })
        .mockResolvedValueOnce({
          items: [challenge2],
          cursor: undefined,
        });

      vi.mocked(completionRepository.listByChallenge)
        .mockResolvedValueOnce({ items: [], cursor: undefined })
        .mockResolvedValueOnce({ items: [], cursor: undefined });

      const stats = await statsService.getChallengeStats('org-789', 'team-456');

      expect(stats.totalChallenges).toBe(2);
      expect(stats.totalPointsAvailable).toBe(20);
      expect(repository.listByTeam).toHaveBeenCalledTimes(2);
    });

    it('should throw if completion repository is not provided', async () => {
      const serviceWithoutCompletions = new ChallengeService(repository, publisher);

      await expect(
        serviceWithoutCompletions.getChallengeStats('org-789', 'team-456'),
      ).rejects.toThrow('Completion repository is required for getChallengeStats');
    });
  });
});
