import type { FastifyInstance, FastifyRequest } from 'fastify';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { WaveConfigDynamoRepository } from '../../adapters/wave-config-dynamo-repository.js';
import { WaveConfigService } from '../../application/wave-config-service.js';
import { UpdateWaveConfigSchema } from '../../domain/wave-config.js';
import { success } from '../../lib/response.js';
import { validate } from '../../lib/validation.js';
import { requireRole } from '../../lib/middleware.js';

function createWaveConfigService(): WaveConfigService {
  const repository = new WaveConfigDynamoRepository();
  const eventPublisher = new EventBridgePublisher();
  return new WaveConfigService(repository, eventPublisher);
}

export default async function waveConfigRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createWaveConfigService();

  fastify.get(
    '/wave-config',
    async (
      _request: FastifyRequest,
      reply,
    ) => {
      const configs = await service.getConfig();
      return success(reply, configs);
    },
  );

  fastify.put(
    '/wave-config/:configId',
    async (
      request: FastifyRequest<{
        Params: { configId: string };
        Body: unknown;
      }>,
      reply,
    ) => {
      await requireRole('SuperAdmin', 'OrgAdmin')(request);
      const dto = validate(UpdateWaveConfigSchema, request.body);
      const config = await service.updateWave(
        request.params.configId,
        dto,
      );
      return success(reply, config);
    },
  );
}
