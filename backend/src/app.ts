import fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import errorHandlerPlugin from './lib/errors.js';
import authPlugin from './lib/auth.js';
import organizationRoutes from './handlers/organizations/routes.js';
import teamRoutes from './handlers/teams/routes.js';
import athleteRoutes from './handlers/athletes/routes.js';
import coachRoutes from './handlers/coaches/routes.js';
import groupRoutes from './handlers/groups/routes.js';
import teamMemberRoutes from './handlers/team-members/routes.js';
import groupMemberRoutes from './handlers/group-members/routes.js';
import challengeRoutes from './handlers/challenges/routes.js';
import raceEventRoutes from './handlers/race-events/routes.js';
import waveConfigRoutes from './handlers/wave-config/routes.js';
import brandingRoutes from './handlers/branding/routes.js';
import exportRoutes from './handlers/exports/routes.js';

export async function buildApp() {
  const app = fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);

  await app.register(organizationRoutes);
  await app.register(teamRoutes);
  await app.register(athleteRoutes);
  await app.register(coachRoutes);
  await app.register(groupRoutes);
  await app.register(teamMemberRoutes);
  await app.register(groupMemberRoutes);
  await app.register(challengeRoutes);
  await app.register(raceEventRoutes);
  await app.register(waveConfigRoutes);
  await app.register(brandingRoutes);
  await app.register(exportRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
