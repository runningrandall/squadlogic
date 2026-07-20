import { randomUUID } from 'node:crypto';
import type { CreateBrandingDto, TeamBranding } from '../domain/team-branding.js';
import { ALLOWED_LOGO_TYPES, MAX_LOGO_SIZE_BYTES } from '../domain/team-branding.js';
import { ValidationError } from '../lib/errors.js';
import type { TeamBrandingRepository } from '../ports/team-branding-repository.js';

export class TeamBrandingService {
  constructor(
    private readonly repository: TeamBrandingRepository,
  ) {}

  async getBranding(userId: string): Promise<TeamBranding | null> {
    return this.repository.getByUser(userId);
  }

  async createOrUpdateBranding(
    userId: string,
    dto: CreateBrandingDto,
  ): Promise<TeamBranding> {
    const existing = await this.repository.getByUser(userId);

    if (existing) {
      return this.repository.update(userId, existing.brandingId, {
        teamDisplayName: dto.teamDisplayName,
        primaryColor: dto.primaryColor,
        tertiaryColor: dto.tertiaryColor,
      });
    }

    return this.repository.create({
      ...dto,
      brandingId: randomUUID(),
      userId,
    });
  }

  async updateLogo(
    userId: string,
    logoUrl: string | null,
  ): Promise<TeamBranding> {
    const existing = await this.repository.getByUser(userId);
    if (!existing) {
      throw new ValidationError('Configure branding before uploading a logo.');
    }

    return this.repository.update(userId, existing.brandingId, { logoUrl });
  }

  validateLogoFile(mimeType: string, sizeBytes: number): void {
    if (!ALLOWED_LOGO_TYPES.includes(mimeType)) {
      throw new ValidationError(
        `Logo must be PNG, JPG, or SVG. Received: ${mimeType}`,
      );
    }

    if (sizeBytes > MAX_LOGO_SIZE_BYTES) {
      throw new ValidationError(
        `Logo must be 2 MB or smaller. Received: ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      );
    }
  }

  getDefaults(): Pick<TeamBranding, 'primaryColor' | 'tertiaryColor' | 'logoUrl'> {
    return {
      primaryColor: '#333333',
      tertiaryColor: '#F5F5F5',
      logoUrl: null,
    };
  }
}
