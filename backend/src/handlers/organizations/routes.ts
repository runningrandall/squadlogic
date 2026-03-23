import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { OrganizationDynamoRepository } from '../../adapters/organization-dynamo-repository.js';
import { OrganizationService } from '../../application/organization-service.js';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from '../../domain/organization.js';
import { created, noContent, success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireRole } from '../../lib/middleware.js';

function createOrganizationService(): OrganizationService {
  const repository = new OrganizationDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new OrganizationService(repository, eventPublisher);
}

export default async function organizationRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createOrganizationService();

  // All organization routes require SuperAdmin
  fastify.addHook('preHandler', requireRole('SuperAdmin'));

  fastify.post(
    '/organizations',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply,
    ) => {
      const dto = validate(CreateOrganizationSchema, request.body);
      const organization = await service.createOrganization(dto);
      return created(reply, organization);
    },
  );

  fastify.get(
    '/organizations',
    async (
      request: FastifyRequest<{
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply,
    ) => {
      const { cursor, limit } = request.query;
      const result = await service.listOrganizations({
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return success(reply, result);
    },
  );

  fastify.get(
    '/organizations/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      const organization = await service.getOrganization(
        request.params.id,
      );
      return success(reply, organization);
    },
  );

  fastify.put(
    '/organizations/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      const dto = validate(UpdateOrganizationSchema, request.body);
      const organization = await service.updateOrganization(
        request.params.id,
        dto,
      );
      return success(reply, organization);
    },
  );

  fastify.delete(
    '/organizations/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ) => {
      await service.deleteOrganization(request.params.id);
      return noContent(reply);
    },
  );
}
