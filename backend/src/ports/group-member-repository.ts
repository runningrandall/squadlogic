import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { AddGroupMemberDto, GroupMember, UpdateGroupMemberDto } from '../domain/group-member.js';

export interface GroupMemberRepository {
  add(member: AddGroupMemberDto & { groupMemberId: string; groupId: string; teamId: string; organizationId: string }): Promise<GroupMember>;
  getById(organizationId: string, groupMemberId: string): Promise<GroupMember | null>;
  getByGroupAndAthlete(organizationId: string, groupId: string, athleteId: string): Promise<GroupMember | null>;
  listByGroup(organizationId: string, groupId: string, options?: ListOptions): Promise<ListResult<GroupMember>>;
  listByAthlete(organizationId: string, athleteId: string, options?: ListOptions): Promise<ListResult<GroupMember>>;
  update(organizationId: string, groupMemberId: string, data: UpdateGroupMemberDto): Promise<GroupMember>;
  remove(organizationId: string, groupMemberId: string): Promise<void>;
}
