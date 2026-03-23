import { z } from 'zod';

export interface GroupMember {
  groupMemberId: string;
  groupId: string;
  teamId: string;
  organizationId: string;
  athleteId: string;
  role: 'member' | 'leader';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export const AddGroupMemberSchema = z.object({
  athleteId: z.string().min(1),
  role: z.enum(['member', 'leader']).default('member'),
});

export type AddGroupMemberDto = z.output<typeof AddGroupMemberSchema>;

export const UpdateGroupMemberSchema = z.object({
  role: z.enum(['member', 'leader']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type UpdateGroupMemberDto = z.infer<typeof UpdateGroupMemberSchema>;
