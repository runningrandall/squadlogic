import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { TeamMemberDynamoRepository } from '../../adapters/team-member-dynamo-repository.js';
import { TeamMemberService } from '../../application/team-member-service.js';
import {
  AddTeamMemberSchema,
  UpdateTeamMemberSchema,
} from '../../domain/team-member.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireOrgContext, requireRole } from '../../lib/middleware.js';

function createTeamMemberService(): TeamMemberService {
  const repository = new TeamMemberDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new TeamMemberService(repository, eventPublisher);
}

export default async function teamMemberRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createTeamMemberService();

  // All team member routes require org context
  fastify.addHook('preHandler', requireOrgContext());

  fastify.post(
    '/teams/:teamId/members',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(AddTeamMemberSchema, request.body);
      const member = await service.addMember(
        request.organizationId,
        request.params.teamId,
        dto,
      );
      return created(reply, member);
    },
  );

  fastify.get(
    '/teams/:teamId/members',
    async (
      request: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listTeamMembers(
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
    '/team-members/:teamMemberId',
    async (
      request: FastifyRequest<{ Params: { teamMemberId: string } }>,
      reply,
    ) => {
      const member = await service.getMember(
        request.organizationId,
        request.params.teamMemberId,
      );
      return success(reply, member);
    },
  );

  fastify.put(
    '/team-members/:teamMemberId',
    async (
      request: FastifyRequest<{
        Params: { teamMemberId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager')(request);
      const dto = validate(UpdateTeamMemberSchema, request.body);
      const member = await service.updateMember(
        request.organizationId,
        request.params.teamMemberId,
        dto,
      );
      return success(reply, member);
    },
  );

  fastify.delete(
    '/team-members/:teamMemberId',
    async (
      request: FastifyRequest<{ Params: { teamMemberId: string } }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin', 'TeamAdmin')(request);
      await service.removeMember(
        request.organizationId,
        request.params.teamMemberId,
      );
      return noContent(reply);
    },
  );
}
