import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const mockDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: mockDocClient },
}));

const { WaveConfigEntity } = await import('../wave-config.js');

describe('WaveConfigEntity', () => {
  it('is defined', () => { expect(WaveConfigEntity).toBeDefined(); });

  it('has correct model metadata', () => {
    const model = WaveConfigEntity.schema.model;
    expect(model.entity).toBe('waveConfig');
    expect(model.service).toBe('squadlogic');
    expect(model.version).toBe('1');
  });

  it('has required attributes', () => {
    const attrs = WaveConfigEntity.schema.attributes;
    for (const a of ['configId', 'organizationId', 'waveName', 'entries', 'createdAt', 'updatedAt']) {
      expect(attrs).toHaveProperty(a);
    }
  });

  it('has entries as list type', () => {
    expect(WaveConfigEntity.schema.attributes.entries.type).toBe('list');
  });

  it('has primary index with organizationId+configId', () => {
    const pk = WaveConfigEntity.schema.indexes.primary.pk.composite;
    expect(pk).toContain('organizationId');
    expect(pk).toContain('configId');
  });

  it('has byOrganization GSI', () => {
    const idx = WaveConfigEntity.schema.indexes.byOrganization;
    expect(idx).toBeDefined();
    expect(idx.pk.composite).toContain('organizationId');
    expect(idx.sk.composite).toContain('configId');
  });

  it('has allConfigs GSI with empty pk composite', () => {
    const idx = WaveConfigEntity.schema.indexes.allConfigs;
    expect(idx).toBeDefined();
    expect(idx.pk.composite).toEqual([]);
  });

  it('has createdAt default function returning ISO string', () => {
    const d = WaveConfigEntity.schema.attributes.createdAt.default;
    expect(typeof d).toBe('function');
    expect((d as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has createdAt set function returning ISO string', () => {
    const s = WaveConfigEntity.schema.attributes.createdAt.set;
    expect(typeof s).toBe('function');
    expect((s as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has updatedAt default function returning ISO string', () => {
    const d = WaveConfigEntity.schema.attributes.updatedAt.default;
    expect(typeof d).toBe('function');
    expect((d as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has updatedAt set function returning ISO string', () => {
    const s = WaveConfigEntity.schema.attributes.updatedAt.set;
    expect(typeof s).toBe('function');
    expect((s as () => string)()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
