import type { FastifyRequest } from 'fastify';
import { VerifiedPermissionsAdapter } from '../adapters/verified-permissions-adapter.js';
import { ForbiddenError } from './errors.js';
import type { AuthorizationEntity } from '../ports/authorization.js';

const authzAdapter = new VerifiedPermissionsAdapter();

function buildEntities(request: FastifyRequest, _resourceOrgId: string, _resourceTeamId?: string): AuthorizationEntity[] {
  const entities: AuthorizationEntity[] = [];

  // User entity with parent role
  const userAttrs: Record<string, { string?: string }> = {
    organizationId: { string: request.organizationId },
    email: { string: '' },
  };
  if (request.teamId) {
    userAttrs.teamId = { string: request.teamId };
  }

  entities.push({
    entityType: 'SquadLogic::User',
    entityId: request.userId,
    attributes: userAttrs,
    parents: request.userGroups.map((group) => ({
      entityType: 'SquadLogic::Role',
      entityId: group,
    })),
  });

  // Role entities
  for (const group of request.userGroups) {
    entities.push({
      entityType: 'SquadLogic::Role',
      entityId: group,
    });
  }

  return entities;
}

export function requirePermission(
  action: string,
  resourceType: string,
  getResourceId: (request: FastifyRequest) => string,
  getResourceOrgId?: (request: FastifyRequest) => string,
  getResourceTeamId?: (request: FastifyRequest) => string | undefined,
) {
  return async (request: FastifyRequest) => {
    const resourceOrgId = getResourceOrgId ? getResourceOrgId(request) : request.organizationId;
    const resourceTeamId = getResourceTeamId ? getResourceTeamId(request) : undefined;

    const resourceAttrs: Record<string, { string?: string }> = {
      organizationId: { string: resourceOrgId },
    };
    if (resourceTeamId) {
      resourceAttrs.teamId = { string: resourceTeamId };
    }

    const entities = buildEntities(request, resourceOrgId, resourceTeamId);

    // Add resource entity
    entities.push({
      entityType: `SquadLogic::${resourceType}`,
      entityId: getResourceId(request),
      attributes: resourceAttrs,
    });

    const allowed = await authzAdapter.isAuthorized({
      principal: {
        entityType: 'SquadLogic::User',
        entityId: request.userId,
      },
      action: {
        actionType: 'SquadLogic::Action',
        actionId: action,
      },
      resource: {
        entityType: `SquadLogic::${resourceType}`,
        entityId: getResourceId(request),
      },
      entities,
    });

    if (!allowed) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
  };
}

export { authzAdapter };
