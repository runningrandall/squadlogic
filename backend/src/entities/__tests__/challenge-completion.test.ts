import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { ChallengeCompletionEntity } = await import('../challenge-completion.js');

describe('ChallengeCompletionEntity', () => {
  it('is defined', () => {
    expect(ChallengeCompletionEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = ChallengeCompletionEntity.schema.model;
    expect(model.entity).toBe('challengeCompletion');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = ChallengeCompletionEntity.schema.attributes;
    const requiredAttrs = [
      'completionId', 'challengeId', 'groupId', 'teamId',
      'organizationId', 'completedBy', 'completedAt', 'notes',
      'status', 'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and completionId', () => {
    const indexes = ChallengeCompletionEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('completionId');
  });

  it('has byChallenge GSI index', () => {
    const indexes = ChallengeCompletionEntity.schema.indexes;
    expect(indexes.byChallenge).toBeDefined();
    expect(indexes.byChallenge.pk.composite).toContain('organizationId');
    expect(indexes.byChallenge.pk.composite).toContain('challengeId');
    expect(indexes.byChallenge.sk.composite).toContain('groupId');
  });

  it('has byGroup GSI index', () => {
    const indexes = ChallengeCompletionEntity.schema.indexes;
    expect(indexes.byGroup).toBeDefined();
    expect(indexes.byGroup.pk.composite).toContain('organizationId');
    expect(indexes.byGroup.pk.composite).toContain('groupId');
    expect(indexes.byGroup.sk.composite).toContain('challengeId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = ChallengeCompletionEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = ChallengeCompletionEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = ChallengeCompletionEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = ChallengeCompletionEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
