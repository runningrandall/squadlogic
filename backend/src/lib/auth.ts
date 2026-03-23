import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const ROLE_PRIORITY = [
  'SuperAdmin',
  'OrgAdmin',
  'OrgManager',
  'OrgUser',
  'TeamAdmin',
  'TeamManager',
  'TeamUser',
  'Athlete',
] as const;

export type UserRole = typeof ROLE_PRIORITY[number];

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    organizationId: string;
    userRole: string;
    userGroups: string[];
    teamId?: string;
  }
}

function getHighestRole(groups: string[]): string {
  for (const role of ROLE_PRIORITY) {
    if (groups.includes(role)) return role;
  }
  return 'Athlete';
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  // In dev/test mode, use header-based auth as fallback
  let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
  if (!isDev && process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }

  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('organizationId', '');
  fastify.decorateRequest('userRole', '');
  fastify.decorateRequest('userGroups', {
    getter() { return (this as any)._userGroups ?? []; },
    setter(val: string[]) { (this as any)._userGroups = val; },
  });
  fastify.decorateRequest('teamId', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/health') return;

    const authHeader = request.headers.authorization;

    if (verifier && authHeader?.startsWith('Bearer ')) {
      // JWT-based auth (production)
      const token = authHeader.slice(7);
      try {
        const payload = await verifier.verify(token);
        request.userId = payload.sub;
        request.userGroups = (payload['cognito:groups'] as string[]) ?? [];
        request.userRole = getHighestRole(request.userGroups);
        request.organizationId = (payload['custom:organizationId'] as string) ?? '';
        request.teamId = (payload['custom:teamId'] as string) ?? undefined;
      } catch {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token', statusCode: 401 });
      }
    } else if (isDev) {
      // Header-based auth fallback for development
      const orgId = (request.headers['x-organization-id'] as string) ?? '';
      const role = (request.headers['x-user-role'] as string) ?? 'OrgAdmin';
      const userId = (request.headers['x-user-id'] as string) ?? 'dev-user';
      const teamId = request.headers['x-team-id'] as string | undefined;

      request.userId = userId;
      request.organizationId = orgId;
      request.userRole = role;
      request.userGroups = [role];
      request.teamId = teamId;
    } else {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing authorization header', statusCode: 401 });
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
export { getHighestRole, ROLE_PRIORITY };
