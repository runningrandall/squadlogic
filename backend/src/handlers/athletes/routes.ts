import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { AthleteDynamoRepository } from '../../adapters/athlete-dynamo-repository.js';
import { AthleteService } from '../../application/athlete-service.js';
import {
  CreateAthleteSchema,
  UpdateAthleteSchema,
} from '../../domain/athlete.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createAthleteService(): AthleteService {
  const repository = new AthleteDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new AthleteService(repository, eventPublisher);
}

export default async function athleteRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createAthleteService();

  // All athlete routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/athletes',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager')(request);
      const dto = validate(CreateAthleteSchema, request.body);
      const athlete = await service.createAthlete(request.organizationId, dto);
      return created(reply, athlete);
    },
  );

  fastify.get(
    '/athletes',
    async (
      request: FastifyRequest<{
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listAthletes(request.organizationId, {
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return success(reply, result);
    },
  );

  fastify.get(
    '/athletes/:athleteId',
    async (
      request: FastifyRequest<{ Params: { athleteId: string } }>,
      reply,
    ) => {
      const athlete = await service.getAthlete(
        request.organizationId,
        request.params.athleteId,
      );
      return success(reply, athlete);
    },
  );

  fastify.put(
    '/athletes/:athleteId',
    async (
      request: FastifyRequest<{
        Params: { athleteId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(UpdateAthleteSchema, request.body);
      const athlete = await service.updateAthlete(
        request.organizationId,
        request.params.athleteId,
        dto,
      );
      return success(reply, athlete);
    },
  );

  fastify.delete(
    '/athletes/:athleteId',
    async (
      request: FastifyRequest<{ Params: { athleteId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin')(request);
      await service.deleteAthlete(
        request.organizationId,
        request.params.athleteId,
      );
      return noContent(reply);
    },
  );
}
