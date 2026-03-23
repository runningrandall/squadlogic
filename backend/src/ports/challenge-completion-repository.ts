import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateChallengeCompletionDto, ChallengeCompletion } from '../domain/challenge-completion.js';

export interface ChallengeCompletionRepository {
  create(completion: CreateChallengeCompletionDto & { completionId: string; challengeId: string; teamId: string; organizationId: string; completedBy: string; completedAt: string }): Promise<ChallengeCompletion>;
  getById(organizationId: string, completionId: string): Promise<ChallengeCompletion | null>;
  getByChallengeAndGroup(organizationId: string, challengeId: string, groupId: string): Promise<ChallengeCompletion | null>;
  listByChallenge(organizationId: string, challengeId: string, options?: ListOptions): Promise<ListResult<ChallengeCompletion>>;
  listByGroup(organizationId: string, groupId: string, options?: ListOptions): Promise<ListResult<ChallengeCompletion>>;
  delete(organizationId: string, completionId: string): Promise<void>;
}
