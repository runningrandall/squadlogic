import { randomUUID } from 'node:crypto';
import type {
  CreateChallengeCompletionDto,
  ChallengeCompletion,
} from '../domain/challenge-completion.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { ChallengeCompletionRepository } from '../ports/challenge-completion-repository.js';

export class ChallengeCompletionService {
  constructor(
    private readonly repository: ChallengeCompletionRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async markCompleted(
    organizationId: string,
    challengeId: string,
    teamId: string,
    completedBy: string,
    dto: CreateChallengeCompletionDto,
  ): Promise<ChallengeCompletion> {
    const existing = await this.repository.getByChallengeAndGroup(
      organizationId,
      challengeId,
      dto.groupId,
    );
    if (existing) {
      throw new ConflictError(
        `Group ${dto.groupId} already completed challenge ${challengeId}`,
      );
    }

    const completionId = randomUUID();

    const completion = await this.repository.create({
      ...dto,
      completionId,
      challengeId,
      teamId,
      organizationId,
      completedBy,
      completedAt: new Date().toISOString(),
    });

    await this.eventPublisher.publish('ChallengeCompleted', {
      organizationId,
      challengeId,
      teamId,
      completionId: completion.completionId,
      groupId: dto.groupId,
      completedBy,
    });

    return completion;
  }

  async listByChallenge(
    organizationId: string,
    challengeId: string,
    options?: ListOptions,
  ): Promise<ListResult<ChallengeCompletion>> {
    return this.repository.listByChallenge(organizationId, challengeId, options);
  }

  async listByGroup(
    organizationId: string,
    groupId: string,
    options?: ListOptions,
  ): Promise<ListResult<ChallengeCompletion>> {
    return this.repository.listByGroup(organizationId, groupId, options);
  }

  async removeCompletion(
    organizationId: string,
    completionId: string,
  ): Promise<void> {
    const existing = await this.repository.getById(organizationId, completionId);
    if (!existing) {
      throw new NotFoundError(`ChallengeCompletion ${completionId} not found`);
    }

    await this.repository.delete(organizationId, completionId);

    await this.eventPublisher.publish('ChallengeCompletionRemoved', {
      organizationId,
      challengeId: existing.challengeId,
      teamId: existing.teamId,
      completionId,
      groupId: existing.groupId,
      completedBy: existing.completedBy,
    });
  }
}
