const mockCreate = vi.fn();
const mockQueryGo = vi.fn();
const mockPatch = vi.fn();
const mockSet = vi.fn();
const mockGo = vi.fn();

vi.mock('../../entities/team-branding.js', () => ({
  TeamBrandingEntity: {
    create: (...args: unknown[]) => ({ go: () => mockCreate(...args) }),
    query: {
      byUser: (...args: unknown[]) => ({ go: () => mockQueryGo(...args) }),
    },
    patch: (...args: unknown[]) => {
      mockPatch(...args);
      return { set: (...sArgs: unknown[]) => { mockSet(...sArgs); return { go: mockGo }; } };
    },
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { TeamBrandingDynamoRepository } = await import('../team-branding-dynamo-repository.js');

const sampleBranding = {
  brandingId: 'b-1', userId: 'user-1', teamDisplayName: 'Brighton',
  primaryColor: '#1E3A5F', tertiaryColor: '#FFFFFF', logoUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TeamBrandingDynamoRepository', () => {
  let repo: InstanceType<typeof TeamBrandingDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TeamBrandingDynamoRepository();
  });

  it('creates branding', async () => {
    mockCreate.mockResolvedValue({ data: sampleBranding });
    const result = await repo.create({
      brandingId: 'b-1', userId: 'user-1', teamDisplayName: 'Brighton',
      primaryColor: '#1E3A5F', tertiaryColor: '#FFFFFF',
    });
    expect(result.teamDisplayName).toBe('Brighton');
  });

  it('returns branding by user', async () => {
    mockQueryGo.mockResolvedValue({ data: [sampleBranding] });
    const result = await repo.getByUser('user-1');
    expect(result?.teamDisplayName).toBe('Brighton');
  });

  it('returns null when user has no branding', async () => {
    mockQueryGo.mockResolvedValue({ data: [] });
    const result = await repo.getByUser('user-999');
    expect(result).toBeNull();
  });

  it('updates branding fields', async () => {
    mockGo.mockResolvedValue({ data: { ...sampleBranding, primaryColor: '#FF0000' } });
    const result = await repo.update('user-1', 'b-1', { primaryColor: '#FF0000' });
    expect(result.primaryColor).toBe('#FF0000');
    expect(mockPatch).toHaveBeenCalledWith({ userId: 'user-1', brandingId: 'b-1' });
  });

  it('updates all branding fields at once', async () => {
    const updated = { ...sampleBranding, teamDisplayName: 'New Name', tertiaryColor: '#CCCCCC', logoUrl: 'https://s3/logo.png' };
    mockGo.mockResolvedValue({ data: updated });
    await repo.update('user-1', 'b-1', {
      teamDisplayName: 'New Name',
      primaryColor: '#1E3A5F',
      tertiaryColor: '#CCCCCC',
      logoUrl: 'https://s3/logo.png',
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ teamDisplayName: 'New Name', tertiaryColor: '#CCCCCC', logoUrl: 'https://s3/logo.png' }),
    );
  });

  it('updates only teamDisplayName (covers FALSE branches for other fields)', async () => {
    mockGo.mockResolvedValue({ data: { ...sampleBranding, teamDisplayName: 'Only Name' } });
    await repo.update('user-1', 'b-1', { teamDisplayName: 'Only Name' });
    expect(mockSet).toHaveBeenCalledWith({ teamDisplayName: 'Only Name' });
  });
});
