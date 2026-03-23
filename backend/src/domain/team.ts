import { z } from 'zod';

export interface Team {
  teamId: string;
  organizationId: string;
  name: string;
  sport: string;
  season: string;
  status: 'active' | 'inactive' | 'archived';
  description: string;
  maxRosterSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(255),
  sport: z.string().min(1).max(100),
  season: z.string().min(1).max(100),
  description: z.string().max(1000).default(''),
  maxRosterSize: z.number().int().positive().nullable().default(null),
});

export type CreateTeamDto = z.output<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sport: z.string().min(1).max(100).optional(),
  season: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  maxRosterSize: z.number().int().positive().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export type UpdateTeamDto = z.infer<typeof UpdateTeamSchema>;
