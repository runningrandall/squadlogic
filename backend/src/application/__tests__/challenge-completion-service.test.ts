import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeCompletionService } from '../challenge-completion-service.js';
import type { ChallengeCompletionRepository } from '../../ports/challenge-completion-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { ChallengeCompletion } from '../../domain/challenge-completion.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

function createMockCompletion(
  overrides: Partial<ChallengeCompletion> = {},
): ChallengeCompletion {
  return {
    completionId: 'comp-123',
    challengeId: 'challenge-456',
    groupId: 'group-789',
    teamId: 'team-001',
    organizationId: 'org-002',
    completedBy: 'user-003',
    completedAt: '2026-01-15T12:00:00.000Z',
    notes: 'Well done',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): ChallengeCompletionRepository {
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

describe('ChallengeCompletionService', () => {
  let service: ChallengeCompletionService;
  let repository: ChallengeCompletionRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new ChallengeCompletionService(repository, publisher);
  });

  describe('markCompleted', () => {
    it('should mark challenge completed and publish event', async () => {
      const dto = {
        groupId: 'group-789',
        notes: 'Well done',
        status: 'completed' as const,
      };

      const mockCompletion = createMockCompletion();

      vi.mocked(repository.getByChallengeAndGroup).mockResolvedValue(null);
      vi.mocked(repository.create).mockResolvedValue(mockCompletion);

      const result = await service.markCompleted('org-002', 'challenge-456', 'team-001', 'user-003', dto);

      expect(result).toEqual(mockCompletion);
      expect(repository.getByChallengeAndGroup).toHaveBeenCalledWith('org-002', 'challenge-456', 'group-789');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'group-789',
          challengeId: 'challenge-456',
          teamId: 'team-001',
          organizationId: 'org-002',
          completedBy: 'user-003',
          completionId: expect.any(String),
          completedAt: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'ChallengeCompleted',
        expect.objectContaining({
          organizationId: 'org-002',
          challengeId: 'challenge-456',
          teamId: 'team-001',
          completionId: mockCompletion.completionId,
          groupId: 'group-789',
          completedBy: 'user-003',
        }),
      );
    });

    it('should throw ConflictError if group already completed challenge', async () => {
      const dto = {
        groupId: 'group-789',
        notes: '',
        status: 'completed' as const,
      };

      vi.mocked(repository.getByChallengeAndGroup).mockResolvedValue(
        createMockCompletion(),
      );

      await expect(
        service.markCompleted('org-002', 'challenge-456', 'team-001', 'user-003', dto),
      ).rejects.toThrow(ConflictError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('listByChallenge', () => {
    it('should return paginated list of completions', async () => {
      const mockCompletions = [
        createMockCompletion({ completionId: 'comp-1' }),
        createMockCompletion({ completionId: 'comp-2' }),
      ];

      vi.mocked(repository.listByChallenge).mockResolvedValue({
        items: mockCompletions,
        cursor: undefined,
      });

      const result = await service.listByChallenge('org-002', 'challenge-456', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByChallenge).toHaveBeenCalledWith('org-002', 'challenge-456', { limit: 10 });
    });
  });

  describe('listByGroup', () => {
    it('should return paginated list of completions by group', async () => {
      const mockCompletions = [
        createMockCompletion({ completionId: 'comp-1' }),
      ];

      vi.mocked(repository.listByGroup).mockResolvedValue({
        items: mockCompletions,
        cursor: undefined,
      });

      const result = await service.listByGroup('org-002', 'group-789', { limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(repository.listByGroup).toHaveBeenCalledWith('org-002', 'group-789', { limit: 10 });
    });
  });

  describe('removeCompletion', () => {
    it('should remove the completion and publish event', async () => {
      const mockCompletion = createMockCompletion();
      vi.mocked(repository.getById).mockResolvedValue(mockCompletion);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.removeCompletion('org-002', 'comp-123');

      expect(repository.delete).toHaveBeenCalledWith('org-002', 'comp-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'ChallengeCompletionRemoved',
        expect.objectContaining({
          organizationId: 'org-002',
          challengeId: 'challenge-456',
          teamId: 'team-001',
          completionId: 'comp-123',
          groupId: 'group-789',
          completedBy: 'user-003',
        }),
      );
    });

    it('should throw NotFoundError if completion does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.removeCompletion('org-002', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
