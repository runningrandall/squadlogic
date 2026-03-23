vi.mock('../../lib/eventbridge.js', () => ({
  putEvent: vi.fn().mockResolvedValue(undefined),
  eventBridgeClient: {},
}));

const { EventBridgePublisher } = await import('../eventbridge-publisher.js');
const { putEvent } = await import('../../lib/eventbridge.js');

describe('EventBridgePublisher', () => {
  let publisher: InstanceType<typeof EventBridgePublisher>;

  beforeEach(() => {
    vi.clearAllMocks();
    publisher = new EventBridgePublisher();
  });

  it('calls putEvent with correct source and params', async () => {
    const detail = { organizationId: 'org-123', name: 'Test' };
    await publisher.publish('OrganizationCreated', detail);

    expect(putEvent).toHaveBeenCalledWith('squadlogic.api', 'OrganizationCreated', detail);
  });

  it('passes through different event types', async () => {
    await publisher.publish('OrganizationDeleted', { id: '456' });
    expect(putEvent).toHaveBeenCalledWith('squadlogic.api', 'OrganizationDeleted', { id: '456' });
  });
});
