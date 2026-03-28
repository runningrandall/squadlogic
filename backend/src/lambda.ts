import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app.js';

const app = await buildApp();
await app.ready();

const proxy = awsLambdaFastify(app);

export const handler = proxy;
