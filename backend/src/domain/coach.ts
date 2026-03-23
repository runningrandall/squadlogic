import { z } from 'zod';

export interface Coach {
  coachId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  certifications: string[];
  specialties: string[];
  status: 'active' | 'inactive';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateCoachSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});

export type CreateCoachDto = z.output<typeof CreateCoachSchema>;

export const UpdateCoachSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type UpdateCoachDto = z.infer<typeof UpdateCoachSchema>;
