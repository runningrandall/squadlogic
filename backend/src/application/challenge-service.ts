import { randomUUID } from 'node:crypto';
import type {
  CreateChallengeDto,
  Challenge,
  UpdateChallengeDto,
} from '../domain/challenge.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { ChallengeRepository } from '../ports/challenge-repository.js';

export class ChallengeService {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createChallenge(
    organizationId: string,
    teamId: string,
    createdBy: string,
    dto: Omit<CreateChallengeDto, 'teamId'>,
  ): Promise<Challenge> {
    const challengeId = randomUUID();

    const challenge = await this.repository.create({
      ...dto,
      teamId,
      challengeId,
      organizationId,
      createdBy,
    });

    await this.eventPublisher.publish('ChallengeCreated', {
      organizationId,
      teamId,
      challengeId: challenge.challengeId,
      title: challenge.title,
    });

    return challenge;
  }

  async getChallenge(organizationId: string, challengeId: string): Promise<Challenge> {
    const challenge = await this.repository.getById(organizationId, challengeId);
    if (!challenge) {
      throw new NotFoundError(`Challenge ${challengeId} not found`);
    }

    return challenge;
  }

  async listChallengesByTeam(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<Challenge>> {
    return this.repository.listByTeam(organizationId, teamId, options);
  }

  async updateChallenge(
    organizationId: string,
    challengeId: string,
    dto: UpdateChallengeDto,
  ): Promise<Challenge> {
    const existing = await this.repository.getById(organizationId, challengeId);
    if (!existing) {
      throw new NotFoundError(`Challenge ${challengeId} not found`);
    }

    const updated = await this.repository.update(organizationId, challengeId, dto);

    await this.eventPublisher.publish('ChallengeUpdated', {
      organizationId,
      challengeId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteChallenge(organizationId: string, challengeId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, challengeId);
    if (!existing) {
      throw new NotFoundError(`Challenge ${challengeId} not found`);
    }

    await this.repository.delete(organizationId, challengeId);

    await this.eventPublisher.publish('ChallengeDeleted', {
      organizationId,
      challengeId,
      title: existing.title,
    });
  }
}
