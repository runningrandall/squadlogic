import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from './dynamodb.js';
import type { RaceEventMetadata, RaceParticipant } from '../domain/race-event.js';
import type { CategorySchedule } from '../application/wave-schedule-service.js';

const TTL_SECONDS = 60 * 60 * 2; // 2 hours

export interface RaceSessionData {
  metadata: RaceEventMetadata;
  participants: RaceParticipant[];
  categorySchedule: Record<string, CategorySchedule>;
}

export async function setRaceSession(eventId: string, data: RaceSessionData): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `RACE_SESSION#${eventId}`,
      sk: 'SESSION',
      data: JSON.stringify(data),
      ttl,
    },
  }));
}

export async function getRaceSession(eventId: string): Promise<RaceSessionData | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `RACE_SESSION#${eventId}`, sk: 'SESSION' },
  }));

  if (!result.Item) return null;
  return JSON.parse(result.Item.data as string) as RaceSessionData;
}
