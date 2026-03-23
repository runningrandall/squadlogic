import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { GroupEntity } = await import('../group.js');

describe('GroupEntity', () => {
  it('is defined', () => {
    expect(GroupEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = GroupEntity.schema.model;
    expect(model.entity).toBe('group');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = GroupEntity.schema.attributes;
    const requiredAttrs = [
      'groupId', 'teamId', 'organizationId', 'name',
      'description', 'status', 'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and groupId', () => {
    const indexes = GroupEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('groupId');
  });

  it('has byTeam GSI index', () => {
    const indexes = GroupEntity.schema.indexes;
    expect(indexes.byTeam).toBeDefined();
    expect(indexes.byTeam.pk.composite).toContain('organizationId');
    expect(indexes.byTeam.pk.composite).toContain('teamId');
    expect(indexes.byTeam.sk.composite).toContain('groupId');
  });

  it('has allGroups GSI index with empty pk composite', () => {
    const indexes = GroupEntity.schema.indexes;
    expect(indexes.allGroups).toBeDefined();
    expect(indexes.allGroups.pk.composite).toEqual([]);
    expect(indexes.allGroups.sk.composite).toContain('organizationId');
    expect(indexes.allGroups.sk.composite).toContain('groupId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = GroupEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = GroupEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = GroupEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = GroupEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
