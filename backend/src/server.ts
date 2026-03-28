import { logger } from './lib/logger.js';
import { buildApp } from './app.js';

const app = await buildApp();

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
