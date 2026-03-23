export interface EventPublisher {
  publish(
    eventType: string,
    detail: Record<string, unknown>,
  ): Promise<void>;
}
