import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateChallengeDto, Challenge, UpdateChallengeDto } from '../domain/challenge.js';

export interface ChallengeRepository {
  create(challenge: CreateChallengeDto & { challengeId: string; organizationId: string; createdBy: string }): Promise<Challenge>;
  getById(organizationId: string, challengeId: string): Promise<Challenge | null>;
  listByTeam(organizationId: string, teamId: string, options?: ListOptions): Promise<ListResult<Challenge>>;
  update(organizationId: string, challengeId: string, data: UpdateChallengeDto): Promise<Challenge>;
  delete(organizationId: string, challengeId: string): Promise<void>;
}
