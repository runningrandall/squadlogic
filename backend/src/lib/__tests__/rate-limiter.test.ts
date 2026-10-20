import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();
vi.mock('../dynamodb.js', () => ({
  dynamoClient: { send: (...args: unknown[]) => mockSend(...args) },
  TABLE_NAME: 'TestTable',
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  UpdateCommand: vi.fn((input) => ({ type: 'Update', input })),
}));

class ConditionalCheckFailedException extends Error {
  name = 'ConditionalCheckFailedException';
}
vi.mock('@aws-sdk/client-dynamodb', () => ({ ConditionalCheckFailedException }));

const { enforceRateLimit } = await import('../rate-limiter.js');
const { TooManyRequestsError } = await import('../errors.js');

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments the fixed-window counter for the key', async () => {
    mockSend.mockResolvedValueOnce({});
    await enforceRateLimit('1.2.3.4', 100, 300);

    expect(mockSend).toHaveBeenCalledOnce();
    const [cmd] = mockSend.mock.calls[0];
    expect(cmd.input.TableName).toBe('TestTable');
    expect(cmd.input.Key.pk).toBe('RATE_LIMIT#1.2.3.4');
    expect(cmd.input.Key.sk).toMatch(/^WINDOW#\d+$/);
    expect(cmd.input.ExpressionAttributeValues[':limit']).toBe(100);
  });

  it('throws TooManyRequestsError when the condition check fails', async () => {
    mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException());

    await expect(enforceRateLimit('1.2.3.4', 100, 300)).rejects.toThrow(
      TooManyRequestsError,
    );
  });

  it('rethrows unrelated errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('network blip'));

    await expect(enforceRateLimit('1.2.3.4', 100, 300)).rejects.toThrow(
      'network blip',
    );
  });
});
