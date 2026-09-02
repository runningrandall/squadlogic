import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: mockDocClient },
}));

const { TeamBrandingEntity } = await import('../team-branding.js');

describe('TeamBrandingEntity', () => {
  it('is defined', () => { expect(TeamBrandingEntity).toBeDefined(); });

  it('has correct model metadata', () => {
    const model = TeamBrandingEntity.schema.model;
    expect(model.entity).toBe('teamBranding');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attrs = TeamBrandingEntity.schema.attributes;
    for (const a of ['brandingId', 'userId', 'teamDisplayName', 'primaryColor', 'tertiaryColor', 'createdAt', 'updatedAt']) {
      expect(attrs).toHaveProperty(a);
    }
  });

  it('has optional logoUrl', () => { expect(TeamBrandingEntity.schema.attributes).toHaveProperty('logoUrl'); });
  it('defaults primaryColor to #333333', () => { expect(TeamBrandingEntity.schema.attributes.primaryColor.default).toBe('#333333'); });
  it('defaults tertiaryColor to #F5F5F5', () => { expect(TeamBrandingEntity.schema.attributes.tertiaryColor.default).toBe('#F5F5F5'); });

  it('has primary index with userId+brandingId', () => {
    const pk = TeamBrandingEntity.schema.indexes.primary.pk.composite;
    expect(pk).toContain('userId');
    expect(pk).toContain('brandingId');
  });

  it('has byUser GSI', () => {
    expect(TeamBrandingEntity.schema.indexes.byUser).toBeDefined();
    expect(TeamBrandingEntity.schema.indexes.byUser.pk.composite).toContain('userId');
  });

  it('has createdAt default function returning ISO string', () => {
    const d = TeamBrandingEntity.schema.attributes.createdAt.default;
    expect(typeof d).toBe('function');
    expect((d as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has createdAt set function returning ISO string', () => {
    const s = TeamBrandingEntity.schema.attributes.createdAt.set;
    expect(typeof s).toBe('function');
    expect((s as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has updatedAt default function returning ISO string', () => {
    const d = TeamBrandingEntity.schema.attributes.updatedAt.default;
    expect(typeof d).toBe('function');
    expect((d as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has updatedAt set function returning ISO string', () => {
    const s = TeamBrandingEntity.schema.attributes.updatedAt.set;
    expect(typeof s).toBe('function');
    expect((s as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
