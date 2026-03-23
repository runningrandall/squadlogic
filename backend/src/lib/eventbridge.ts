import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { logger } from './logger.js';

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME ?? 'default';
const IS_LOCAL = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

export const eventBridgeClient = new EventBridgeClient({
  ...(IS_LOCAL && { region: 'us-east-1' }),
});

export async function putEvent(
  source: string,
  detailType: string,
  detail: Record<string, unknown>,
): Promise<void> {
  if (IS_LOCAL) {
    logger.debug('Event (local, not published)', { source, detailType, detail });
    return;
  }

  const command = new PutEventsCommand({
    Entries: [
      {
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME,
      },
    ],
  });

  await eventBridgeClient.send(command);
}
