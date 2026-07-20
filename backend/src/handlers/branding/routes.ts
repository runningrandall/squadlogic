import type { FastifyInstance, FastifyRequest } from 'fastify';
import { TeamBrandingDynamoRepository } from '../../adapters/team-branding-dynamo-repository.js';
import { TeamBrandingService } from '../../application/team-branding-service.js';
import { CreateBrandingSchema } from '../../domain/team-branding.js';
import { validate } from '../../lib/validation.js';
import { success, created } from '../../lib/response.js';

function createBrandingService(): TeamBrandingService {
  const repository = new TeamBrandingDynamoRepository();
  return new TeamBrandingService(repository);
}

export default async function brandingRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createBrandingService();

  // GET /branding — get current user's branding config
  fastify.get(
    '/branding',
    async (request: FastifyRequest, reply) => {
      const userId = request.userId ?? 'anonymous';
      const branding = await service.getBranding(userId);

      if (!branding) {
        return success(reply, {
          configured: false,
          ...service.getDefaults(),
        });
      }

      return success(reply, { configured: true, ...branding });
    },
  );

  // PUT /branding — create or update branding
  fastify.put(
    '/branding',
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const userId = request.userId ?? 'anonymous';
      const dto = validate(CreateBrandingSchema, request.body);
      const branding = await service.createOrUpdateBranding(userId, dto);
      return success(reply, branding);
    },
  );

  // POST /branding/logo — validate and set logo URL
  fastify.post(
    '/branding/logo',
    async (
      request: FastifyRequest<{
        Body: { logoUrl: string; mimeType: string; sizeBytes: number };
      }>,
      reply,
    ) => {
      const userId = request.userId ?? 'anonymous';
      const { logoUrl, mimeType, sizeBytes } = request.body as {
        logoUrl: string;
        mimeType: string;
        sizeBytes: number;
      };

      service.validateLogoFile(mimeType, sizeBytes);
      const branding = await service.updateLogo(userId, logoUrl);
      return success(reply, branding);
    },
  );

  // DELETE /branding/logo — remove logo
  fastify.delete(
    '/branding/logo',
    async (request: FastifyRequest, reply) => {
      const userId = request.userId ?? 'anonymous';
      const branding = await service.updateLogo(userId, null);
      return success(reply, branding);
    },
  );
}
