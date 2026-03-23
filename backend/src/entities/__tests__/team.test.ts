import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { TeamEntity } = await import('../team.js');

describe('TeamEntity', () => {
  it('is defined', () => {
    expect(TeamEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = TeamEntity.schema.model;
    expect(model.entity).toBe('team');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = TeamEntity.schema.attributes;
    const requiredAttrs = [
      'teamId', 'organizationId', 'name', 'sport',
      'season', 'status', 'description',
      'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has maxRosterSize attribute', () => {
    const attributes = TeamEntity.schema.attributes;
    expect(attributes).toHaveProperty('maxRosterSize');
  });

  it('has primary index with organizationId and teamId', () => {
    const indexes = TeamEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('teamId');
  });

  it('has byOrganization GSI index', () => {
    const indexes = TeamEntity.schema.indexes;
    expect(indexes.byOrganization).toBeDefined();
    expect(indexes.byOrganization.pk.composite).toContain('organizationId');
    expect(indexes.byOrganization.sk.composite).toContain('teamId');
  });

  it('has allTeams GSI index with empty pk composite', () => {
    const indexes = TeamEntity.schema.indexes;
    expect(indexes.allTeams).toBeDefined();
    expect(indexes.allTeams.pk.composite).toEqual([]);
    expect(indexes.allTeams.sk.composite).toContain('organizationId');
    expect(indexes.allTeams.sk.composite).toContain('teamId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = TeamEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = TeamEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = TeamEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = TeamEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
