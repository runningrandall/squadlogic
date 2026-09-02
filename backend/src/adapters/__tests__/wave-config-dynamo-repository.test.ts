const mockCreate = vi.fn();
const mockGet = vi.fn();
const mockQueryGo = vi.fn();
const mockPatch = vi.fn();
const mockSet = vi.fn();
const mockPatchGo = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../entities/wave-config.js', () => ({
  WaveConfigEntity: {
    create: (...args: unknown[]) => ({ go: () => mockCreate(...args) }),
    get: (...args: unknown[]) => ({ go: () => mockGet(...args) }),
    query: {
      byOrganization: (...args: unknown[]) => ({ go: (opts: unknown) => mockQueryGo(...args, opts) }),
    },
    patch: (...args: unknown[]) => {
      mockPatch(...args);
      return { set: (...sArgs: unknown[]) => { mockSet(...sArgs); return { go: mockPatchGo }; } };
    },
    delete: (...args: unknown[]) => ({ go: () => mockDelete(...args) }),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { WaveConfigDynamoRepository } = await import('../wave-config-dynamo-repository.js');

const sampleConfig = {
  configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
  entries: [{ categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00', laps: 2 }],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('WaveConfigDynamoRepository', () => {
  let repo: InstanceType<typeof WaveConfigDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new WaveConfigDynamoRepository();
  });

  it('creates a wave config', async () => {
    mockCreate.mockResolvedValue({ data: sampleConfig });
    const result = await repo.create({
      configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
      entries: sampleConfig.entries,
    });
    expect(result.waveName).toBe('Wave 1 - HS');
  });

  it('creates an entry with undefined laps (omits laps key)', async () => {
    mockCreate.mockResolvedValue({ data: sampleConfig });
    await repo.create({
      configId: 'w1', organizationId: 'GLOBAL', waveName: 'Wave 1 - HS',
      entries: [{ categoryName: 'JV B Boys', stageTime: '07:40', startTime: '08:00' }],
    });
    expect(mockCreate).toHaveBeenCalled();
  });

  it('gets config by id', async () => {
    mockGet.mockResolvedValue({ data: sampleConfig });
    const result = await repo.getById('GLOBAL', 'w1');
    expect(result?.waveName).toBe('Wave 1 - HS');
  });

  it('returns null when config not found', async () => {
    mockGet.mockResolvedValue({ data: null });
    const result = await repo.getById('GLOBAL', 'nonexistent');
    expect(result).toBeNull();
  });

  it('lists configs by organization', async () => {
    mockQueryGo.mockResolvedValue({ data: [sampleConfig], cursor: null });
    const result = await repo.listByOrganization('GLOBAL');
    expect(result.items).toHaveLength(1);
  });

  it('passes cursor when paginating', async () => {
    mockQueryGo.mockResolvedValue({ data: [], cursor: null });
    await repo.listByOrganization('GLOBAL', { cursor: 'page2', limit: 5 });
    // mockQueryGo receives (organizationIdArg, goOptions) — check the options arg
    expect(mockQueryGo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cursor: 'page2' }),
    );
  });

  it('returns cursor from list response', async () => {
    mockQueryGo.mockResolvedValue({ data: [sampleConfig], cursor: 'next-token' });
    const result = await repo.listByOrganization('GLOBAL');
    expect(result.cursor).toBe('next-token');
  });

  it('updates wave config', async () => {
    mockPatchGo.mockResolvedValue({ data: { ...sampleConfig, waveName: 'Updated' } });
    const result = await repo.update('GLOBAL', 'w1', { waveName: 'Updated' });
    expect(result.waveName).toBe('Updated');
    expect(mockPatch).toHaveBeenCalledWith({ organizationId: 'GLOBAL', configId: 'w1' });
  });

  it('updates only entries when waveName is not provided', async () => {
    const newEntries = [{ categoryName: 'Varsity Boys', stageTime: '09:50', startTime: '10:10', laps: 4 }];
    mockPatchGo.mockResolvedValue({ data: { ...sampleConfig, entries: newEntries } });
    const result = await repo.update('GLOBAL', 'w1', { entries: newEntries });
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ entries: newEntries }));
    expect(result.entries).toEqual(newEntries);
  });

  it('deletes wave config', async () => {
    mockDelete.mockResolvedValue({});
    await repo.delete('GLOBAL', 'w1');
    expect(mockDelete).toHaveBeenCalledWith({ organizationId: 'GLOBAL', configId: 'w1' });
  });
});
