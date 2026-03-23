import type { AddGroupMemberDto, GroupMember, UpdateGroupMemberDto } from '../domain/group-member.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { GroupMemberEntity } from '../entities/group-member.js';
import { NotFoundError } from '../lib/errors.js';
import type { GroupMemberRepository } from '../ports/group-member-repository.js';

export class GroupMemberDynamoRepository implements GroupMemberRepository {
  async add(
    member: AddGroupMemberDto & { groupMemberId: string; groupId: string; teamId: string; organizationId: string },
  ): Promise<GroupMember> {
    const result = await GroupMemberEntity.create({
      groupMemberId: member.groupMemberId,
      groupId: member.groupId,
      teamId: member.teamId,
      organizationId: member.organizationId,
      athleteId: member.athleteId,
      role: member.role ?? 'member',
      status: 'active',
    }).go();

    return result.data as unknown as GroupMember;
  }

  async getById(organizationId: string, groupMemberId: string): Promise<GroupMember | null> {
    const result = await GroupMemberEntity.get({
      organizationId,
      groupMemberId,
    }).go();

    return (result.data as unknown as GroupMember) ?? null;
  }

  async getByGroupAndAthlete(
    organizationId: string,
    groupId: string,
    athleteId: string,
  ): Promise<GroupMember | null> {
    const result = await GroupMemberEntity.query
      .byGroup({ organizationId, groupId, athleteId })
      .go();

    const items = result.data;
    if (items.length === 0) {
      return null;
    }

    return items[0] as unknown as GroupMember;
  }

  async listByGroup(
    organizationId: string,
    groupId: string,
    options?: ListOptions,
  ): Promise<ListResult<GroupMember>> {
    const query = GroupMemberEntity.query
      .byGroup({ organizationId, groupId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as GroupMember[],
      cursor: result.cursor ?? undefined,
    };
  }

  async listByAthlete(
    organizationId: string,
    athleteId: string,
    options?: ListOptions,
  ): Promise<ListResult<GroupMember>> {
    const query = GroupMemberEntity.query
      .byAthlete({ organizationId, athleteId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as GroupMember[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    groupMemberId: string,
    data: UpdateGroupMemberDto,
  ): Promise<GroupMember> {
    const result = await GroupMemberEntity.patch({
      organizationId,
      groupMemberId,
    })
      .set(data)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`GroupMember ${groupMemberId} not found`);
    }

    return result.data as unknown as GroupMember;
  }

  async remove(organizationId: string, groupMemberId: string): Promise<void> {
    await GroupMemberEntity.delete({
      organizationId,
      groupMemberId,
    }).go();
  }
}
