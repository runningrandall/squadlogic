import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamMemberService } from '../team-member-service.js';
import type { TeamMemberRepository } from '../../ports/team-member-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { TeamMember } from '../../domain/team-member.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

function createMockTeamMember(
  overrides: Partial<TeamMember> = {},
): TeamMember {
  return {
    teamMemberId: 'tm-123',
    teamId: 'team-456',
    organizationId: 'org-789',
    memberId: 'athlete-001',
    memberType: 'athlete',
    role: 'player',
    jerseyNumber: '42',
    status: 'active',
    joinedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): TeamMemberRepository {
  return {
    add: vi.fn(),
    getById: vi.fn(),
    getByTeamAndMember: vi.fn(),
    listByTeam: vi.fn(),
    listByMember: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('TeamMemberService', () => {
  let service: TeamMemberService;
  let repository: TeamMemberRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new TeamMemberService(repository, publisher);
  });

  describe('addMember', () => {
    it('should add an athlete to team and publish AthleteAddedToTeam event', async () => {
      const dto = {
        memberId: 'athlete-001',
        memberType: 'athlete' as const,
        role: 'player' as const,
        jerseyNumber: '42' as string | null,
      };

      const mockMember = createMockTeamMember();

      vi.mocked(repository.getByTeamAndMember).mockResolvedValue(null);
      vi.mocked(repository.add).mockResolvedValue(mockMember);

      const result = await service.addMember('org-789', 'team-456', dto);

      expect(result).toEqual(mockMember);
      expect(repository.getByTeamAndMember).toHaveBeenCalledWith('org-789', 'team-456', 'athlete', 'athlete-001');
      expect(repository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: 'athlete-001',
          memberType: 'athlete',
          teamId: 'team-456',
          organizationId: 'org-789',
          teamMemberId: expect.any(String),
          joinedAt: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteAddedToTeam',
        expect.objectContaining({
          organizationId: 'org-789',
          teamId: 'team-456',
          memberId: 'athlete-001',
          memberType: 'athlete',
        }),
      );
    });

    it('should add a coach to team and publish CoachAddedToTeam event', async () => {
      const dto = {
        memberId: 'coach-001',
        memberType: 'coach' as const,
        role: 'head_coach' as const,
        jerseyNumber: null,
      };

      const mockMember = createMockTeamMember({
        memberId: 'coach-001',
        memberType: 'coach',
        role: 'head_coach',
        jerseyNumber: null,
      });

      vi.mocked(repository.getByTeamAndMember).mockResolvedValue(null);
      vi.mocked(repository.add).mockResolvedValue(mockMember);

      await service.addMember('org-789', 'team-456', dto);

      expect(publisher.publish).toHaveBeenCalledWith(
        'CoachAddedToTeam',
        expect.objectContaining({
          memberType: 'coach',
        }),
      );
    });

    it('should throw ConflictError if member already exists in team', async () => {
      const dto = {
        memberId: 'athlete-001',
        memberType: 'athlete' as const,
        role: 'player' as const,
        jerseyNumber: null,
      };

      vi.mocked(repository.getByTeamAndMember).mockResolvedValue(
        createMockTeamMember(),
      );

      await expect(
        service.addMember('org-789', 'team-456', dto),
      ).rejects.toThrow(ConflictError);
      expect(repository.add).not.toHaveBeenCalled();
    });
  });

  describe('getMember', () => {
    it('should return the team member by id', async () => {
      const mockMember = createMockTeamMember();
      vi.mocked(repository.getById).mockResolvedValue(mockMember);

      const result = await service.getMember('org-789', 'tm-123');

      expect(result).toEqual(mockMember);
      expect(repository.getById).toHaveBeenCalledWith('org-789', 'tm-123');
    });

    it('should throw NotFoundError if team member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getMember('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listTeamMembers', () => {
    it('should return paginated list of team members', async () => {
      const mockMembers = [
        createMockTeamMember({ teamMemberId: 'tm-1' }),
        createMockTeamMember({ teamMemberId: 'tm-2' }),
      ];

      vi.mocked(repository.listByTeam).mockResolvedValue({
        items: mockMembers,
        cursor: undefined,
      });

      const result = await service.listTeamMembers('org-789', 'team-456', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByTeam).toHaveBeenCalledWith('org-789', 'team-456', { limit: 10 });
    });
  });

  describe('listMemberTeams', () => {
    it('should return paginated list of teams for a member', async () => {
      const mockMembers = [
        createMockTeamMember({ teamMemberId: 'tm-1', teamId: 'team-1' }),
        createMockTeamMember({ teamMemberId: 'tm-2', teamId: 'team-2' }),
      ];

      vi.mocked(repository.listByMember).mockResolvedValue({
        items: mockMembers,
        cursor: undefined,
      });

      const result = await service.listMemberTeams('org-789', 'athlete-001', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByMember).toHaveBeenCalledWith('org-789', 'athlete-001', { limit: 10 });
    });
  });

  describe('updateMember', () => {
    it('should update the team member and publish event', async () => {
      const mockMember = createMockTeamMember();
      const updatedMember = createMockTeamMember({ role: 'captain' });

      vi.mocked(repository.getById).mockResolvedValue(mockMember);
      vi.mocked(repository.update).mockResolvedValue(updatedMember);

      const result = await service.updateMember('org-789', 'tm-123', {
        role: 'captain',
      });

      expect(result.role).toBe('captain');
      expect(publisher.publish).toHaveBeenCalledWith(
        'TeamMemberUpdated',
        expect.objectContaining({
          organizationId: 'org-789',
          teamMemberId: 'tm-123',
          changes: ['role'],
        }),
      );
    });

    it('should throw NotFoundError if team member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateMember('org-789', 'non-existent', { role: 'captain' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeMember', () => {
    it('should remove an athlete and publish AthleteRemovedFromTeam event', async () => {
      const mockMember = createMockTeamMember();
      vi.mocked(repository.getById).mockResolvedValue(mockMember);
      vi.mocked(repository.remove).mockResolvedValue(undefined);

      await service.removeMember('org-789', 'tm-123');

      expect(repository.remove).toHaveBeenCalledWith('org-789', 'tm-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteRemovedFromTeam',
        expect.objectContaining({
          organizationId: 'org-789',
          teamId: 'team-456',
          teamMemberId: 'tm-123',
          memberId: 'athlete-001',
          memberType: 'athlete',
        }),
      );
    });

    it('should remove a coach and publish CoachRemovedFromTeam event', async () => {
      const mockMember = createMockTeamMember({
        memberType: 'coach',
        memberId: 'coach-001',
      });
      vi.mocked(repository.getById).mockResolvedValue(mockMember);
      vi.mocked(repository.remove).mockResolvedValue(undefined);

      await service.removeMember('org-789', 'tm-123');

      expect(publisher.publish).toHaveBeenCalledWith(
        'CoachRemovedFromTeam',
        expect.objectContaining({
          memberType: 'coach',
        }),
      );
    });

    it('should throw NotFoundError if team member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.removeMember('org-789', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
