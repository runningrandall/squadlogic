import { z } from 'zod';

export interface Athlete {
  athleteId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  positions: string[];
  jerseyNumber: string | null;
  status: 'active' | 'inactive' | 'injured' | 'suspended';
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateAthleteSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  phone: z.string().optional(),
  dateOfBirth: z.string().date().optional(),
  positions: z.array(z.string()).default([]),
  jerseyNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateAthleteDto = z.output<typeof CreateAthleteSchema>;

export const UpdateAthleteSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().date().optional(),
  positions: z.array(z.string()).optional(),
  jerseyNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['active', 'inactive', 'injured', 'suspended']).optional(),
});

export type UpdateAthleteDto = z.infer<typeof UpdateAthleteSchema>;
