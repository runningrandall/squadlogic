import type { CreateBrandingDto, TeamBranding, UpdateBrandingDto } from '../domain/team-branding.js';

export interface TeamBrandingRepository {
  create(branding: CreateBrandingDto & { brandingId: string; userId: string }): Promise<TeamBranding>;
  getByUser(userId: string): Promise<TeamBranding | null>;
  update(userId: string, brandingId: string, data: UpdateBrandingDto & { logoUrl?: string | null }): Promise<TeamBranding>;
}
