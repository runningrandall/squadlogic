import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { ChallengeDynamoRepository } from '../../adapters/challenge-dynamo-repository.js';
import { ChallengeCompletionDynamoRepository } from '../../adapters/challenge-completion-dynamo-repository.js';
import { ChallengeService } from '../../application/challenge-service.js';
import { ChallengeCompletionService } from '../../application/challenge-completion-service.js';
import {
  CreateChallengeSchema,
  UpdateChallengeSchema,
} from '../../domain/challenge.js';
import {
  CreateChallengeCompletionSchema,
} from '../../domain/challenge-completion.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createChallengeService(): ChallengeService {
  const repository = new ChallengeDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new ChallengeService(repository, eventPublisher);
}

function createChallengeCompletionService(): ChallengeCompletionService {
  const repository = new ChallengeCompletionDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new ChallengeCompletionService(repository, eventPublisher);
}

export default async function challengeRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const challengeService = createChallengeService();
  const completionService = createChallengeCompletionService();

  // All challenge routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/teams/:teamId/challenges',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      const dto = validate(CreateChallengeSchema.omit({ teamId: true }), request.body);
      const challenge = await challengeService.createChallenge(
        request.organizationId,
        request.params.teamId,
        request.userId,
        dto,
      );
      return created(reply, challenge);
    },
  );

  fastify.get(
    '/teams/:teamId/challenges',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await challengeService.listChallengesByTeam(
        request.organizationId,
        request.params.teamId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );
      return success(reply, result);
    },
  );

  fastify.get(
    '/challenges/:challengeId',
    async (
      request: FastifyRequest<{ Params: { challengeId: string } }>,
      reply,
    ) => {
      const challenge = await challengeService.getChallenge(
        request.organizationId,
        request.params.challengeId,
      );
      return success(reply, challenge);
    },
  );

  fastify.put(
    '/challenges/:challengeId',
    async (
      request: FastifyRequest<{
        Params: { challengeId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      const dto = validate(UpdateChallengeSchema, request.body);
      const challenge = await challengeService.updateChallenge(
        request.organizationId,
        request.params.challengeId,
        dto,
      );
      return success(reply, challenge);
    },
  );

  fastify.delete(
    '/challenges/:challengeId',
    async (
      request: FastifyRequest<{ Params: { challengeId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      await challengeService.deleteChallenge(
        request.organizationId,
        request.params.challengeId,
      );
      return noContent(reply);
    },
  );

  fastify.post(
    '/challenges/:challengeId/completions',
    async (
      request: FastifyRequest<{
        Params: { challengeId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(CreateChallengeCompletionSchema, request.body);
      const challenge = await challengeService.getChallenge(
        request.organizationId,
        request.params.challengeId,
      );
      const completion = await completionService.markCompleted(
        request.organizationId,
        request.params.challengeId,
        challenge.teamId,
        request.userId,
        dto,
      );
      return created(reply, completion);
    },
  );

  fastify.get(
    '/challenges/:challengeId/completions',
    async (
      request: FastifyRequest<{
        Params: { challengeId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await completionService.listByChallenge(
        request.organizationId,
        request.params.challengeId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );
      return success(reply, result);
    },
  );

  fastify.delete(
    '/challenge-completions/:completionId',
    async (
      request: FastifyRequest<{ Params: { completionId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      await completionService.removeCompletion(
        request.organizationId,
        request.params.completionId,
      );
      return noContent(reply);
    },
  );
}
