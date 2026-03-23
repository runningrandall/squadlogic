import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { TeamMemberEntity } = await import('../team-member.js');

describe('TeamMemberEntity', () => {
  it('is defined', () => {
    expect(TeamMemberEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = TeamMemberEntity.schema.model;
    expect(model.entity).toBe('teamMember');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = TeamMemberEntity.schema.attributes;
    const requiredAttrs = [
      'teamMemberId', 'teamId', 'organizationId', 'memberId',
      'memberType', 'role', 'status', 'joinedAt',
      'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has jerseyNumber attribute', () => {
    const attributes = TeamMemberEntity.schema.attributes;
    expect(attributes).toHaveProperty('jerseyNumber');
  });

  it('has primary index with organizationId and teamMemberId', () => {
    const indexes = TeamMemberEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('teamMemberId');
  });

  it('has byTeam GSI index', () => {
    const indexes = TeamMemberEntity.schema.indexes;
    expect(indexes.byTeam).toBeDefined();
    expect(indexes.byTeam.pk.composite).toContain('organizationId');
    expect(indexes.byTeam.pk.composite).toContain('teamId');
    expect(indexes.byTeam.sk.composite).toContain('memberType');
    expect(indexes.byTeam.sk.composite).toContain('memberId');
  });

  it('has byMember GSI index', () => {
    const indexes = TeamMemberEntity.schema.indexes;
    expect(indexes.byMember).toBeDefined();
    expect(indexes.byMember.pk.composite).toContain('organizationId');
    expect(indexes.byMember.pk.composite).toContain('memberId');
    expect(indexes.byMember.sk.composite).toContain('teamId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = TeamMemberEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = TeamMemberEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = TeamMemberEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = TeamMemberEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
