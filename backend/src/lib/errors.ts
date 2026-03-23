import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from './logger.js';

export class NotFoundError extends Error {
  public readonly statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  public readonly statusCode = 409;

  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

type AppError = NotFoundError | ValidationError | ConflictError | ForbiddenError;

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof NotFoundError ||
    error instanceof ValidationError ||
    error instanceof ConflictError ||
    error instanceof ForbiddenError
  );
}

async function errorHandlerPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler(
    (error: Error, _request: FastifyRequest, reply: FastifyReply) => {
      if (isAppError(error)) {
        return reply.status(error.statusCode).send({
          error: error.name,
          message: error.message,
          statusCode: error.statusCode,
        });
      }

      logger.error('Unhandled error', { error });

      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
    },
  );
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
