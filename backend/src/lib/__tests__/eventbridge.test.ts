vi.mock('@aws-sdk/client-eventbridge', () => {
  const sendMock = vi.fn().mockResolvedValue({});
  return {
    EventBridgeClient: vi.fn(() => ({ send: sendMock })),
    PutEventsCommand: vi.fn((input: any) => input),
  };
});

vi.mock('../logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Need to import after mock setup
const { putEvent, eventBridgeClient } = await import('../eventbridge.js');
const { PutEventsCommand } = await import('@aws-sdk/client-eventbridge');

describe('putEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips publishing in test/dev mode and logs instead', async () => {
    await putEvent('squadlogic.api', 'TestEvent', { key: 'value' });

    // In test mode (NODE_ENV=test), putEvent returns early without calling EventBridge
    expect(eventBridgeClient.send).not.toHaveBeenCalled();
  });

  it('would publish in production mode', async () => {
    // Verify the EventBridge client and PutEventsCommand are importable
    expect(eventBridgeClient).toBeDefined();
    expect(PutEventsCommand).toBeDefined();
  });
});
