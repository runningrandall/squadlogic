import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AthleteService } from '../athlete-service.js';
import type { AthleteRepository } from '../../ports/athlete-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Athlete } from '../../domain/athlete.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockAthlete(
  overrides: Partial<Athlete> = {},
): Athlete {
  return {
    athleteId: 'ath-123',
    organizationId: 'org-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0100',
    dateOfBirth: '2000-01-15',
    positions: ['Forward'],
    jerseyNumber: '10',
    status: 'active',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '555-0200',
    notes: 'Good player',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): AthleteRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    listByOrganization: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('AthleteService', () => {
  let service: AthleteService;
  let repository: AthleteRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new AthleteService(repository, publisher);
  });

  describe('createAthlete', () => {
    it('should create an athlete and publish event', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        positions: ['Forward'],
      };

      const mockAthlete = createMockAthlete({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
      });

      vi.mocked(repository.create).mockResolvedValue(mockAthlete);

      const result = await service.createAthlete('org-123', dto);

      expect(result).toEqual(mockAthlete);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          organizationId: 'org-123',
          athleteId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteCreated',
        expect.objectContaining({
          organizationId: 'org-123',
          athleteId: mockAthlete.athleteId,
          firstName: mockAthlete.firstName,
          lastName: mockAthlete.lastName,
        }),
      );
    });
  });

  describe('getAthlete', () => {
    it('should return the athlete by id', async () => {
      const mockAthlete = createMockAthlete();
      vi.mocked(repository.getById).mockResolvedValue(mockAthlete);

      const result = await service.getAthlete('org-123', 'ath-123');

      expect(result).toEqual(mockAthlete);
      expect(repository.getById).toHaveBeenCalledWith('org-123', 'ath-123');
    });

    it('should throw NotFoundError if athlete does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getAthlete('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listAthletes', () => {
    it('should return paginated list of athletes', async () => {
      const mockAthletes = [
        createMockAthlete({ athleteId: 'ath-1' }),
        createMockAthlete({ athleteId: 'ath-2' }),
      ];

      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: mockAthletes,
        cursor: undefined,
      });

      const result = await service.listAthletes('org-123', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByOrganization).toHaveBeenCalledWith('org-123', { limit: 10 });
    });
  });

  describe('updateAthlete', () => {
    it('should update the athlete and publish event', async () => {
      const mockAthlete = createMockAthlete();
      const updatedAthlete = createMockAthlete({ firstName: 'Updated' });

      vi.mocked(repository.getById).mockResolvedValue(mockAthlete);
      vi.mocked(repository.update).mockResolvedValue(updatedAthlete);

      const result = await service.updateAthlete('org-123', 'ath-123', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteUpdated',
        expect.objectContaining({
          organizationId: 'org-123',
          athleteId: 'ath-123',
          changes: ['firstName'],
        }),
      );
    });

    it('should throw NotFoundError if athlete does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateAthlete('org-123', 'non-existent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteAthlete', () => {
    it('should delete the athlete and publish event', async () => {
      const mockAthlete = createMockAthlete();
      vi.mocked(repository.getById).mockResolvedValue(mockAthlete);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteAthlete('org-123', 'ath-123');

      expect(repository.delete).toHaveBeenCalledWith('org-123', 'ath-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteDeleted',
        expect.objectContaining({
          organizationId: 'org-123',
          athleteId: 'ath-123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
    });

    it('should throw NotFoundError if athlete does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteAthlete('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
