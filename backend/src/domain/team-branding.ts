import { z } from 'zod';

export interface TeamBranding {
  brandingId: string;
  userId: string;
  teamDisplayName: string;
  logoUrl: string | null;
  primaryColor: string;
  tertiaryColor: string;
  createdAt: string;
  updatedAt: string;
}

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const CreateBrandingSchema = z.object({
  teamDisplayName: z.string().min(1).max(255),
  primaryColor: z
    .string()
    .regex(hexColorRegex, 'Must be a valid 6-digit hex color (e.g., #1E3A5F)')
    .default('#333333'),
  tertiaryColor: z
    .string()
    .regex(hexColorRegex, 'Must be a valid 6-digit hex color (e.g., #FFFFFF)')
    .default('#F5F5F5'),
});

export type CreateBrandingDto = z.output<typeof CreateBrandingSchema>;

export const UpdateBrandingSchema = z.object({
  teamDisplayName: z.string().min(1).max(255).optional(),
  primaryColor: z
    .string()
    .regex(hexColorRegex, 'Must be a valid 6-digit hex color (e.g., #1E3A5F)')
    .optional(),
  tertiaryColor: z
    .string()
    .regex(hexColorRegex, 'Must be a valid 6-digit hex color (e.g., #FFFFFF)')
    .optional(),
});

export type UpdateBrandingDto = z.infer<typeof UpdateBrandingSchema>;

export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
