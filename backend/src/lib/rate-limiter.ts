import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from './dynamodb.js';
import { TooManyRequestsError } from './errors.js';

// Fixed-window counter stored in DynamoDB so the limit holds across concurrent
// Lambda execution environments, not just within a single warm container.
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const ttl = windowStart + windowSeconds;

  try {
    await dynamoClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `RATE_LIMIT#${key}`, sk: `WINDOW#${windowStart}` },
        UpdateExpression: 'ADD #count :incr SET #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':incr': 1, ':limit': limit, ':ttl': ttl },
      }),
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new TooManyRequestsError();
    }
    throw error;
  }
}
