import { describe, it, expect } from 'vitest';
import { CallUpListUploadSchema } from '../race-event.js';

describe('CallUpListUploadSchema', () => {
  it('accepts a payload with just fileData', () => {
    const result = CallUpListUploadSchema.safeParse({ fileData: 'base64==' });
    expect(result.success).toBe(true);
  });

  it('accepts optional eventName and eventLocation overrides', () => {
    const result = CallUpListUploadSchema.safeParse({
      fileData: 'base64==',
      eventName: 'UTAH HS MTB 2025 - REGION 5',
      eventLocation: 'Beaver County, UT',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload with no fileData', () => {
    const result = CallUpListUploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an empty fileData string', () => {
    const result = CallUpListUploadSchema.safeParse({ fileData: '' });
    expect(result.success).toBe(false);
  });
});
