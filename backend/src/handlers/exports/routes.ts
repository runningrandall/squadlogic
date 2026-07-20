import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { TeamWaveSchedule } from '../../domain/race-event.js';
import { GoogleSheetsAdapter, GoogleSheetsAuthError } from '../../adapters/google-sheets-adapter.js';
import { SheetsExportService } from '../../application/sheets-export-service.js';
import { success } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';

function createSheetsExportService(): SheetsExportService {
  const adapter = new GoogleSheetsAdapter();
  return new SheetsExportService(adapter);
}

export default async function exportRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const sheetsExportService = createSheetsExportService();

  // POST /race-events/:eventId/export/sheets — export schedule to Google Sheets
  fastify.post(
    '/race-events/:eventId/export/sheets',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Body: { schedule: TeamWaveSchedule };
      }>,
      reply,
    ) => {
      const body = request.body as { schedule?: TeamWaveSchedule };
      if (!body?.schedule) {
        throw new ValidationError(
          'Request body must include a "schedule" object with the enriched wave schedule.',
        );
      }

      try {
        const spreadsheetUrl = await sheetsExportService.exportSchedule(
          body.schedule,
        );

        return success(reply, { spreadsheetUrl });
      } catch (error) {
        if (error instanceof GoogleSheetsAuthError) {
          return reply.status(401).send({
            error: 'GoogleSheetsAuthError',
            message:
              'Google Sheets authentication failed. Consider using PDF export as an alternative.',
            statusCode: 401,
          });
        }
        throw error;
      }
    },
  );
}
