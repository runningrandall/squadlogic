import type { FastifyInstance, FastifyRequest } from 'fastify';
import { RaceResultUrlSchema } from '../../domain/race-event.js';
import { RaceResultClient } from '../../adapters/raceresult-client.js';
import { RaceResultHtmlParser } from '../../adapters/raceresult-parser.js';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { RaceEventService } from '../../application/race-event-service.js';
import { WaveScheduleService } from '../../application/wave-schedule-service.js';
import { LogisticsService } from '../../application/logistics-service.js';
import { PdfExportService } from '../../application/pdf-export-service.js';
import { TeamBrandingDynamoRepository } from '../../adapters/team-branding-dynamo-repository.js';
import { TeamBrandingService } from '../../application/team-branding-service.js';
import { WaveConfigDynamoRepository } from '../../adapters/wave-config-dynamo-repository.js';
import { WaveConfigService } from '../../application/wave-config-service.js';
import { validate } from '../../lib/validation.js';
import { success } from '../../lib/response.js';
import { ValidationError } from '../../lib/errors.js';
import type { RaceEventMetadata, RaceParticipant, TeamWaveSchedule } from '../../domain/race-event.js';

function createServices() {
  const eventPublisher = new EventBridgePublisher();
  return {
    raceEvent: new RaceEventService(
      new RaceResultClient(),
      new RaceResultHtmlParser(),
      eventPublisher,
    ),
    waveConfig: new WaveConfigService(
      new WaveConfigDynamoRepository(),
      eventPublisher,
    ),
    schedule: new WaveScheduleService(),
    logistics: new LogisticsService(),
    pdf: new PdfExportService(),
    branding: new TeamBrandingService(new TeamBrandingDynamoRepository()),
  };
}

export default async function raceEventRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const services = createServices();

  // In-memory cache for imported event data (per-session, ephemeral)
  const importCache = new Map<
    string,
    { metadata: RaceEventMetadata; participants: RaceParticipant[] }
  >();

  // Schedule cache keyed by eventId:teamName
  const scheduleCache = new Map<string, TeamWaveSchedule>();

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
      const result = await services.raceEvent.importEvent(url, eventId);

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

      const teams = services.raceEvent.getTeamList(
        cached.metadata.teams,
        cached.participants,
      );

      return success(reply, { teams });
    },
  );

  // POST /race-events/:eventId/schedule — generate enriched wave schedule from DynamoDB config
  fastify.post(
    '/race-events/:eventId/schedule',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Body: {
          teamName: string;
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
        arrivalOverrides?: Record<string, number>;
        warmupDurationMinutes?: number;
        stagingBeforeMinutes?: number;
      };

      if (!body.teamName) {
        throw new ValidationError('teamName is required.');
      }

      // Read wave config from DynamoDB (seeds defaults on first access)
      const waveConfig = await services.waveConfig.getConfig();

      // Generate schedule grouped by wave/category
      const schedule = services.schedule.generateSchedule(
        body.teamName,
        cached.participants,
        waveConfig,
        cached.metadata.eventName,
        cached.metadata.eventDate,
      );

      // Calculate logistics with category-aware defaults
      const logisticsConfig = services.logistics.calculateDefaults(waveConfig, {
        arrivalOverrides: body.arrivalOverrides,
        warmupDurationMinutes: body.warmupDurationMinutes,
        stagingBeforeMinutes: body.stagingBeforeMinutes,
      });
      const enriched = services.logistics.enrichSchedule(schedule, logisticsConfig);

      // Cache for subsequent PDF export
      scheduleCache.set(`${request.params.eventId}:${body.teamName}`, enriched);

      return success(reply, enriched);
    },
  );

  // POST /race-events/:eventId/export/pdf — generate and download branded PDF
  fastify.post(
    '/race-events/:eventId/export/pdf',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Body: { teamName: string };
      }>,
      reply,
    ) => {
      const cached = importCache.get(request.params.eventId);
      if (!cached) {
        throw new ValidationError('Event not imported.');
      }

      const body = request.body as { teamName: string };
      const cacheKey = `${request.params.eventId}:${body.teamName}`;
      let enriched = scheduleCache.get(cacheKey);

      // If no cached schedule, generate one with defaults
      if (!enriched) {
        const waveConfig = await services.waveConfig.getConfig();
        const schedule = services.schedule.generateSchedule(
          body.teamName, cached.participants, waveConfig,
          cached.metadata.eventName, cached.metadata.eventDate,
        );
        const logisticsConfig = services.logistics.calculateDefaults(waveConfig);
        enriched = services.logistics.enrichSchedule(schedule, logisticsConfig);
      }

      // Get branding (non-fatal — PDF generates without branding on lookup failure)
      /* v8 ignore next */
      const userId = request.userId ?? 'anonymous';
      const branding = await services.branding.getBranding(userId).catch(() => null);

      // Generate PDF
      const pdfBuffer = await services.pdf.generatePdf(
        enriched,
        branding ? {
          teamDisplayName: branding.teamDisplayName,
          primaryColor: branding.primaryColor,
          tertiaryColor: branding.tertiaryColor,
          logoUrl: branding.logoUrl,
        } : undefined,
        cached.metadata.eventLocation,
      );

      const filename = services.pdf.generateFilename(
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
