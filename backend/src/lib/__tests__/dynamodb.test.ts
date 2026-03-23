import { dynamoClient, TABLE_NAME, tableConfig } from '../dynamodb.js';

describe('dynamodb', () => {
  it('exports dynamoClient', () => {
    expect(dynamoClient).toBeDefined();
  });

  it('exports TABLE_NAME defaulting to TeamManager-Table-dev', () => {
    expect(TABLE_NAME).toBe('TeamManager-Table-dev');
  });

  it('exports tableConfig with table and client', () => {
    expect(tableConfig).toEqual({
      table: TABLE_NAME,
      client: dynamoClient,
    });
  });
});

describe('dynamodb with DYNAMODB_ENDPOINT', () => {
  it('uses endpoint from env when set', async () => {
    vi.stubEnv('DYNAMODB_ENDPOINT', 'http://localhost:8000');
    vi.resetModules();

    const mod = await import('../dynamodb.js');
    expect(mod.dynamoClient).toBeDefined();

    vi.unstubAllEnvs();
  });
});
