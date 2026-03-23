import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { AthleteEntity } = await import('../athlete.js');

describe('AthleteEntity', () => {
  it('is defined', () => {
    expect(AthleteEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = AthleteEntity.schema.model;
    expect(model.entity).toBe('athlete');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = AthleteEntity.schema.attributes;
    const requiredAttrs = [
      'athleteId', 'organizationId', 'firstName', 'lastName',
      'email', 'status', 'positions', 'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has optional attributes', () => {
    const attributes = AthleteEntity.schema.attributes;
    const optionalAttrs = [
      'phone', 'dateOfBirth', 'jerseyNumber',
      'emergencyContactName', 'emergencyContactPhone', 'notes',
    ];
    for (const attr of optionalAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and athleteId', () => {
    const indexes = AthleteEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('athleteId');
  });

  it('has byOrganization GSI index', () => {
    const indexes = AthleteEntity.schema.indexes;
    expect(indexes.byOrganization).toBeDefined();
    expect(indexes.byOrganization.pk.composite).toContain('organizationId');
    expect(indexes.byOrganization.sk.composite).toContain('athleteId');
  });

  it('has allAthletes GSI index with empty pk composite', () => {
    const indexes = AthleteEntity.schema.indexes;
    expect(indexes.allAthletes).toBeDefined();
    expect(indexes.allAthletes.pk.composite).toEqual([]);
    expect(indexes.allAthletes.sk.composite).toContain('organizationId');
    expect(indexes.allAthletes.sk.composite).toContain('athleteId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = AthleteEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = AthleteEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = AthleteEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = AthleteEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
