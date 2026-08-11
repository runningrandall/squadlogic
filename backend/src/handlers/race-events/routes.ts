import type { FastifyInstance, FastifyRequest } from 'fastify';
import { CallUpListUploadSchema } from '../../domain/race-event.js';
import { EventBridgePublisher } from '../../adapters/eventbridge-publisher.js';
import { CallUpListService } from '../../application/callup-list-service.js';
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
import type { TeamWaveSchedule } from '../../domain/race-event.js';
import { setRaceSession, getRaceSession } from '../../lib/race-session-store.js';
import type { RaceSessionData } from '../../lib/race-session-store.js';

function createServices() {
  const eventPublisher = new EventBridgePublisher();
  return {
    callUpList: new CallUpListService(eventPublisher),
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

  // In-memory cache (warm path) — falls back to DynamoDB across Lambda instances
  const importCache = new Map<string, RaceSessionData>();

  // Schedule cache keyed by eventId:teamName
  const scheduleCache = new Map<string, TeamWaveSchedule>();

  // Resolve import session: check in-memory first, then DynamoDB
  async function resolveImport(eventId: string): Promise<RaceSessionData | null> {
    const cached = importCache.get(eventId);
    if (cached) return cached;
    const session = await getRaceSession(eventId);
    if (session) importCache.set(eventId, session); // warm local cache
    return session;
  }

  // POST /race-events/import/callup — upload a league call-up list (.xlsx) and import it
  fastify.post(
    '/race-events/import/callup',
    async (
      request: FastifyRequest<{
        Body: { fileData: unknown; eventName?: unknown; eventLocation?: unknown };
      }>,
      reply,
    ) => {
      const dto = validate(CallUpListUploadSchema, request.body);
      const buffer = Buffer.from(dto.fileData, 'base64');

      const result = await services.callUpList.importCallUpList(buffer, {
        eventName: dto.eventName,
        eventLocation: dto.eventLocation,
      });

      const eventId = result.metadata.eventId;
      const session: RaceSessionData = {
        metadata: result.metadata,
        participants: result.participants,
        categorySchedule: result.categorySchedule,
      };
      importCache.set(eventId, session);
      await setRaceSession(eventId, session);

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
      const cached = await resolveImport(request.params.eventId);
      if (!cached) {
        throw new ValidationError(
          'Event not imported. Upload a call-up list first via POST /race-events/import/callup.',
        );
      }

      const teams = services.callUpList.getTeamList(
        cached.metadata.teams,
        cached.participants,
      );

      return success(reply, { teams });
    },
  );

  // POST /race-events/:eventId/schedule — generate enriched wave schedule
  fastify.post(
    '/race-events/:eventId/schedule',
    async (
      request: FastifyRequest<{
        Params: { eventId: string };
        Body: { teamName: string };
      }>,
      reply,
    ) => {
      const cached = await resolveImport(request.params.eventId);
      if (!cached) {
        throw new ValidationError('Event not imported.');
      }

      const body = request.body as { teamName: string };
      if (!body.teamName) {
        throw new ValidationError('teamName is required.');
      }

      const teamParticipants = cached.participants.filter((p) => p.team === body.teamName);

      // Read wave config from DynamoDB — supplies wave grouping + laps only
      // (stage/start times come from the uploaded call-up list, cached.categorySchedule).
      const waveConfig = await services.waveConfig.getConfig();

      const schedule = services.schedule.generateSchedule(
        body.teamName,
        teamParticipants,
        waveConfig,
        cached.categorySchedule,
        cached.metadata.eventName,
        cached.metadata.eventDate,
      );

      const enriched = services.logistics.enrichSchedule(schedule);

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
      const cached = await resolveImport(request.params.eventId);
      if (!cached) {
        throw new ValidationError('Event not imported.');
      }

      const body = request.body as { teamName: string };
      const cacheKey = `${request.params.eventId}:${body.teamName}`;
      let enriched = scheduleCache.get(cacheKey);

      // If no cached schedule, generate one with defaults
      if (!enriched) {
        const teamParticipants = cached.participants.filter((p) => p.team === body.teamName);
        const waveConfig = await services.waveConfig.getConfig();
        const schedule = services.schedule.generateSchedule(
          body.teamName, teamParticipants, waveConfig, cached.categorySchedule,
          cached.metadata.eventName, cached.metadata.eventDate,
        );
        enriched = services.logistics.enrichSchedule(schedule);
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
