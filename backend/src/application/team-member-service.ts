import { randomUUID } from 'node:crypto';
import type {
  AddTeamMemberDto,
  TeamMember,
  UpdateTeamMemberDto,
} from '../domain/team-member.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { TeamMemberRepository } from '../ports/team-member-repository.js';

export class TeamMemberService {
  constructor(
    private readonly repository: TeamMemberRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async addMember(
    organizationId: string,
    teamId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMember> {
    const existing = await this.repository.getByTeamAndMember(
      organizationId,
      teamId,
      dto.memberType,
      dto.memberId,
    );
    if (existing) {
      throw new ConflictError(
        `Member ${dto.memberId} already exists in team ${teamId}`,
      );
    }

    const teamMemberId = randomUUID();
    const joinedAt = new Date().toISOString();

    const member = await this.repository.add({
      ...dto,
      teamMemberId,
      teamId,
      organizationId,
      joinedAt,
    });

    const eventType = dto.memberType === 'athlete'
      ? 'AthleteAddedToTeam'
      : 'CoachAddedToTeam';

    await this.eventPublisher.publish(eventType, {
      organizationId,
      teamId,
      teamMemberId: member.teamMemberId,
      memberId: dto.memberId,
      memberType: dto.memberType,
    });

    return member;
  }

  async getMember(
    organizationId: string,
    teamMemberId: string,
  ): Promise<TeamMember> {
    const member = await this.repository.getById(organizationId, teamMemberId);
    if (!member) {
      throw new NotFoundError(`TeamMember ${teamMemberId} not found`);
    }

    return member;
  }

  async listTeamMembers(
    organizationId: string,
    teamId: string,
    options?: ListOptions,
  ): Promise<ListResult<TeamMember>> {
    return this.repository.listByTeam(organizationId, teamId, options);
  }

  async listMemberTeams(
    organizationId: string,
    memberId: string,
    options?: ListOptions,
  ): Promise<ListResult<TeamMember>> {
    return this.repository.listByMember(organizationId, memberId, options);
  }

  async updateMember(
    organizationId: string,
    teamMemberId: string,
    dto: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const existing = await this.repository.getById(organizationId, teamMemberId);
    if (!existing) {
      throw new NotFoundError(`TeamMember ${teamMemberId} not found`);
    }

    const updated = await this.repository.update(organizationId, teamMemberId, dto);

    await this.eventPublisher.publish('TeamMemberUpdated', {
      organizationId,
      teamMemberId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async removeMember(
    organizationId: string,
    teamMemberId: string,
  ): Promise<void> {
    const existing = await this.repository.getById(organizationId, teamMemberId);
    if (!existing) {
      throw new NotFoundError(`TeamMember ${teamMemberId} not found`);
    }

    await this.repository.remove(organizationId, teamMemberId);

    const eventType = existing.memberType === 'athlete'
      ? 'AthleteRemovedFromTeam'
      : 'CoachRemovedFromTeam';

    await this.eventPublisher.publish(eventType, {
      organizationId,
      teamId: existing.teamId,
      teamMemberId,
      memberId: existing.memberId,
      memberType: existing.memberType,
    });
  }
}
