import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/coach.js', () => ({
  CoachEntity: {
    create: vi.fn(() => ({ go: mockGo })),
    get: vi.fn(() => ({ go: mockGo })),
    query: {
      byOrganization: vi.fn(() => ({ go: mockGo })),
    },
    patch: vi.fn(() => ({ set: mockSet })),
    delete: vi.fn(() => ({ go: mockGo })),
  },
}));

vi.mock('../../lib/dynamodb.js', () => ({
  tableConfig: { table: 'TestTable', client: {} },
}));

const { CoachDynamoRepository } = await import(
  '../coach-dynamo-repository.js'
);
const { CoachEntity } = await import(
  '../../entities/coach.js'
);

const mockCoach = {
  coachId: 'coach-123',
  organizationId: 'org-123',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '555-0100',
  certifications: ['CPR', 'First Aid'],
  specialties: ['Offense'],
  status: 'active' as const,
  notes: 'Great coach',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CoachDynamoRepository', () => {
  let repo: InstanceType<typeof CoachDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CoachDynamoRepository();
  });

  describe('create', () => {
    it('creates coach via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockCoach });
      const result = await repo.create({ ...mockCoach });
      expect(CoachEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockCoach);
    });

    it('creates coach with minimal fields (no optional values)', async () => {
      const minimalCoach = {
        coachId: 'coach-456',
        organizationId: 'org-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        certifications: [],
        specialties: [],
      };
      const minimalResult = {
        ...minimalCoach,
        phone: '',
        status: 'active',
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockGo.mockResolvedValueOnce({ data: minimalResult });
      const result = await repo.create(minimalCoach as any);
      expect(CoachEntity.create).toHaveBeenCalled();
      expect(result).toEqual(minimalResult);
    });
  });

  describe('getById', () => {
    it('returns coach when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockCoach });
      const result = await repo.getById('org-123', 'coach-123');
      expect(CoachEntity.get).toHaveBeenCalledWith({
        organizationId: 'org-123',
        coachId: 'coach-123',
      });
      expect(result).toEqual(mockCoach);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-123', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByOrganization', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockCoach], cursor: 'next-page' });
      const result = await repo.listByOrganization('org-123', { limit: 10 });
      expect(result.items).toEqual([mockCoach]);
      expect(result.cursor).toBe('next-page');
    });

    it('uses default limit when not specified', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      const result = await repo.listByOrganization('org-123');
      expect(result.items).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it('passes cursor when provided', async () => {
      mockGo.mockResolvedValueOnce({ data: [], cursor: null });
      await repo.listByOrganization('org-123', { cursor: 'abc', limit: 5 });
      expect(CoachEntity.query.byOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });
    });
  });

  describe('update', () => {
    it('updates coach', async () => {
      const updated = { ...mockCoach, firstName: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', 'coach-123', { firstName: 'Updated' });
      expect(CoachEntity.patch).toHaveBeenCalledWith({
        organizationId: 'org-123',
        coachId: 'coach-123',
      });
      expect(mockSet).toHaveBeenCalledWith({ firstName: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when update returns no data', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      await expect(repo.update('org-123', 'missing', { firstName: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes coach', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-123', 'coach-123');
      expect(CoachEntity.delete).toHaveBeenCalledWith({
        organizationId: 'org-123',
        coachId: 'coach-123',
      });
    });
  });
});
