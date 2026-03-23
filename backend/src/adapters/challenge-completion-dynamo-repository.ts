import type { CreateChallengeCompletionDto, ChallengeCompletion } from '../domain/challenge-completion.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { ChallengeCompletionEntity } from '../entities/challenge-completion.js';
import type { ChallengeCompletionRepository } from '../ports/challenge-completion-repository.js';

export class ChallengeCompletionDynamoRepository implements ChallengeCompletionRepository {
  async create(
    completion: CreateChallengeCompletionDto & { completionId: string; challengeId: string; teamId: string; organizationId: string; completedBy: string; completedAt: string },
  ): Promise<ChallengeCompletion> {
    const result = await ChallengeCompletionEntity.create({
      completionId: completion.completionId,
      challengeId: completion.challengeId,
      groupId: completion.groupId,
      teamId: completion.teamId,
      organizationId: completion.organizationId,
      completedBy: completion.completedBy,
      completedAt: completion.completedAt,
      notes: completion.notes ?? '',
      status: completion.status ?? 'completed',
    }).go();

    return result.data as unknown as ChallengeCompletion;
  }

  async getById(organizationId: string, completionId: string): Promise<ChallengeCompletion | null> {
    const result = await ChallengeCompletionEntity.get({
      organizationId,
      completionId,
    }).go();

    return (result.data as unknown as ChallengeCompletion) ?? null;
  }

  async getByChallengeAndGroup(
    organizationId: string,
    challengeId: string,
    groupId: string,
  ): Promise<ChallengeCompletion | null> {
    const result = await ChallengeCompletionEntity.query
      .byChallenge({ organizationId, challengeId, groupId })
      .go();

    const items = result.data;
    if (items.length === 0) {
      return null;
    }

    return items[0] as unknown as ChallengeCompletion;
  }

  async listByChallenge(
    organizationId: string,
    challengeId: string,
    options?: ListOptions,
  ): Promise<ListResult<ChallengeCompletion>> {
    const query = ChallengeCompletionEntity.query
      .byChallenge({ organizationId, challengeId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as ChallengeCompletion[],
      cursor: result.cursor ?? undefined,
    };
  }

  async listByGroup(
    organizationId: string,
    groupId: string,
    options?: ListOptions,
  ): Promise<ListResult<ChallengeCompletion>> {
    const query = ChallengeCompletionEntity.query
      .byGroup({ organizationId, groupId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as ChallengeCompletion[],
      cursor: result.cursor ?? undefined,
    };
  }

  async delete(organizationId: string, completionId: string): Promise<void> {
    await ChallengeCompletionEntity.delete({
      organizationId,
      completionId,
    }).go();
  }
}
