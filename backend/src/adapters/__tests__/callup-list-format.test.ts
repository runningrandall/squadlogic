import { describe, it, expect } from 'vitest';
import { detectCallUpListFormat } from '../callup-list-format.js';

describe('detectCallUpListFormat', () => {
  it('detects a PDF from its magic bytes', () => {
    expect(detectCallUpListFormat(Buffer.from('%PDF-1.7\n...'))).toBe('pdf');
  });

  it('detects an xlsx (ZIP/OOXML container) from its magic bytes', () => {
    expect(detectCallUpListFormat(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe('xlsx');
  });

  it('returns null for an unrecognized format', () => {
    expect(detectCallUpListFormat(Buffer.from('not a real file'))).toBeNull();
  });

  it('returns null for a buffer too short to contain a signature', () => {
    expect(detectCallUpListFormat(Buffer.from([0x50]))).toBeNull();
    expect(detectCallUpListFormat(Buffer.alloc(0))).toBeNull();
  });
});
