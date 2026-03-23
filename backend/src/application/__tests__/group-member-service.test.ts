import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupMemberService } from '../group-member-service.js';
import type { GroupMemberRepository } from '../../ports/group-member-repository.js';
import type { EventPublisher } from '../../ports/event-publisher.js';
import type { GroupMember } from '../../domain/group-member.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

function createMockGroupMember(
  overrides: Partial<GroupMember> = {},
): GroupMember {
  return {
    groupMemberId: 'gm-123',
    groupId: 'group-456',
    teamId: 'team-789',
    organizationId: 'org-001',
    athleteId: 'athlete-002',
    role: 'member',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockRepository(): GroupMemberRepository {
  return {
    add: vi.fn(),
    getById: vi.fn(),
    getByGroupAndAthlete: vi.fn(),
    listByGroup: vi.fn(),
    listByAthlete: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn(),
  };
}

describe('GroupMemberService', () => {
  let service: GroupMemberService;
  let repository: GroupMemberRepository;
  let publisher: EventPublisher;

  beforeEach(() => {
    repository = createMockRepository();
    publisher = createMockPublisher();
    service = new GroupMemberService(repository, publisher);
  });

  describe('addMember', () => {
    it('should add an athlete to group and publish event', async () => {
      const dto = {
        athleteId: 'athlete-002',
        role: 'member' as const,
      };

      const mockMember = createMockGroupMember();

      vi.mocked(repository.getByGroupAndAthlete).mockResolvedValue(null);
      vi.mocked(repository.add).mockResolvedValue(mockMember);

      const result = await service.addMember('org-001', 'group-456', 'team-789', dto);

      expect(result).toEqual(mockMember);
      expect(repository.getByGroupAndAthlete).toHaveBeenCalledWith('org-001', 'group-456', 'athlete-002');
      expect(repository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          athleteId: 'athlete-002',
          groupId: 'group-456',
          teamId: 'team-789',
          organizationId: 'org-001',
          groupMemberId: expect.any(String),
        }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteAddedToGroup',
        expect.objectContaining({
          organizationId: 'org-001',
          groupId: 'group-456',
          teamId: 'team-789',
          athleteId: 'athlete-002',
        }),
      );
    });

    it('should throw ConflictError if athlete already exists in group', async () => {
      const dto = {
        athleteId: 'athlete-002',
        role: 'member' as const,
      };

      vi.mocked(repository.getByGroupAndAthlete).mockResolvedValue(
        createMockGroupMember(),
      );

      await expect(
        service.addMember('org-001', 'group-456', 'team-789', dto),
      ).rejects.toThrow(ConflictError);
      expect(repository.add).not.toHaveBeenCalled();
    });
  });

  describe('getMember', () => {
    it('should return the group member by id', async () => {
      const mockMember = createMockGroupMember();
      vi.mocked(repository.getById).mockResolvedValue(mockMember);

      const result = await service.getMember('org-001', 'gm-123');

      expect(result).toEqual(mockMember);
      expect(repository.getById).toHaveBeenCalledWith('org-001', 'gm-123');
    });

    it('should throw NotFoundError if group member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.getMember('org-001', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listGroupMembers', () => {
    it('should return paginated list of group members', async () => {
      const mockMembers = [
        createMockGroupMember({ groupMemberId: 'gm-1' }),
        createMockGroupMember({ groupMemberId: 'gm-2' }),
      ];

      vi.mocked(repository.listByGroup).mockResolvedValue({
        items: mockMembers,
        cursor: undefined,
      });

      const result = await service.listGroupMembers('org-001', 'group-456', { limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(repository.listByGroup).toHaveBeenCalledWith('org-001', 'group-456', { limit: 10 });
    });
  });

  describe('updateMember', () => {
    it('should update the group member and publish event', async () => {
      const mockMember = createMockGroupMember();
      const updatedMember = createMockGroupMember({ role: 'leader' });

      vi.mocked(repository.getById).mockResolvedValue(mockMember);
      vi.mocked(repository.update).mockResolvedValue(updatedMember);

      const result = await service.updateMember('org-001', 'gm-123', {
        role: 'leader',
      });

      expect(result.role).toBe('leader');
      expect(publisher.publish).toHaveBeenCalledWith(
        'GroupMemberUpdated',
        expect.objectContaining({
          organizationId: 'org-001',
          groupMemberId: 'gm-123',
          changes: ['role'],
        }),
      );
    });

    it('should throw NotFoundError if group member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.updateMember('org-001', 'non-existent', { role: 'leader' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeMember', () => {
    it('should remove the group member and publish event', async () => {
      const mockMember = createMockGroupMember();
      vi.mocked(repository.getById).mockResolvedValue(mockMember);
      vi.mocked(repository.remove).mockResolvedValue(undefined);

      await service.removeMember('org-001', 'gm-123');

      expect(repository.remove).toHaveBeenCalledWith('org-001', 'gm-123');
      expect(publisher.publish).toHaveBeenCalledWith(
        'AthleteRemovedFromGroup',
        expect.objectContaining({
          organizationId: 'org-001',
          groupId: 'group-456',
          teamId: 'team-789',
          groupMemberId: 'gm-123',
          athleteId: 'athlete-002',
        }),
      );
    });

    it('should throw NotFoundError if group member does not exist', async () => {
      vi.mocked(repository.getById).mockResolvedValue(null);

      await expect(
        service.removeMember('org-001', 'non-existent'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
