import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamBrandingService } from '../team-branding-service.js';
import type { TeamBrandingRepository } from '../../ports/team-branding-repository.js';
import type { TeamBranding } from '../../domain/team-branding.js';

function createMockRepo(): TeamBrandingRepository {
  return {
    create: vi.fn(),
    getByUser: vi.fn(),
    update: vi.fn(),
  };
}

const sampleBranding: TeamBranding = {
  brandingId: 'b-123',
  userId: 'user-1',
  teamDisplayName: 'Brighton Blazers',
  logoUrl: null,
  primaryColor: '#1E3A5F',
  tertiaryColor: '#FFFFFF',
  createdAt: '2026-07-19T00:00:00Z',
  updatedAt: '2026-07-19T00:00:00Z',
};

describe('TeamBrandingService', () => {
  let repo: TeamBrandingRepository;
  let service: TeamBrandingService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new TeamBrandingService(repo);
  });

  it('TC-077: persists branding and returns on subsequent reads', async () => {
    vi.mocked(repo.getByUser).mockResolvedValue(null);
    vi.mocked(repo.create).mockResolvedValue(sampleBranding);

    const result = await service.createOrUpdateBranding('user-1', {
      teamDisplayName: 'Brighton Blazers',
      primaryColor: '#1E3A5F',
      tertiaryColor: '#FFFFFF',
    });

    expect(result.teamDisplayName).toBe('Brighton Blazers');
    expect(repo.create).toHaveBeenCalled();
  });

  it('updates existing branding instead of creating duplicate', async () => {
    vi.mocked(repo.getByUser).mockResolvedValue(sampleBranding);
    vi.mocked(repo.update).mockResolvedValue({ ...sampleBranding, primaryColor: '#FF0000' });

    const result = await service.createOrUpdateBranding('user-1', {
      teamDisplayName: 'Brighton Blazers',
      primaryColor: '#FF0000',
      tertiaryColor: '#FFFFFF',
    });

    expect(result.primaryColor).toBe('#FF0000');
    expect(repo.update).toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('TC-082: returns default colors when unconfigured', () => {
    const defaults = service.getDefaults();
    expect(defaults.primaryColor).toBe('#333333');
    expect(defaults.tertiaryColor).toBe('#F5F5F5');
    expect(defaults.logoUrl).toBeNull();
  });

  describe('validateLogoFile', () => {
    it('TC-078: accepts 1MB PNG', () => {
      expect(() =>
        service.validateLogoFile('image/png', 1 * 1024 * 1024),
      ).not.toThrow();
    });

    it('TC-079: rejects 3MB logo', () => {
      expect(() =>
        service.validateLogoFile('image/png', 3 * 1024 * 1024),
      ).toThrow('2 MB or smaller');
    });

    it('TC-080: rejects .gif format', () => {
      expect(() =>
        service.validateLogoFile('image/gif', 500000),
      ).toThrow('PNG, JPG, or SVG');
    });

    it('accepts SVG format', () => {
      expect(() =>
        service.validateLogoFile('image/svg+xml', 100000),
      ).not.toThrow();
    });

    it('accepts JPEG format', () => {
      expect(() =>
        service.validateLogoFile('image/jpeg', 500000),
      ).not.toThrow();
    });
  });
});
