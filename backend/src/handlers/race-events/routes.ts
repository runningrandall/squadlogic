import type { FastifyInstance, FastifyRequest } from 'fastify';
import { RaceResultUrlSchema } from '../../domain/race-event.js';
import { RaceResultClient } from '../../adapters/raceresult-client.js';
import { RaceResultHtmlParser } from '../../adapters/raceresult-parser.js';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { RaceEventService } from '../../application/race-event-service.js';
import { validate } from '../../lib/validation.js';
import { success } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';
import { WaveScheduleService } from '../../application/wave-schedule-service.js';
import { LogisticsService } from '../../application/logistics-service.js';
import { PdfExportService } from '../../application/pdf-export-service.js';
import { TeamBrandingDynamoRepository } from '../../adapters/team-branding-dynamo-repository.js';
import { TeamBrandingService } from '../../application/team-branding-service.js';

function createRaceEventService(): RaceEventService {
  const client = new RaceResultClient();
  const parser = new RaceResultHtmlParser();
  const eventPublisher = new EventBridgePublisher();
  return new RaceEventService(client, parser, eventPublisher);
}

export default async function raceEventRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const service = createRaceEventService();

  // In-memory store for imported event data (per-session, ephemeral)
  const importCache = new Map<
    string,
    { metadata: Awaited<ReturnType<typeof service.importEvent>>['metadata']; participants: Awaited<ReturnType<typeof service.importEvent>>['participants'] }
  >();

  // POST /race-events/import — validate URL and import event data
  fastify.post(
    '/race-events/import',
    async (
      request: FastifyRequest<{ Body: { url: unknown } }>,
      reply,
    ) => {
      const body = request.body as { url: unknown };
      if (!body?.url) {
        throw new ValidationError(
          'URL must be a valid RaceResult event URL (e.g., https://my.raceresult.com/411620/)',
        );
      }

      const { url, eventId } = validate(RaceResultUrlSchema, body.url);
      const result = await service.importEvent(url, eventId);

      importCache.set(eventId, {
        metadata: result.metadata,
        participants: result.participants,
      });

      return success(reply, {
        eventId,
        eventName: result.metadata.eventName,
        eventDate: result.metadata.eventDate,
        eventLocation: result.metadata.eventLocation,
        teams: result.metadata.teams,
        participantCount: result.participants.length,
      });
    },
  );

  // GET /race-events/:eventId/teams — list teams with participant counts
  fastify.get(
    '/race-events/:eventId/teams',
    async (
      request: FastifyRequest<{ Params: { eventId: string } }>,
      reply,
    ) => {
      const cached = importCache.get(request.params.eventId);
      if (!cached) {
        throw new ValidationError(
          'Event not imported. Submit the event URL first via POST /race-events/import.',
        );
      }

      const teams = service.getTeamList(
        cached.metadata.teams,
        cached.participants,
      );

      return success(reply, { teams });
    },
  );

  // POST /race-events/:eventId/export/pdf — generate and download branded PDF
  const scheduleService = new WaveScheduleService();
  const logisticsService = new LogisticsService();
  const pdfService = new PdfExportService();
  const brandingService = new TeamBrandingService(new TeamBrandingDynamoRepository());

  fastify.post(
    '/race-events/:eventId/export/pdf',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Body: {
          teamName: string;
          waveConfig: unknown[];
          arrivalOverrides?: Record<string, number>;
          warmupDurationMinutes?: number;
          stagingBeforeMinutes?: number;
        };
      }>,
      reply,
    ) => {
      const cached = importCache.get(request.params.eventId);
      if (!cached) {
        throw new ValidationError('Event not imported.');
      }

      const body = request.body as {
        teamName: string;
        waveConfig: unknown[];
        arrivalOverrides?: Record<string, number>;
        warmupDurationMinutes?: number;
        stagingBeforeMinutes?: number;
      };

      // Generate schedule
      const schedule = scheduleService.generateSchedule(
        body.teamName,
        cached.participants,
        body.waveConfig as never[],
        cached.metadata.eventName,
        cached.metadata.eventDate,
      );

      // Calculate logistics
      const logisticsConfig = logisticsService.calculateDefaults(
        body.waveConfig as never[],
        {
          arrivalOverrides: body.arrivalOverrides,
          warmupDurationMinutes: body.warmupDurationMinutes,
          stagingBeforeMinutes: body.stagingBeforeMinutes,
        },
      );
      const enriched = logisticsService.enrichSchedule(schedule, logisticsConfig);

      // Get branding
      const userId = request.userId ?? 'anonymous';
      const branding = await brandingService.getBranding(userId);

      // Generate PDF
      const pdfBuffer = await pdfService.generatePdf(
        enriched,
        branding
          ? {
              teamDisplayName: branding.teamDisplayName,
              primaryColor: branding.primaryColor,
              tertiaryColor: branding.tertiaryColor,
              logoUrl: branding.logoUrl,
            }
          : undefined,
        cached.metadata.eventLocation,
      );

      const filename = pdfService.generateFilename(
        branding?.teamDisplayName ?? body.teamName,
        cached.metadata.eventDate,
      );

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(pdfBuffer);
    },
  );
}
