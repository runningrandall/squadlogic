import type { ListOptions, ListResult } from '../domain/pagination.js';
import type { CreateCoachDto, Coach, UpdateCoachDto } from '../domain/coach.js';

export interface CoachRepository {
  create(coach: CreateCoachDto & { coachId: string; organizationId: string }): Promise<Coach>;
  getById(organizationId: string, coachId: string): Promise<Coach | null>;
  listByOrganization(organizationId: string, options?: ListOptions): Promise<ListResult<Coach>>;
  update(organizationId: string, coachId: string, data: UpdateCoachDto): Promise<Coach>;
  delete(organizationId: string, coachId: string): Promise<void>;
}
