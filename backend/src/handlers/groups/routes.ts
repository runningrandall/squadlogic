import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { GroupDynamoRepository } from '../../adapters/group-dynamo-repository.js';
import { GroupService } from '../../application/group-service.js';
import {
  CreateGroupSchema,
  UpdateGroupSchema,
} from '../../domain/group.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createGroupService(): GroupService {
  const repository = new GroupDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new GroupService(repository, eventPublisher);
}

export default async function groupRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createGroupService();

  // All group routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/teams/:teamId/groups',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(CreateGroupSchema.omit({ teamId: true }), request.body);
      const group = await service.createGroup(
        request.organizationId,
        request.params.teamId,
        dto,
      );
      return created(reply, group);
    },
  );

  fastify.get(
    '/teams/:teamId/groups',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listGroupsByTeam(
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
    '/groups/:groupId',
    async (
      request: FastifyRequest<{ Params: { groupId: string } }>,
      reply,
    ) => {
      const group = await service.getGroup(
        request.organizationId,
        request.params.groupId,
      );
      return success(reply, group);
    },
  );

  fastify.put(
    '/groups/:groupId',
    async (
      request: FastifyRequest<{
        Params: { groupId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(UpdateGroupSchema, request.body);
      const group = await service.updateGroup(
        request.organizationId,
        request.params.groupId,
        dto,
      );
      return success(reply, group);
    },
  );

  fastify.delete(
    '/groups/:groupId',
    async (
      request: FastifyRequest<{ Params: { groupId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      await service.deleteGroup(
        request.organizationId,
        request.params.groupId,
      );
      return noContent(reply);
    },
  );
}
