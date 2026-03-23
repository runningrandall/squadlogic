import Fastify from 'fastify';
import authPlugin from '../auth.js';
import errorHandlerPlugin from '../errors.js';

vi.mock('../../adapters/verified-permissions-adapter.js', () => {
  const mockIsAuthorized = vi.fn().mockResolvedValue(true);
  return {
    VerifiedPermissionsAdapter: vi.fn(() => ({
      isAuthorized: mockIsAuthorized,
    })),
    __mockIsAuthorized: mockIsAuthorized,
  };
});

const { requirePermission } = await import('../authorize.js');
const { __mockIsAuthorized: mockIsAuthorized } = await import(
  '../../adapters/verified-permissions-adapter.js'
) as any;

describe('requirePermission', () => {
  async function buildApp(
    action: string,
    resourceType: string,
    opts?: {
      getResourceOrgId?: (req: any) => string;
      getResourceTeamId?: (req: any) => string | undefined;
    },
  ) {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);

    const handler = requirePermission(
      action,
      resourceType,
      (req: any) => req.params?.id ?? 'resource-1',
      opts?.getResourceOrgId,
      opts?.getResourceTeamId,
    );

    app.get('/resource/:id', { preHandler: handler }, async () => ({ ok: true }));
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request when adapter returns true', async () => {
    mockIsAuthorized.mockResolvedValue(true);
    const app = await buildApp('View', 'Resource');
    const res = await app.inject({
      method: 'GET',
      url: '/resource/res-123',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'OrgAdmin',
        'x-organization-id': 'org-1',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mockIsAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: { entityType: 'SquadLogic::User', entityId: 'user-1' },
        action: { actionType: 'SquadLogic::Action', actionId: 'View' },
        resource: { entityType: 'SquadLogic::Resource', entityId: 'res-123' },
      }),
    );
  });

  it('rejects with 403 when adapter returns false', async () => {
    mockIsAuthorized.mockResolvedValue(false);
    const app = await buildApp('Delete', 'Resource');
    const res = await app.inject({
      method: 'GET',
      url: '/resource/res-123',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'OrgUser',
        'x-organization-id': 'org-1',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('includes user entity with role parents in entities', async () => {
    mockIsAuthorized.mockResolvedValue(true);
    const app = await buildApp('View', 'Resource');
    await app.inject({
      method: 'GET',
      url: '/resource/res-123',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'OrgAdmin',
        'x-organization-id': 'org-1',
      },
    });

    const call = mockIsAuthorized.mock.calls[0][0];
    const userEntity = call.entities.find((e: any) => e.entityType === 'SquadLogic::User');
    expect(userEntity).toBeDefined();
    expect(userEntity.entityId).toBe('user-1');
    expect(userEntity.parents).toEqual([{ entityType: 'SquadLogic::Role', entityId: 'OrgAdmin' }]);
  });

  it('includes resource entity with organizationId attribute', async () => {
    mockIsAuthorized.mockResolvedValue(true);
    const app = await buildApp('View', 'Organization');
    await app.inject({
      method: 'GET',
      url: '/resource/org-1',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'OrgAdmin',
        'x-organization-id': 'org-1',
      },
    });

    const call = mockIsAuthorized.mock.calls[0][0];
    const resourceEntity = call.entities.find((e: any) => e.entityType === 'SquadLogic::Organization');
    expect(resourceEntity).toBeDefined();
    expect(resourceEntity.attributes.organizationId).toEqual({ string: 'org-1' });
  });

  it('includes teamId in user and resource entities when provided', async () => {
    mockIsAuthorized.mockResolvedValue(true);
    const app = await buildApp('View', 'Team', {
      getResourceTeamId: () => 'team-1',
    });
    await app.inject({
      method: 'GET',
      url: '/resource/team-1',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'TeamAdmin',
        'x-organization-id': 'org-1',
        'x-team-id': 'team-1',
      },
    });

    const call = mockIsAuthorized.mock.calls[0][0];
    const userEntity = call.entities.find((e: any) => e.entityType === 'SquadLogic::User');
    expect(userEntity.attributes.teamId).toEqual({ string: 'team-1' });

    const resourceEntity = call.entities.find((e: any) => e.entityType === 'SquadLogic::Team');
    expect(resourceEntity.attributes.teamId).toEqual({ string: 'team-1' });
  });

  it('uses custom getResourceOrgId when provided', async () => {
    mockIsAuthorized.mockResolvedValue(true);
    const app = await buildApp('View', 'Resource', {
      getResourceOrgId: () => 'custom-org',
    });
    await app.inject({
      method: 'GET',
      url: '/resource/res-1',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'OrgAdmin',
        'x-organization-id': 'org-1',
      },
    });

    const call = mockIsAuthorized.mock.calls[0][0];
    const resourceEntity = call.entities.find((e: any) => e.entityType === 'SquadLogic::Resource');
    expect(resourceEntity.attributes.organizationId).toEqual({ string: 'custom-org' });
  });
});
