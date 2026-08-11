import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();
vi.mock('../dynamodb.js', () => ({
  dynamoClient: { send: (...args: unknown[]) => mockSend(...args) },
  TABLE_NAME: 'TestTable',
}));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  PutCommand: vi.fn((input) => ({ type: 'Put', input })),
  GetCommand: vi.fn((input) => ({ type: 'Get', input })),
}));

const { setRaceSession, getRaceSession } = await import('../race-session-store.js');

const sampleSession = {
  metadata: { eventId: 'evt-1', eventName: 'Test Race', eventDate: '2026-08-01', eventLocation: 'UT', sourceUrl: '', teams: ['Team A'] },
  participants: [{ firstName: 'Jane', lastName: 'Doe', team: 'Team A', category: 'JV A', bibNumber: '1', callUpNumber: '1' }],
  categorySchedule: { 'JV A': { stageTime: '08:00', startTime: '08:15' } },
};

describe('race-session-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  describe('setRaceSession', () => {
    it('calls PutCommand with correct pk, sk, and serialized data', async () => {
      await setRaceSession('evt-1', sampleSession);
      expect(mockSend).toHaveBeenCalledOnce();
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.TableName).toBe('TestTable');
      expect(cmd.input.Item.pk).toBe('RACE_SESSION#evt-1');
      expect(cmd.input.Item.sk).toBe('SESSION');
      expect(JSON.parse(cmd.input.Item.data)).toEqual(sampleSession);
      expect(typeof cmd.input.Item.ttl).toBe('number');
    });
  });

  describe('getRaceSession', () => {
    it('returns parsed session when item exists', async () => {
      mockSend.mockResolvedValueOnce({ Item: { pk: 'RACE_SESSION#evt-1', sk: 'SESSION', data: JSON.stringify(sampleSession) } });
      const result = await getRaceSession('evt-1');
      expect(result).toEqual(sampleSession);
    });

    it('returns null when item is not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      const result = await getRaceSession('evt-1');
      expect(result).toBeNull();
    });

    it('calls GetCommand with correct pk and sk', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      await getRaceSession('evt-2');
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Key).toEqual({ pk: 'RACE_SESSION#evt-2', sk: 'SESSION' });
    });
  });
});
