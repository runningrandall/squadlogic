import type { FastifyReply } from 'fastify';

export function success<T>(
  reply: FastifyReply,
  body: T,
  statusCode = 200,
): FastifyReply {
  return reply.status(statusCode).send(body);
}

export function created<T>(reply: FastifyReply, body: T): FastifyReply {
  return reply.status(201).send(body);
}

export function noContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}
