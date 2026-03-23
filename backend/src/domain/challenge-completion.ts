import { z } from 'zod';

export interface ChallengeCompletion {
  completionId: string;
  challengeId: string;
  groupId: string;
  teamId: string;
  organizationId: string;
  completedBy: string;
  completedAt: string;
  notes: string;
  status: 'pending' | 'completed' | 'verified';
  createdAt: string;
  updatedAt: string;
}

export const CreateChallengeCompletionSchema = z.object({
  groupId: z.string().min(1),
  notes: z.string().max(1000).default(''),
  status: z.enum(['pending', 'completed', 'verified']).default('completed'),
});

export type CreateChallengeCompletionDto = z.output<typeof CreateChallengeCompletionSchema>;

export const UpdateChallengeCompletionSchema = z.object({
  notes: z.string().max(1000).optional(),
  status: z.enum(['pending', 'completed', 'verified']).optional(),
});

export type UpdateChallengeCompletionDto = z.infer<typeof UpdateChallengeCompletionSchema>;
