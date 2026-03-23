import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: {
    table: 'TestTable',
    client: mockDocClient,
  },
}));

const { OrganizationEntity } = await import('../organization.js');

describe('OrganizationEntity', () => {
  it('is defined', () => {
    expect(OrganizationEntity).toBeDefined();
  });

  it('has correct model metadata', () => {
    const model = OrganizationEntity.schema.model;
    expect(model.entity).toBe('organization');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attributes = OrganizationEntity.schema.attributes;
    const requiredAttrs = [
      'organizationId', 'name', 'slug', 'status',
      'ownerUserId', 'billingEmail', 'phone',
      'address', 'city', 'state', 'zip',
      'timezone', 'createdAt', 'updatedAt',
    ];
    for (const attr of requiredAttrs) {
      expect(attributes).toHaveProperty(attr);
    }
  });

  it('has config attribute', () => {
    const attributes = OrganizationEntity.schema.attributes;
    expect(attributes).toHaveProperty('config');
  });

  it('has primary index with organizationId', () => {
    const indexes = OrganizationEntity.schema.indexes;
    expect(indexes.primary.pk.composite).toContain('organizationId');
  });

  it('has bySlug GSI index', () => {
    const indexes = OrganizationEntity.schema.indexes;
    expect(indexes.bySlug).toBeDefined();
    expect(indexes.bySlug.pk.composite).toContain('slug');
  });

  it('has allOrganizations GSI index with empty pk composite', () => {
    const indexes = OrganizationEntity.schema.indexes;
    expect(indexes.allOrganizations).toBeDefined();
    expect(indexes.allOrganizations.pk.composite).toEqual([]);
    expect(indexes.allOrganizations.sk.composite).toContain('organizationId');
  });

  it('createdAt default returns ISO string', () => {
    const attr = OrganizationEntity.schema.attributes.createdAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('createdAt set returns ISO string', () => {
    const attr = OrganizationEntity.schema.attributes.createdAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt default returns ISO string', () => {
    const attr = OrganizationEntity.schema.attributes.updatedAt;
    const defaultFn = (attr as any).default;
    expect(typeof defaultFn).toBe('function');
    const val = defaultFn();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('updatedAt set returns ISO string', () => {
    const attr = OrganizationEntity.schema.attributes.updatedAt;
    const setFn = (attr as any).set;
    expect(typeof setFn).toBe('function');
    const val = setFn();
    expect(new Date(val).toISOString()).toBe(val);
  });
});
