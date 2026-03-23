import type { CreateCoachDto, Coach, UpdateCoachDto } from '../domain/coach.js';
import type { ListOptions, ListResult } from '../domain/pagination.js';
import { CoachEntity } from '../entities/coach.js';
import { NotFoundError } from '../lib/errors.js';
import type { CoachRepository } from '../ports/coach-repository.js';

export class CoachDynamoRepository implements CoachRepository {
  async create(
    coach: CreateCoachDto & { coachId: string; organizationId: string },
  ): Promise<Coach> {
    const result = await CoachEntity.create({
      coachId: coach.coachId,
      organizationId: coach.organizationId,
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email,
      phone: coach.phone ?? '',
      status: 'active',
      certifications: coach.certifications ?? [],
      specialties: coach.specialties ?? [],
      ...(coach.notes != null && { notes: coach.notes }),
    }).go();

    return result.data as unknown as Coach;
  }

  async getById(organizationId: string, coachId: string): Promise<Coach | null> {
    const result = await CoachEntity.get({
      organizationId,
      coachId,
    }).go();

    return (result.data as unknown as Coach) ?? null;
  }

  async listByOrganization(
    organizationId: string,
    options?: ListOptions,
  ): Promise<ListResult<Coach>> {
    const query = CoachEntity.query
      .byOrganization({ organizationId })
      .go({
        limit: options?.limit ?? 25,
        ...(options?.cursor && { cursor: options.cursor }),
      });

    const result = await query;

    return {
      items: result.data as unknown as Coach[],
      cursor: result.cursor ?? undefined,
    };
  }

  async update(
    organizationId: string,
    coachId: string,
    data: UpdateCoachDto,
  ): Promise<Coach> {
    const result = await CoachEntity.patch({
      organizationId,
      coachId,
    })
      .set(data)
      .go({ response: 'all_new' });

    if (!result.data) {
      throw new NotFoundError(`Coach ${coachId} not found`);
    }

    return result.data as unknown as Coach;
  }

  async delete(organizationId: string, coachId: string): Promise<void> {
    await CoachEntity.delete({
      organizationId,
      coachId,
    }).go();
  }
}
