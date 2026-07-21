import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app.js';

let proxy: (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyResultV2>;

try {
  const app = await buildApp();
  proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/pdf'] });
} catch (err) {
  console.error('Failed to initialize Fastify app:', err);
  proxy = async () => ({
    statusCode: 500,
    body: JSON.stringify({ error: 'Lambda initialization failed', message: String(err) }),
  });
}

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  return proxy(event, context);
};
