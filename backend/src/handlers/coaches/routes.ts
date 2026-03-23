import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { CoachDynamoRepository } from '../../adapters/coach-dynamo-repository.js';
import { CoachService } from '../../application/coach-service.js';
import {
  CreateCoachSchema,
  UpdateCoachSchema,
} from '../../domain/coach.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createCoachService(): CoachService {
  const repository = new CoachDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new CoachService(repository, eventPublisher);
}

export default async function coachRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createCoachService();

  // All coach routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/coaches',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager')(request);
      const dto = validate(CreateCoachSchema, request.body);
      const coach = await service.createCoach(request.organizationId, dto);
      return created(reply, coach);
    },
  );

  fastify.get(
    '/coaches',
    async (
      request: FastifyRequest<{
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listCoaches(request.organizationId, {
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return success(reply, result);
    },
  );

  fastify.get(
    '/coaches/:coachId',
    async (
      request: FastifyRequest<{ Params: { coachId: string } }>,
      reply,
    ) => {
      const coach = await service.getCoach(
        request.organizationId,
        request.params.coachId,
      );
      return success(reply, coach);
    },
  );

  fastify.put(
    '/coaches/:coachId',
    async (
      request: FastifyRequest<{
        Params: { coachId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(UpdateCoachSchema, request.body);
      const coach = await service.updateCoach(
        request.organizationId,
        request.params.coachId,
        dto,
      );
      return success(reply, coach);
    },
  );

  fastify.delete(
    '/coaches/:coachId',
    async (
      request: FastifyRequest<{ Params: { coachId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin')(request);
      await service.deleteCoach(
        request.organizationId,
        request.params.coachId,
      );
      return noContent(reply);
    },
  );
}
