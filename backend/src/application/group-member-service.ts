import { randomUUID } from 'node:crypto';
import type {
  AddGroupMemberDto,
  GroupMember,
  UpdateGroupMemberDto,
} from '../domain/group-member.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { GroupMemberRepository } from '../ports/group-member-repository.js';

export class GroupMemberService {
  constructor(
    private readonly repository: GroupMemberRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async addMember(
    organizationId: string,
    groupId: string,
    teamId: string,
    dto: AddGroupMemberDto,
  ): Promise<GroupMember> {
    const existing = await this.repository.getByGroupAndAthlete(
      organizationId,
      groupId,
      dto.athleteId,
    );
    if (existing) {
      throw new ConflictError(
        `Athlete ${dto.athleteId} already exists in group ${groupId}`,
      );
    }

    const groupMemberId = randomUUID();

    const member = await this.repository.add({
      ...dto,
      groupMemberId,
      groupId,
      teamId,
      organizationId,
    });

    await this.eventPublisher.publish('AthleteAddedToGroup', {
      organizationId,
      groupId,
      teamId,
      groupMemberId: member.groupMemberId,
      athleteId: dto.athleteId,
    });

    return member;
  }

  async getMember(
    organizationId: string,
    groupMemberId: string,
  ): Promise<GroupMember> {
    const member = await this.repository.getById(organizationId, groupMemberId);
    if (!member) {
      throw new NotFoundError(`GroupMember ${groupMemberId} not found`);
    }

    return member;
  }

  async listGroupMembers(
    organizationId: string,
    groupId: string,
    options?: ListOptions,
  ): Promise<ListResult<GroupMember>> {
    return this.repository.listByGroup(organizationId, groupId, options);
  }

  async updateMember(
    organizationId: string,
    groupMemberId: string,
    dto: UpdateGroupMemberDto,
  ): Promise<GroupMember> {
    const existing = await this.repository.getById(organizationId, groupMemberId);
    if (!existing) {
      throw new NotFoundError(`GroupMember ${groupMemberId} not found`);
    }

    const updated = await this.repository.update(organizationId, groupMemberId, dto);

    await this.eventPublisher.publish('GroupMemberUpdated', {
      organizationId,
      groupMemberId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async removeMember(
    organizationId: string,
    groupMemberId: string,
  ): Promise<void> {
    const existing = await this.repository.getById(organizationId, groupMemberId);
    if (!existing) {
      throw new NotFoundError(`GroupMember ${groupMemberId} not found`);
    }

    await this.repository.remove(organizationId, groupMemberId);

    await this.eventPublisher.publish('AthleteRemovedFromGroup', {
      organizationId,
      groupId: existing.groupId,
      teamId: existing.teamId,
      groupMemberId,
      athleteId: existing.athleteId,
    });
  }
}
