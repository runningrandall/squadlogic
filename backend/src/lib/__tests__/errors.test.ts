import Fastify from 'fastify';
import errorHandlerPlugin, {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../errors.js';

describe('Error classes', () => {
  it('NotFoundError has correct defaults', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('NotFoundError');
  });

  it('NotFoundError accepts custom message', () => {
    const err = new NotFoundError('Custom message');
    expect(err.message).toBe('Custom message');
    expect(err.statusCode).toBe(404);
  });

  it('ValidationError has correct defaults', () => {
    const err = new ValidationError();
    expect(err.message).toBe('Validation failed');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('ValidationError');
  });

  it('ValidationError accepts custom message', () => {
    const err = new ValidationError('Bad input');
    expect(err.message).toBe('Bad input');
  });

  it('ConflictError has correct defaults', () => {
    const err = new ConflictError();
    expect(err.message).toBe('Resource already exists');
    expect(err.statusCode).toBe(409);
    expect(err.name).toBe('ConflictError');
  });

  it('ConflictError accepts custom message', () => {
    const err = new ConflictError('Duplicate');
    expect(err.message).toBe('Duplicate');
  });

  it('ForbiddenError has correct defaults', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe('ForbiddenError');
  });

  it('ForbiddenError accepts custom message', () => {
    const err = new ForbiddenError('No access');
    expect(err.message).toBe('No access');
  });
});

describe('errorHandlerPlugin', () => {
  async function buildApp() {
    const app = Fastify();
    await app.register(errorHandlerPlugin);
    return app;
  }

  it('handles NotFoundError with 404', async () => {
    const app = await buildApp();
    app.get('/test', async () => { throw new NotFoundError('Not here'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: 'NotFoundError',
      message: 'Not here',
      statusCode: 404,
    });
  });

  it('handles ValidationError with 400', async () => {
    const app = await buildApp();
    app.get('/test', async () => { throw new ValidationError('Bad data'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('ValidationError');
  });

  it('handles ConflictError with 409', async () => {
    const app = await buildApp();
    app.get('/test', async () => { throw new ConflictError(); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('ConflictError');
  });

  it('handles ForbiddenError with 403', async () => {
    const app = await buildApp();
    app.get('/test', async () => { throw new ForbiddenError(); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('ForbiddenError');
  });

  it('handles unknown errors with 500', async () => {
    const app = await buildApp();
    app.get('/test', async () => { throw new Error('Boom'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });
});
