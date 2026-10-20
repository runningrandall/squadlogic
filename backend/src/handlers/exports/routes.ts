import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { TeamWaveSchedule } from '../../domain/race-event.js';
import { success } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';

export default async function exportRoutes(
  fastify: FastifyInstance,
): Promise<void> {
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
        // Lazy-import to avoid loading googleapis at Lambda cold start
        const { GoogleSheetsAdapter } = await import('../../adapters/google-sheets-adapter.js');
        const { SheetsExportService } = await import('../../application/sheets-export-service.js');

        const adapter = new GoogleSheetsAdapter();
        const sheetsExportService = new SheetsExportService(adapter);

        const spreadsheetUrl = await sheetsExportService.exportSchedule(
          body.schedule,
        );

        return success(reply, { spreadsheetUrl });
      } catch (error) {
        // Check by name since the class is lazy-imported
        if (error instanceof Error && error.name === 'GoogleSheetsAuthError') {
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
