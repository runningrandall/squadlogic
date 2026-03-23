import {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
  type AttributeValue,
} from '@aws-sdk/client-verifiedpermissions';
import type { AuthorizationPort, AuthorizationRequest } from '../ports/authorization.js';
import { logger } from '../lib/logger.js';

const POLICY_STORE_ID = process.env.POLICY_STORE_ID ?? '';

function toSdkAttributeValue(val: { string?: string; long?: number; boolean?: boolean }): AttributeValue {
  if (val.string !== undefined) return { string: val.string };
  if (val.long !== undefined) return { long: val.long };
  if (val.boolean !== undefined) return { boolean: val.boolean };
  return { string: '' };
}

export class VerifiedPermissionsAdapter implements AuthorizationPort {
  private readonly client = new VerifiedPermissionsClient({});

  async isAuthorized(request: AuthorizationRequest): Promise<boolean> {
    const command = new IsAuthorizedCommand({
      policyStoreId: POLICY_STORE_ID,
      principal: {
        entityType: request.principal.entityType,
        entityId: request.principal.entityId,
      },
      action: {
        actionType: request.action.actionType,
        actionId: request.action.actionId,
      },
      resource: {
        entityType: request.resource.entityType,
        entityId: request.resource.entityId,
      },
      entities: request.entities
        ? {
            entityList: request.entities.map((e) => ({
              identifier: {
                entityType: e.entityType,
                entityId: e.entityId,
              },
              attributes: e.attributes
                ? Object.fromEntries(
                    Object.entries(e.attributes).map(([key, val]) => [key, toSdkAttributeValue(val)]),
                  )
                : undefined,
              parents: e.parents?.map((p) => ({
                entityType: p.entityType,
                entityId: p.entityId,
              })),
            })),
          }
        : undefined,
    });

    const response = await this.client.send(command);
    logger.debug('Authorization decision', {
      decision: response.decision,
      principal: request.principal,
      action: request.action,
      resource: request.resource,
    });
    return response.decision === 'ALLOW';
  }
}
