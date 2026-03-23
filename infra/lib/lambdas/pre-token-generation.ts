/**
 * Pre Token Generation V2 Lambda trigger for Amazon Cognito.
 *
 * Reads custom:organizationId and custom:teamId from user attributes,
 * reads cognito:groups from groupConfiguration, and injects custom claims
 * into the access token:
 *   - custom:organizationId
 *   - custom:role (highest priority group)
 *   - custom:teamId (if present)
 */

/** Role priority order (highest to lowest). */
const ROLE_PRIORITY: readonly string[] = [
  'SuperAdmin',
  'OrgAdmin',
  'OrgManager',
  'OrgUser',
  'TeamAdmin',
  'TeamManager',
  'TeamUser',
  'Athlete',
] as const;

interface PreTokenGenerationV2Event {
  request: {
    userAttributes: Record<string, string>;
    groupConfiguration?: {
      groupsToOverride?: string[];
    };
  };
  response: {
    claimsAndScopeOverrideDetails?: {
      accessTokenGeneration?: {
        claimsToAddOrOverride?: Record<string, string>;
        claimsToSuppress?: string[];
        scopesToAdd?: string[];
        scopesToSuppress?: string[];
      };
    };
  };
  [key: string]: unknown;
}

export const handler = async (
  event: PreTokenGenerationV2Event,
): Promise<PreTokenGenerationV2Event> => {
  const userAttributes = event.request.userAttributes;
  const groups = event.request.groupConfiguration?.groupsToOverride ?? [];

  const organizationId = userAttributes['custom:organizationId'] ?? '';
  const teamId = userAttributes['custom:teamId'] ?? '';

  // Determine the highest-priority role from the user's groups
  let role = '';
  for (const candidate of ROLE_PRIORITY) {
    if (groups.includes(candidate)) {
      role = candidate;
      break;
    }
  }

  const claimsToAddOrOverride: Record<string, string> = {
    'custom:organizationId': organizationId,
    'custom:role': role,
  };

  if (teamId) {
    claimsToAddOrOverride['custom:teamId'] = teamId;
  }

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride,
        claimsToSuppress: [],
        scopesToAdd: [],
        scopesToSuppress: [],
      },
    },
  };

  return event;
};
