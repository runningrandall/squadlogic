import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoachService } from '../coach-service.js';
import type { CoachRepository } from '../../ports/coach-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Coach } from '../../domain/coach.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockCoach(
  overrides: Partial<Coach> = {},
): Coach {
  return {
    coachId: 'coach-123',
    organizationId: 'org-123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-0100',
    certifications: ['CPR', 'First Aid'],
    specialties: ['Offense'],
    status: 'active',
    notes: 'Great coach',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): CoachRepository {
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

describe('CoachService', () => {
  let service: CoachService;
  let repository: CoachRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new CoachService(repository, publisher);
  });

  describe('createCoach', () => {
    it('should create a coach and publish event', async () => {
      const dto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        certifications: ['CPR'],
        specialties: ['Offense'],
      };

      const mockCoach = createMockCoach({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
      });

      vi.mocked(repository.create).mockResolvedValue(mockCoach);

      const result = await service.createCoach('org-123', dto);

      expect(result).toEqual(mockCoach);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          organizationId: 'org-123',
          coachId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'CoachCreated',
        expect.objectContaining({
          organizationId: 'org-123',
          coachId: mockCoach.coachId,
          firstName: mockCoach.firstName,
          lastName: mockCoach.lastName,
        }),
      );
    });
  });

  describe('getCoach', () => {
    it('should return the coach by id', async () => {
      const mockCoach = createMockCoach();
      vi.mocked(repository.getById).mockResolvedValue(mockCoach);

      const result = await service.getCoach('org-123', 'coach-123');

      expect(result).toEqual(mockCoach);
      expect(repository.getById).toHaveBeenCalledWith('org-123', 'coach-123');
    });

    it('should throw NotFoundError if coach does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getCoach('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listCoaches', () => {
    it('should return paginated list of coaches', async () => {
      const mockCoaches = [
        createMockCoach({ coachId: 'coach-1' }),
        createMockCoach({ coachId: 'coach-2' }),
      ];

      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: mockCoaches,
        cursor: undefined,
      });

      const result = await service.listCoaches('org-123', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByOrganization).toHaveBeenCalledWith('org-123', { limit: 10 });
    });
  });

  describe('updateCoach', () => {
    it('should update the coach and publish event', async () => {
      const mockCoach = createMockCoach();
      const updatedCoach = createMockCoach({ firstName: 'Updated' });

      vi.mocked(repository.getById).mockResolvedValue(mockCoach);
      vi.mocked(repository.update).mockResolvedValue(updatedCoach);

      const result = await service.updateCoach('org-123', 'coach-123', {
        firstName: 'Updated',
      });

      expect(result.firstName).toBe('Updated');
      expect(publisher.publish).toHaveBeenCalledWith(
        'CoachUpdated',
        expect.objectContaining({
          organizationId: 'org-123',
          coachId: 'coach-123',
          changes: ['firstName'],
        }),
      );
    });

    it('should throw NotFoundError if coach does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateCoach('org-123', 'non-existent', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteCoach', () => {
    it('should delete the coach and publish event', async () => {
      const mockCoach = createMockCoach();
      vi.mocked(repository.getById).mockResolvedValue(mockCoach);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteCoach('org-123', 'coach-123');

      expect(repository.delete).toHaveBeenCalledWith('org-123', 'coach-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'CoachDeleted',
        expect.objectContaining({
          organizationId: 'org-123',
          coachId: 'coach-123',
          firstName: 'Jane',
          lastName: 'Smith',
        }),
      );
    });

    it('should throw NotFoundError if coach does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteCoach('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
