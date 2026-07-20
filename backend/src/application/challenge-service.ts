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
import type { ChallengeCompletionRepository } from '../ports/challenge-completion-repository.js';

export interface ChallengeStats {
  totalChallenges: number;
  totalCompletions: number;
  totalPointsAvailable: number;
  totalPointsEarned: number;
  squadStats: Array<{
    groupId: string;
    completionCount: number;
    pointsEarned: number;
  }>;
}

export class ChallengeService {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly completionRepository?: ChallengeCompletionRepository,
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

  async getChallengeStats(
    organizationId: string,
    teamId: string,
  ): Promise<ChallengeStats> {
    if (!this.completionRepository) {
      throw new Error('Completion repository is required for getChallengeStats');
    }

    // Fetch all challenges for the team (paginate through all)
    const allChallenges: Challenge[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.repository.listByTeam(organizationId, teamId, {
        cursor,
        limit: 100,
      });
      allChallenges.push(...page.items);
      cursor = page.cursor;
    } while (cursor);

    const totalChallenges = allChallenges.length;
    const totalPointsAvailable = allChallenges.reduce(
      (sum, c) => sum + c.points,
      0,
    );

    // Build a map of challengeId -> points for quick lookup
    const pointsByChallenge = new Map<string, number>();
    for (const challenge of allChallenges) {
      pointsByChallenge.set(challenge.challengeId, challenge.points);
    }

    // Fetch all completions for each challenge
    let totalCompletions = 0;
    let totalPointsEarned = 0;
    const squadMap = new Map<string, { completionCount: number; pointsEarned: number }>();

    for (const challenge of allChallenges) {
      let completionCursor: string | undefined;
      do {
        const page = await this.completionRepository.listByChallenge(
          organizationId,
          challenge.challengeId,
          { cursor: completionCursor, limit: 100 },
        );
        for (const completion of page.items) {
          totalCompletions++;
          const pts = pointsByChallenge.get(completion.challengeId) ?? 0;
          totalPointsEarned += pts;

          const existing = squadMap.get(completion.groupId);
          if (existing) {
            existing.completionCount++;
            existing.pointsEarned += pts;
          } else {
            squadMap.set(completion.groupId, {
              completionCount: 1,
              pointsEarned: pts,
            });
          }
        }
        completionCursor = page.cursor;
      } while (completionCursor);
    }

    const squadStats = Array.from(squadMap.entries()).map(
      ([groupId, stats]) => ({
        groupId,
        ...stats,
      }),
    );

    return {
      totalChallenges,
      totalCompletions,
      totalPointsAvailable,
      totalPointsEarned,
      squadStats,
    };
  }
}
