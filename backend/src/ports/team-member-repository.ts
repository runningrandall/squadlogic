import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { AddTeamMemberDto, TeamMember, UpdateTeamMemberDto } from '../domain/team-member.js';

export interface TeamMemberRepository {
  add(member: AddTeamMemberDto & { teamMemberId: string; teamId: string; organizationId: string; joinedAt: string }): Promise<TeamMember>;
  getById(organizationId: string, teamMemberId: string): Promise<TeamMember | null>;
  getByTeamAndMember(organizationId: string, teamId: string, memberType: string, memberId: string): Promise<TeamMember | null>;
  listByTeam(organizationId: string, teamId: string, options?: ListOptions): Promise<ListResult<TeamMember>>;
  listByMember(organizationId: string, memberId: string, options?: ListOptions): Promise<ListResult<TeamMember>>;
  update(organizationId: string, teamMemberId: string, data: UpdateTeamMemberDto): Promise<TeamMember>;
  remove(organizationId: string, teamMemberId: string): Promise<void>;
}
