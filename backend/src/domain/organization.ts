import { z } from 'zod';

export interface Organization {
  organizationId: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  ownerUserId: string;
  billingEmail: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerUserId: z.string().min(1),
  billingEmail: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1).max(2),
  zip: z.string().min(5).max(10),
  timezone: z.string().default('America/Chicago'),
  config: z.record(z.unknown()).default({}),
});

export type CreateOrganizationDto = z.output<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  billingEmail: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).max(2).optional(),
  zip: z.string().min(5).max(10).optional(),
  timezone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  config: z.record(z.unknown()).optional(),
});

export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;
