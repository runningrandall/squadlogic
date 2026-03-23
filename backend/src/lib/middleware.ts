import type { FastifyRequest } from 'fastify';
import { ForbiddenError } from './errors.js';

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest) => {
    if (!allowedRoles.includes(request.userRole)) {
      throw new ForbiddenError(`One of [${allowedRoles.join(', ')}] role required`);
    }
  };
}

export function requireOrgContext() {
  return async (request: FastifyRequest) => {
    if (!request.organizationId) {
      throw new ForbiddenError('Organization context required');
    }
  };
}
