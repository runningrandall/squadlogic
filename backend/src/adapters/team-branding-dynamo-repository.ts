import type { CreateBrandingDto, TeamBranding, UpdateBrandingDto } from '../domain/team-branding.js';
import type { TeamBrandingRepository } from '../ports/team-branding-repository.js';
import { TeamBrandingEntity } from '../entities/team-branding.js';

export class TeamBrandingDynamoRepository implements TeamBrandingRepository {
  async create(
    branding: CreateBrandingDto & { brandingId: string; userId: string },
  ): Promise<TeamBranding> {
    const result = await TeamBrandingEntity.create(branding).go();
    return result.data as TeamBranding;
  }

  async getByUser(userId: string): Promise<TeamBranding | null> {
    const result = await TeamBrandingEntity.query
      .byUser({ userId })
      .go();

    if (result.data.length === 0) return null;
    return result.data[0] as TeamBranding;
  }

  async update(
    userId: string,
    brandingId: string,
    data: UpdateBrandingDto & { logoUrl?: string | null },
  ): Promise<TeamBranding> {
    const updateData: Record<string, unknown> = {};
    if (data.teamDisplayName !== undefined) updateData.teamDisplayName = data.teamDisplayName;
    if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
    if (data.tertiaryColor !== undefined) updateData.tertiaryColor = data.tertiaryColor;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;

    const result = await TeamBrandingEntity.patch({ userId, brandingId })
      .set(updateData)
      .go({ response: 'all_new' });

    return result.data as TeamBranding;
  }
}
