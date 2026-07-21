import type { FastifyInstance, FastifyRequest } from 'fastify';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { TeamBrandingDynamoRepository } from '../../adapters/team-branding-dynamo-repository.js';
import { TeamBrandingService } from '../../application/team-branding-service.js';
import { CreateBrandingSchema } from '../../domain/team-branding.js';
import { validate } from '../../lib/validation.js';
import { success } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';

const LOGO_BUCKET = process.env.LOGO_BUCKET_NAME ?? 'switchback-team-logos-dev';

/* v8 ignore next 4 */
const s3Client = new S3Client(
  process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT.replace('8000', '4566'), region: 'us-east-1', credentials: { accessKeyId: 'local', secretAccessKey: 'local' }, forcePathStyle: true }
    : {},
);

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

  // POST /branding/logo/upload-url — get a presigned S3 upload URL
  fastify.post(
    '/branding/logo/upload-url',
    async (
      request: FastifyRequest<{
        Body: { mimeType: string; sizeBytes: number; filename: string };
      }>,
      reply,
    ) => {
      const userId = request.userId ?? 'anonymous';
      const { mimeType, sizeBytes, filename } = request.body as {
        mimeType: string;
        sizeBytes: number;
        filename: string;
      };

      // Validate before generating presigned URL
      service.validateLogoFile(mimeType, sizeBytes);

      const ext = filename.split('.').pop() ?? 'png';
      const key = `logos/${userId}/${randomUUID()}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: LOGO_BUCKET,
        Key: key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const logoUrl = `https://${LOGO_BUCKET}.s3.amazonaws.com/${key}`;

      return success(reply, { uploadUrl, logoUrl, key });
    },
  );

  // POST /branding/logo — confirm upload and set logo URL
  fastify.post(
    '/branding/logo',
    async (
      request: FastifyRequest<{
        Body: { logoUrl: string };
      }>,
      reply,
    ) => {
      const userId = request.userId ?? 'anonymous';
      const { logoUrl } = request.body as { logoUrl: string };

      if (!logoUrl) {
        throw new ValidationError('logoUrl is required.');
      }

      const branding = await service.updateLogo(userId, logoUrl);
      return success(reply, branding);
    },
  );

  // DELETE /branding/logo — remove logo and delete from S3
  fastify.delete(
    '/branding/logo',
    async (request: FastifyRequest, reply) => {
      const userId = request.userId ?? 'anonymous';
      const existing = await service.getBranding(userId);

      // Delete from S3 if a logo exists
      if (existing?.logoUrl) {
        const key = existing.logoUrl.split('.amazonaws.com/').pop();
        if (key) {
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: LOGO_BUCKET, Key: key }),
          ).catch(() => {});
        }
      }

      const branding = await service.updateLogo(userId, null);
      return success(reply, branding);
    },
  );
}
