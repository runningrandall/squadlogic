import Fastify from 'fastify';
import authPlugin, { getHighestRole, ROLE_PRIORITY } from '../auth.js';

describe('getHighestRole', () => {
  it('returns SuperAdmin when present', () => {
    expect(getHighestRole(['OrgUser', 'SuperAdmin'])).toBe('SuperAdmin');
  });

  it('returns OrgAdmin over OrgManager', () => {
    expect(getHighestRole(['OrgManager', 'OrgAdmin'])).toBe('OrgAdmin');
  });

  it('returns Athlete as default when no matching role', () => {
    expect(getHighestRole([])).toBe('Athlete');
    expect(getHighestRole(['UnknownRole'])).toBe('Athlete');
  });

  it('respects full priority order', () => {
    for (let i = 0; i < ROLE_PRIORITY.length; i++) {
      const role = ROLE_PRIORITY[i];
      expect(getHighestRole([role])).toBe(role);
    }
  });
});

describe('auth plugin (dev/test mode)', () => {
  async function buildApp() {
    const app = Fastify();
    await app.register(authPlugin);
    app.get('/test', async (request) => ({
      userId: request.userId,
      organizationId: request.organizationId,
      userRole: request.userRole,
      userGroups: request.userGroups,
      teamId: request.teamId,
    }));
    app.get('/health', async () => ({ status: 'ok' }));
    return app;
  }

  it('skips auth for /health endpoint', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('uses header-based auth in test mode', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-organization-id': 'org-123',
        'x-user-role': 'OrgAdmin',
        'x-user-id': 'user-456',
        'x-team-id': 'team-789',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.userId).toBe('user-456');
    expect(body.organizationId).toBe('org-123');
    expect(body.userRole).toBe('OrgAdmin');
    expect(body.userGroups).toEqual(['OrgAdmin']);
    expect(body.teamId).toBe('team-789');
  });

  it('uses default values when headers not provided in dev mode', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.userId).toBe('dev-user');
    expect(body.userRole).toBe('OrgAdmin');
    expect(body.organizationId).toBe('');
  });

  it('does not include teamId when x-team-id header is absent', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-organization-id': 'org-123',
        'x-user-role': 'OrgUser',
      },
    });
    const body = res.json();
    expect(body.teamId).toBeUndefined();
  });
});

describe('auth plugin (production mode)', () => {
  const mockVerify = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function buildProdApp() {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COGNITO_USER_POOL_ID', 'us-east-1_test');
    vi.stubEnv('COGNITO_CLIENT_ID', 'test-client-id');

    vi.doMock('aws-jwt-verify', () => ({
      CognitoJwtVerifier: {
        create: vi.fn(() => ({ verify: mockVerify })),
      },
    }));

    const { default: freshAuthPlugin } = await import('../auth.js');

    const app = Fastify();
    await app.register(freshAuthPlugin);
    app.get('/test', async (request) => ({
      userId: request.userId,
      organizationId: request.organizationId,
      userRole: request.userRole,
      userGroups: request.userGroups,
      teamId: request.teamId,
    }));
    app.get('/health', async () => ({ status: 'ok' }));
    return app;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('verifies JWT token and extracts claims', async () => {
    mockVerify.mockResolvedValue({
      sub: 'user-jwt-1',
      'cognito:groups': ['OrgAdmin', 'OrgUser'],
      'custom:organizationId': 'org-jwt',
      'custom:teamId': 'team-jwt',
    });

    const app = await buildProdApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Bearer valid-token-here' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.userId).toBe('user-jwt-1');
    expect(body.organizationId).toBe('org-jwt');
    expect(body.userRole).toBe('OrgAdmin');
    expect(body.userGroups).toEqual(['OrgAdmin', 'OrgUser']);
    expect(body.teamId).toBe('team-jwt');
  });

  it('returns 401 for invalid JWT token', async () => {
    mockVerify.mockRejectedValue(new Error('Token expired'));

    const app = await buildProdApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('returns 401 when no auth header in production', async () => {
    const app = await buildProdApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe('Missing authorization header');
  });

  it('handles missing cognito:groups gracefully', async () => {
    mockVerify.mockResolvedValue({
      sub: 'user-no-groups',
      'custom:organizationId': 'org-1',
    });

    const app = await buildProdApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.userGroups).toEqual([]);
    expect(body.userRole).toBe('Athlete');
  });
});
