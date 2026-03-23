import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/organization.js', () => ({
  OrganizationEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      bySlug: vi.fn(() => ({ go: mockGo })),
      allOrganizations: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { OrganizationDynamoRepository } = await import(
  '../organization-dynamo-repository.js'
);
const { OrganizationEntity } = await import(
  '../../entities/organization.js'
);

const mockOrg = {
  organizationId: 'org-123',
  name: 'Test Org',
  slug: 'test-org',
  status: 'active' as const,
  ownerUserId: 'user-456',
  billingEmail: 'billing@test.com',
  phone: '555-0100',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  timezone: 'America/Chicago',
  config: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('OrganizationDynamoRepository', () => {
  let repo: InstanceType<typeof OrganizationDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new OrganizationDynamoRepository();
  });

  describe('create', () => {
    it('creates org via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockOrg });
      const result = await repo.create({ ...mockOrg });
      expect(OrganizationEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockOrg);
    });
  });

  describe('getById', () => {
    it('returns organization when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockOrg });
      const result = await repo.getById('org-123');
      expect(OrganizationEntity.get).toHaveBeenCalledWith({ organizationId: 'org-123' });
      expect(result).toEqual(mockOrg);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('returns organization when found by slug', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockOrg] });
      const result = await repo.getBySlug('test-org');
      expect(OrganizationEntity.query.bySlug).toHaveBeenCalledWith({ slug: 'test-org' });
      expect(result).toEqual(mockOrg);
    });

    it('returns null when no results', async () => {
      mockGo.mockResolvedValueOnce({ data: [] });
      const result = await repo.getBySlug('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockOrg], cursor: 'next-page' });
      const result = await repo.list({ limit: 10 });
      expect(result.items).toEqual([mockOrg]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.list();
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.list({ cursor: 'abc', limit: 5 });
      expect(OrganizationEntity.query.allOrganizations).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates organization', async () => {
      const updated = { ...mockOrg, name: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', { name: 'Updated' });
      expect(OrganizationEntity.patch).toHaveBeenCalledWith({ organizationId: 'org-123' });
      expect(mockSet).toHaveBeenCalledWith({ name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('missing', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes organization', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-123');
      expect(OrganizationEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-123' });
    });
  });
});
