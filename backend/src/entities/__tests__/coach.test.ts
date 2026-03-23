import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { CoachEntity } = await import('../coach.js');

describe('CoachEntity', () => {
  it('is defined', () => {
    expect(CoachEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = CoachEntity.schema.model;
    expect(model.entity).toBe('coach');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = CoachEntity.schema.attributes;
    const requiredAttrs = [
      'coachId', 'organizationId', 'firstName', 'lastName',
      'email', 'status', 'certifications', 'specialties',
      'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has optional attributes', () => {
    const attributes = CoachEntity.schema.attributes;
    const optionalAttrs = ['phone', 'notes'];
    for (const attr of optionalAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has primary index with organizationId and coachId', () => {
    const indexes = CoachEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
    expect(indexes.primary.pk.composite).toContain('coachId');
  });

  it('has byOrganization GSI index', () => {
    const indexes = CoachEntity.schema.indexes;
    expect(indexes.byOrganization).toBeDefined();
    expect(indexes.byOrganization.pk.composite).toContain('organizationId');
    expect(indexes.byOrganization.sk.composite).toContain('coachId');
  });

  it('has allCoaches GSI index with empty pk composite', () => {
    const indexes = CoachEntity.schema.indexes;
    expect(indexes.allCoaches).toBeDefined();
    expect(indexes.allCoaches.pk.composite).toEqual([]);
    expect(indexes.allCoaches.sk.composite).toContain('organizationId');
    expect(indexes.allCoaches.sk.composite).toContain('coachId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = CoachEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = CoachEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = CoachEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = CoachEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
