import { putEvent } from '../lib/eventbridge.js';
import type { EventPublisher } from '../ports/event-publisher.js';

const SOURCE = 'squadlogic.api';

export class EventBridgePublisher implements EventPublisher {
  async publish(
    eventType: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await putEvent(SOURCE, eventType, detail);
  }
}
