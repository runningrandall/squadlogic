import { z } from 'zod';

export interface Group {
  groupId: string;
  teamId: string;
  organizationId: string;
  name: string;
  description: string;
  aliases: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).default(''),
  aliases: z.string().array().default([]),
  teamId: z.string().min(1),
});

export type CreateGroupDto = z.output<typeof CreateGroupSchema>;

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  aliases: z.string().array().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type UpdateGroupDto = z.infer<typeof UpdateGroupSchema>;
