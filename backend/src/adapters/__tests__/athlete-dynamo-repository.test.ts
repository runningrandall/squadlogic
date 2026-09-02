import { NotFoundError } from '../../lib/errors.js';

const mockGo = vi.fn();
const mockSet = vi.fn(() => ({ go: mockGo }));

vi.mock('../../entities/athlete.js', () => ({
  AthleteEntity: {
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

const { AthleteDynamoRepository } = await import(
  '../athlete-dynamo-repository.js'
);
const { AthleteEntity } = await import(
  '../../entities/athlete.js'
);

const mockAthlete = {
  athleteId: 'ath-123',
  organizationId: 'org-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-0100',
  dateOfBirth: '2000-01-15',
  positions: ['Forward'],
  jerseyNumber: '10',
  status: 'active' as const,
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '555-0200',
  notes: 'Good player',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AthleteDynamoRepository', () => {
  let repo: InstanceType<typeof AthleteDynamoRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AthleteDynamoRepository();
  });

  describe('create', () => {
    it('creates athlete via ElectroDB entity', async () => {
      mockGo.mockResolvedValueOnce({ data: mockAthlete });
      const result = await repo.create({ ...mockAthlete });
      expect(AthleteEntity.create).toHaveBeenCalled();
      expect(result).toEqual(mockAthlete);
    });

    it('creates athlete without phone or positions (uses ?? defaults)', async () => {
      const noDefaults = {
        athleteId: 'ath-789',
        organizationId: 'org-123',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob@example.com',
        // no phone, no positions
      };
      mockGo.mockResolvedValueOnce({ data: { ...noDefaults, phone: '', positions: [], status: 'active' } });
      await repo.create(noDefaults as any);
      expect(AthleteEntity.create).toHaveBeenCalled();
    });

    it('creates athlete with minimal fields (no optional values)', async () => {
      const minimalAthlete = {
        athleteId: 'ath-456',
        organizationId: 'org-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        positions: [],
      };
      const minimalResult = {
        ...minimalAthlete,
        phone: '',
        dateOfBirth: null,
        jerseyNumber: null,
        status: 'active',
        emergencyContactName: null,
        emergencyContactPhone: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      mockGo.mockResolvedValueOnce({ data: minimalResult });
      const result = await repo.create(minimalAthlete as any);
      expect(AthleteEntity.create).toHaveBeenCalled();
      expect(result).toEqual(minimalResult);
    });
  });

  describe('getById', () => {
    it('returns athlete when found', async () => {
      mockGo.mockResolvedValueOnce({ data: mockAthlete });
      const result = await repo.getById('org-123', 'ath-123');
      expect(AthleteEntity.get).toHaveBeenCalledWith({
        organizationId: 'org-123',
        athleteId: 'ath-123',
      });
      expect(result).toEqual(mockAthlete);
    });

    it('returns null when not found', async () => {
      mockGo.mockResolvedValueOnce({ data: null });
      const result = await repo.getById('org-123', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listByOrganization', () => {
    it('returns paginated results', async () => {
      mockGo.mockResolvedValueOnce({ data: [mockAthlete], cursor: 'next-page' });
      const result = await repo.listByOrganization('org-123', { limit: 10 });
      expect(result.items).toEqual([mockAthlete]);
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
      expect(AthleteEntity.query.byOrganization).toHaveBeenCalledWith({
        organizationId: 'org-123',
      });
    });
  });

  describe('update', () => {
    it('updates athlete', async () => {
      const updated = { ...mockAthlete, firstName: 'Updated' };
      mockGo.mockResolvedValueOnce({ data: updated });
      const result = await repo.update('org-123', 'ath-123', { firstName: 'Updated' });
      expect(AthleteEntity.patch).toHaveBeenCalledWith({
        organizationId: 'org-123',
        athleteId: 'ath-123',
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
    it('deletes athlete', async () => {
      mockGo.mockResolvedValueOnce({});
      await repo.delete('org-123', 'ath-123');
      expect(AthleteEntity.delete).toHaveBeenCalledWith({
        organizationId: 'org-123',
        athleteId: 'ath-123',
      });
    });
  });
});
