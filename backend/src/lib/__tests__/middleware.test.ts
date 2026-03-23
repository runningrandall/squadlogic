import Fastify from 'fastify';
import authPlugin from '../auth.js';
import errorHandlerPlugin from '../errors.js';
import { requireRole, requireOrgContext } from '../middleware.js';

describe('requireRole', () => {
  async function buildApp(allowedRoles: string[]) {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    app.get('/test', { preHandler: requireRole(...allowedRoles) }, async () => ({ ok: true }));
    return app;
  }

  it('allows matching role', async () => {
    const app = await buildApp(['SuperAdmin', 'OrgAdmin']);
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-role': 'SuperAdmin' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('rejects non-matching role with 403', async () => {
    const app = await buildApp(['SuperAdmin']);
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-role': 'OrgUser' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects when using default role not in allowed list', async () => {
    const app = await buildApp(['SuperAdmin']);
    const res = await app.inject({
      method: 'GET',
      url: '/test',
    });
    // Default role in dev is OrgAdmin, not SuperAdmin
    expect(res.statusCode).toBe(403);
  });

  it('allows any of multiple roles', async () => {
    const app = await buildApp(['OrgAdmin', 'OrgManager']);
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-role': 'OrgManager' },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('requireOrgContext', () => {
  async function buildApp() {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin);
    app.get('/test', { preHandler: requireOrgContext() }, async (request) => ({
      organizationId: request.organizationId,
    }));
    return app;
  }

  it('allows when organizationId is present', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-organization-id': 'org-123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().organizationId).toBe('org-123');
  });

  it('rejects when organizationId is missing with 403', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/test',
    });
    expect(res.statusCode).toBe(403);
  });
});
