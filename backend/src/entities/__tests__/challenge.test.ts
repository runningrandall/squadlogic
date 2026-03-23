import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { ChallengeEntity } = await import('../challenge.js');

describe('ChallengeEntity', () => {
  it('is defined', () => {
    expect(ChallengeEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = ChallengeEntity.schema.model;
    expect(model.entity).toBe('challenge');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = ChallengeEntity.schema.attributes;
    const requiredAttrs = [
      'challengeId', 'teamId', 'organizationId', 'title',
      'description', 'status', 'points', 'createdBy',
      'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and challengeId', () => {
    const indexes = ChallengeEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('challengeId');
  });

  it('has byTeam GSI index', () => {
    const indexes = ChallengeEntity.schema.indexes;
    expect(indexes.byTeam).toBeDefined();
    expect(indexes.byTeam.pk.composite).toContain('organizationId');
    expect(indexes.byTeam.pk.composite).toContain('teamId');
    expect(indexes.byTeam.sk.composite).toContain('challengeId');
  });

  it('has allChallenges GSI index with empty pk composite', () => {
    const indexes = ChallengeEntity.schema.indexes;
    expect(indexes.allChallenges).toBeDefined();
    expect(indexes.allChallenges.pk.composite).toEqual([]);
    expect(indexes.allChallenges.sk.composite).toContain('organizationId');
    expect(indexes.allChallenges.sk.composite).toContain('challengeId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = ChallengeEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = ChallengeEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = ChallengeEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = ChallengeEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
