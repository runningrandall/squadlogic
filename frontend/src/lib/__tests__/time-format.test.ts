import { describe, it, expect } from 'vitest';
import { formatTime12Hour } from '../time-format';

describe('formatTime12Hour', () => {
  it('formats a morning time', () => {
    expect(formatTime12Hour('07:45')).toBe('7:45 AM');
  });

  it('formats an afternoon time', () => {
    expect(formatTime12Hour('14:30')).toBe('2:30 PM');
  });

  it('formats noon as 12 PM', () => {
    expect(formatTime12Hour('12:00')).toBe('12:00 PM');
  });

  it('formats midnight as 12 AM', () => {
    expect(formatTime12Hour('00:00')).toBe('12:00 AM');
  });

  it('passes through empty string unchanged', () => {
    expect(formatTime12Hour('')).toBe('');
  });

  it('passes through the placeholder dash unchanged', () => {
    expect(formatTime12Hour('—')).toBe('—');
  });
});
