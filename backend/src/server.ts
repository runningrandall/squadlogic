import fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import errorHandlerPlugin from './lib/errors.js';
import authPlugin from './lib/auth.js';
import { logger } from './lib/logger.js';
import organizationRoutes from './handlers/organizations/routes.js';
import teamRoutes from './handlers/teams/routes.js';
import athleteRoutes from './handlers/athletes/routes.js';
import coachRoutes from './handlers/coaches/routes.js';
import groupRoutes from './handlers/groups/routes.js';
import teamMemberRoutes from './handlers/team-members/routes.js';
import groupMemberRoutes from './handlers/group-members/routes.js';
import challengeRoutes from './handlers/challenges/routes.js';

const app = fastify({
  logger: false,
});

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

app.get('/health', async () => {
  return { status: 'ok' };
});

const port = parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  logger.info(`Server listening on ${host}:${port}`);
} catch (err) {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
}

export { app };
