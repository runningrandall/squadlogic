import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { TeamDynamoRepository } from '../../adapters/team-dynamo-repository.js';
import { TeamService } from '../../application/team-service.js';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
} from '../../domain/team.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createTeamService(): TeamService {
  const repository = new TeamDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new TeamService(repository, eventPublisher);
}

export default async function teamRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createTeamService();

  // All team routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/teams',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager')(request);
      const dto = validate(CreateTeamSchema, request.body);
      const team = await service.createTeam(request.organizationId, dto);
      return created(reply, team);
    },
  );

  fastify.get(
    '/teams',
    async (
      request: FastifyRequest<{
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listTeams(request.organizationId, {
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return success(reply, result);
    },
  );

  fastify.get(
    '/teams/:teamId',
    async (
      request: FastifyRequest<{ Params: { teamId: string } }>,
      reply,
    ) => {
      const team = await service.getTeam(
        request.organizationId,
        request.params.teamId,
      );
      return success(reply, team);
    },
  );

  fastify.put(
    '/teams/:teamId',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin')(request);
      const dto = validate(UpdateTeamSchema, request.body);
      const team = await service.updateTeam(
        request.organizationId,
        request.params.teamId,
        dto,
      );
      return success(reply, team);
    },
  );

  fastify.delete(
    '/teams/:teamId',
    async (
      request: FastifyRequest<{ Params: { teamId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin')(request);
      await service.deleteTeam(
        request.organizationId,
        request.params.teamId,
      );
      return noContent(reply);
    },
  );
}
