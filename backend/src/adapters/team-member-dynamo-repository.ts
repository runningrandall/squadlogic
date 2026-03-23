import type { AddTeamMemberDto, TeamMember, UpdateTeamMemberDto } from '../domain/team-member.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { TeamMemberEntity } from '../entities/team-member.js';
import { NotFoundError } from '../lib/errors.js';
import type { TeamMemberRepository } from '../ports/team-member-repository.js';

export class TeamMemberDynamoRepository implements TeamMemberRepository {
  async add(
    member: AddTeamMemberDto & { teamMemberId: string; teamId: string; organizationId: string; joinedAt: string },
  ): Promise<TeamMember> {
    const result = await TeamMemberEntity.create({
      teamMemberId: member.teamMemberId,
      teamId: member.teamId,
      organizationId: member.organizationId,
      memberId: member.memberId,
      memberType: member.memberType,
      role: member.role,
      ...(member.jerseyNumber != null && { jerseyNumber: member.jerseyNumber }),
      status: 'active',
      joinedAt: member.joinedAt,
    }).go();

    return result.data as unknown as TeamMember;
  }

  async getById(organizationId: string, teamMemberId: string): Promise<TeamMember | null> {
    const result = await TeamMemberEntity.get({
      organizationId,
      teamMemberId,
    }).go();

    return (result.data as unknown as TeamMember) ?? null;
  }

  async getByTeamAndMember(
    organizationId: string,
    teamId: string,
    memberType: string,
    memberId: string,
  ): Promise<TeamMember | null> {
    const result = await TeamMemberEntity.query
      .byTeam({ organizationId, teamId, memberType: memberType as 'athlete' | 'coach', memberId })
      .go();

    const items = result.data;
    if (items.length === 0) {
      return null;
    }

    return items[0] as unknown as TeamMember;
  }

  async listByTeam(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<TeamMember>> {
    const query = TeamMemberEntity.query
      .byTeam({ organizationId, teamId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as TeamMember[],
      cursor: result.cursor ?? undefined,
    };
  }

  async listByMember(
    organizationId: string,
    memberId: string,
    options?: ListOptions,
  ): Promise<ListResult<TeamMember>> {
    const query = TeamMemberEntity.query
      .byMember({ organizationId, memberId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as TeamMember[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    teamMemberId: string,
    data: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const updateData: Record<string, unknown> = { ...data };
    if (updateData.jerseyNumber === null) {
      delete updateData.jerseyNumber;
    }
    const result = await TeamMemberEntity.patch({
      organizationId,
      teamMemberId,
    })
      .set(updateData)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`TeamMember ${teamMemberId} not found`);
    }

    return result.data as unknown as TeamMember;
  }

  async remove(organizationId: string, teamMemberId: string): Promise<void> {
    await TeamMemberEntity.delete({
      organizationId,
      teamMemberId,
    }).go();
  }
}
