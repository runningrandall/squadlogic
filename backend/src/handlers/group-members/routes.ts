import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { GroupMemberDynamoRepository } from '../../adapters/group-member-dynamo-repository.js';
import { GroupService } from '../../application/group-service.js';
import { GroupDynamoRepository } from '../../adapters/group-dynamo-repository.js';
import { GroupMemberService } from '../../application/group-member-service.js';
import {
  AddGroupMemberSchema,
  UpdateGroupMemberSchema,
} from '../../domain/group-member.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createGroupMemberService(): GroupMemberService {
  const repository = new GroupMemberDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new GroupMemberService(repository, eventPublisher);
}

function createGroupService(): GroupService {
  const repository = new GroupDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new GroupService(repository, eventPublisher);
}

export default async function groupMemberRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createGroupMemberService();
  const groupService = createGroupService();

  // All group member routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/groups/:groupId/members',
    async (
      request: FastifyRequest<{
        Params: { groupId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(AddGroupMemberSchema, request.body);
      const group = await groupService.getGroup(
        request.organizationId,
        request.params.groupId,
      );
      const member = await service.addMember(
        request.organizationId,
        request.params.groupId,
        group.teamId,
        dto,
      );
      return created(reply, member);
    },
  );

  fastify.get(
    '/groups/:groupId/members',
    async (
      request: FastifyRequest<{
        Params: { groupId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listGroupMembers(
        request.organizationId,
        request.params.groupId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : undefined,
        },
      );
      return success(reply, result);
    },
  );

  fastify.put(
    '/group-members/:groupMemberId',
    async (
      request: FastifyRequest<{
        Params: { groupMemberId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(UpdateGroupMemberSchema, request.body);
      const member = await service.updateMember(
        request.organizationId,
        request.params.groupMemberId,
        dto,
      );
      return success(reply, member);
    },
  );

  fastify.delete(
    '/group-members/:groupMemberId',
    async (
      request: FastifyRequest<{ Params: { groupMemberId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      await service.removeMember(
        request.organizationId,
        request.params.groupMemberId,
      );
      return noContent(reply);
    },
  );
}
