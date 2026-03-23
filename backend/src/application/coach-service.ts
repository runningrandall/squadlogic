import { randomUUID } from 'node:crypto';
import type {
  CreateCoachDto,
  Coach,
  UpdateCoachDto,
} from '../domain/coach.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { NotFoundError } from '../lib/errors.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { CoachRepository } from '../ports/coach-repository.js';

export class CoachService {
  constructor(
    private readonly repository: CoachRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createCoach(
    organizationId: string,
    dto: CreateCoachDto,
  ): Promise<Coach> {
    const coachId = randomUUID();

    const coach = await this.repository.create({
      ...dto,
      coachId,
      organizationId,
    });

    await this.eventPublisher.publish('CoachCreated', {
      organizationId,
      coachId: coach.coachId,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email,
    });

    return coach;
  }

  async getCoach(organizationId: string, coachId: string): Promise<Coach> {
    const coach = await this.repository.getById(organizationId, coachId);
    if (!coach) {
      throw new NotFoundError(`Coach ${coachId} not found`);
    }

    return coach;
  }

  async listCoaches(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Coach>> {
    return this.repository.listByOrganization(organizationId, options);
  }

  async updateCoach(
    organizationId: string,
    coachId: string,
    dto: UpdateCoachDto,
  ): Promise<Coach> {
    const existing = await this.repository.getById(organizationId, coachId);
    if (!existing) {
      throw new NotFoundError(`Coach ${coachId} not found`);
    }

    const updated = await this.repository.update(organizationId, coachId, dto);

    await this.eventPublisher.publish('CoachUpdated', {
      organizationId,
      coachId,
      changes: Object.keys(dto),
    });

    return updated;
  }

  async deleteCoach(organizationId: string, coachId: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, coachId);
    if (!existing) {
      throw new NotFoundError(`Coach ${coachId} not found`);
    }

    await this.repository.delete(organizationId, coachId);

    await this.eventPublisher.publish('CoachDeleted', {
      organizationId,
      coachId,
      firstName: existing.firstName,
      lastName: existing.lastName,
    });
  }
}
