import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamService } from '../team-service.js';
import type { TeamRepository } from '../../ports/team-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { Team } from '../../domain/team.js';
import { NotFoundError } from '../../lib/errors.js';

function createMockTeam(
  overrides: Partial<Team> = {},
): Team {
  return {
    teamId: 'team-123',
    organizationId: 'org-123',
    name: 'Varsity Football',
    sport: 'Football',
    season: 'Fall 2026',
    status: 'active',
    description: 'The varsity football team',
    maxRosterSize: 50,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): TeamRepository {
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

describe('TeamService', () => {
  let service: TeamService;
  let repository: TeamRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new TeamService(repository, publisher);
  });

  describe('createTeam', () => {
    it('should create a team and publish event', async () => {
      const dto = {
        name: 'Varsity Football',
        sport: 'Football',
        season: 'Fall 2026',
        description: 'The varsity football team',
        maxRosterSize: 50,
      };

      const mockTeam = createMockTeam({
        name: dto.name,
        sport: dto.sport,
        season: dto.season,
      });

      vi.mocked(repository.create).mockResolvedValue(mockTeam);

      const result = await service.createTeam('org-123', dto);

      expect(result).toEqual(mockTeam);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Varsity Football',
          sport: 'Football',
          season: 'Fall 2026',
          organizationId: 'org-123',
          teamId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'TeamCreated',
        expect.objectContaining({
          organizationId: 'org-123',
          teamId: mockTeam.teamId,
          name: mockTeam.name,
          sport: mockTeam.sport,
        }),
      );
    });
  });

  describe('getTeam', () => {
    it('should return the team by id', async () => {
      const mockTeam = createMockTeam();
      vi.mocked(repository.getById).mockResolvedValue(mockTeam);

      const result = await service.getTeam('org-123', 'team-123');

      expect(result).toEqual(mockTeam);
      expect(repository.getById).toHaveBeenCalledWith('org-123', 'team-123');
    });

    it('should throw NotFoundError if team does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getTeam('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listTeams', () => {
    it('should return paginated list of teams', async () => {
      const mockTeams = [
        createMockTeam({ teamId: 'team-1' }),
        createMockTeam({ teamId: 'team-2' }),
      ];

      vi.mocked(repository.listByOrganization).mockResolvedValue({
        items: mockTeams,
        cursor: undefined,
      });

      const result = await service.listTeams('org-123', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByOrganization).toHaveBeenCalledWith('org-123', { limit: 10 });
    });
  });

  describe('updateTeam', () => {
    it('should update the team and publish event', async () => {
      const mockTeam = createMockTeam();
      const updatedTeam = createMockTeam({ name: 'Updated Name' });

      vi.mocked(repository.getById).mockResolvedValue(mockTeam);
      vi.mocked(repository.update).mockResolvedValue(updatedTeam);

      const result = await service.updateTeam('org-123', 'team-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(publisher.publish).toHaveBeenCalledWith(
        'TeamUpdated',
        expect.objectContaining({
          organizationId: 'org-123',
          teamId: 'team-123',
          changes: ['name'],
        }),
      );
    });

    it('should throw NotFoundError if team does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateTeam('org-123', 'non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTeam', () => {
    it('should delete the team and publish event', async () => {
      const mockTeam = createMockTeam();
      vi.mocked(repository.getById).mockResolvedValue(mockTeam);
      vi.mocked(repository.delete).mockResolvedValue(undefined);

      await service.deleteTeam('org-123', 'team-123');

      expect(repository.delete).toHaveBeenCalledWith('org-123', 'team-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'TeamDeleted',
        expect.objectContaining({
          organizationId: 'org-123',
          teamId: 'team-123',
          name: 'Varsity Football',
        }),
      );
    });

    it('should throw NotFoundError if team does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.deleteTeam('org-123', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
