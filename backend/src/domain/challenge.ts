import { z } from 'zod';

export interface Challenge {
  challengeId: string;
  teamId: string;
  organizationId: string;
  title: string;
  description: string;
  dueDate: string | null;
  routeUrl: string | null;
  status: 'active' | 'completed' | 'archived';
  points: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const CreateChallengeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).default(''),
  dueDate: z.string().nullable().default(null),
  routeUrl: z.string().url().nullable().default(null),
  points: z.number().int().min(0).default(0),
  teamId: z.string().min(1),
});

export type CreateChallengeDto = z.output<typeof CreateChallengeSchema>;

export const UpdateChallengeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().nullable().optional(),
  routeUrl: z.string().url().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  points: z.number().int().min(0).optional(),
});

export type UpdateChallengeDto = z.infer<typeof UpdateChallengeSchema>;
