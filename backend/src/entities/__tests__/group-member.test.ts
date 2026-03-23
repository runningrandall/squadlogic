import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { GroupMemberEntity } = await import('../group-member.js');

describe('GroupMemberEntity', () => {
  it('is defined', () => {
    expect(GroupMemberEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = GroupMemberEntity.schema.model;
    expect(model.entity).toBe('groupMember');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = GroupMemberEntity.schema.attributes;
    const requiredAttrs = [
      'groupMemberId', 'groupId', 'teamId', 'organizationId',
      'athleteId', 'role', 'status', 'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and groupMemberId', () => {
    const indexes = GroupMemberEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('groupMemberId');
  });

  it('has byGroup GSI index', () => {
    const indexes = GroupMemberEntity.schema.indexes;
    expect(indexes.byGroup).toBeDefined();
    expect(indexes.byGroup.pk.composite).toContain('organizationId');
    expect(indexes.byGroup.pk.composite).toContain('groupId');
    expect(indexes.byGroup.sk.composite).toContain('athleteId');
  });

  it('has byAthlete GSI index', () => {
    const indexes = GroupMemberEntity.schema.indexes;
    expect(indexes.byAthlete).toBeDefined();
    expect(indexes.byAthlete.pk.composite).toContain('organizationId');
    expect(indexes.byAthlete.pk.composite).toContain('athleteId');
    expect(indexes.byAthlete.sk.composite).toContain('groupId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = GroupMemberEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = GroupMemberEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = GroupMemberEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = GroupMemberEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
