import type { CreateChallengeDto, Challenge, UpdateChallengeDto } from '../domain/challenge.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { ChallengeEntity } from '../entities/challenge.js';
import { NotFoundError } from '../lib/errors.js';
import type { ChallengeRepository } from '../ports/challenge-repository.js';

export class ChallengeDynamoRepository implements ChallengeRepository {
  async create(
    challenge: CreateChallengeDto & { challengeId: string; organizationId: string; createdBy: string },
  ): Promise<Challenge> {
    const result = await ChallengeEntity.create({
      challengeId: challenge.challengeId,
      organizationId: challenge.organizationId,
      teamId: challenge.teamId,
      title: challenge.title,
      description: challenge.description ?? '',
      dueDate: challenge.dueDate ?? undefined,
      status: 'active',
      points: challenge.points ?? 0,
      createdBy: challenge.createdBy,
    }).go();

    return result.data as unknown as Challenge;
  }

  async getById(organizationId: string, challengeId: string): Promise<Challenge | null> {
    const result = await ChallengeEntity.get({
      organizationId,
      challengeId,
    }).go();

    return (result.data as unknown as Challenge) ?? null;
  }

  async listByTeam(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<Challenge>> {
    const query = ChallengeEntity.query
      .byTeam({ organizationId, teamId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Challenge[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    challengeId: string,
    data: UpdateChallengeDto,
  ): Promise<Challenge> {
    const { dueDate, ...rest } = data;
    const setData: Record<string, unknown> = { ...rest };
    if (dueDate !== undefined) {
      setData.dueDate = dueDate ?? undefined;
    }
    const result = await ChallengeEntity.patch({
      organizationId,
      challengeId,
    })
      .set(setData)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Challenge ${challengeId} not found`);
    }

    return result.data as unknown as Challenge;
  }

  async delete(organizationId: string, challengeId: string): Promise<void> {
    await ChallengeEntity.delete({
      organizationId,
      challengeId,
    }).go();
  }
}
