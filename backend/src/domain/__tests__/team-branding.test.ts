import { describe, it, expect } from 'vitest';
import { CreateBrandingSchema } from '../team-branding.js';

describe('CreateBrandingSchema', () => {
  it('accepts valid branding with hex colors', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: 'Brighton Blazers',
      primaryColor: '#1E3A5F',
      tertiaryColor: '#FFFFFF',
    });
    expect(result.success).toBe(true);
  });

  it('TC-081: rejects invalid hex color "#ZZZ"', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: 'Test',
      primaryColor: '#ZZZ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects hex color without # prefix', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: 'Test',
      primaryColor: '1E3A5F',
    });
    expect(result.success).toBe(false);
  });

  it('rejects 3-digit hex shorthand', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: 'Test',
      primaryColor: '#FFF',
    });
    expect(result.success).toBe(false);
  });

  it('applies default colors when not provided', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: 'Test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primaryColor).toBe('#333333');
      expect(result.data.tertiaryColor).toBe('#F5F5F5');
    }
  });

  it('rejects empty team display name', () => {
    const result = CreateBrandingSchema.safeParse({
      teamDisplayName: '',
      primaryColor: '#000000',
    });
    expect(result.success).toBe(false);
  });
});
