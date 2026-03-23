import { z } from 'zod';

export interface TeamMember {
  teamMemberId: string;
  teamId: string;
  organizationId: string;
  memberId: string;
  memberType: 'athlete' | 'coach';
  role: 'player' | 'captain' | 'head_coach' | 'assistant_coach' | 'manager';
  jerseyNumber: string | null;
  status: 'active' | 'inactive';
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const AddTeamMemberSchema = z.object({
  memberId: z.string().min(1),
  memberType: z.enum(['athlete', 'coach']),
  role: z.enum(['player', 'captain', 'head_coach', 'assistant_coach', 'manager']),
  jerseyNumber: z.string().min(1).nullable().optional().default(null),
});

export type AddTeamMemberDto = z.output<typeof AddTeamMemberSchema>;

export const UpdateTeamMemberSchema = z.object({
  role: z.enum(['player', 'captain', 'head_coach', 'assistant_coach', 'manager']).optional(),
  jerseyNumber: z.string().min(1).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type UpdateTeamMemberDto = z.infer<typeof UpdateTeamMemberSchema>;
