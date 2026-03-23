import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeService } from '../challenge-service.js';
import type { ChallengeRepository } from '../../ports/challenge-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Challenge } from '../../domain/challenge.js';
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
    status: 'active',
    points: 10,
    createdBy: 'user-001',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
});
