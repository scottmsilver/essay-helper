import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeDate } from './formatDate';

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null/undefined', () => {
    expect(formatRelativeDate(null)).toBe('');
    expect(formatRelativeDate(undefined)).toBe('');
  });

  it('returns relative format for dates within 7 days', () => {
    const date = new Date('2026-01-17T12:00:00Z');
    expect(formatRelativeDate(date)).toContain('ago');
  });

  it('returns absolute format for dates older than 7 days', () => {
    const date = new Date('2026-01-10T12:00:00Z');
    expect(formatRelativeDate(date)).toBe('Jan 10');
  });

  it('includes year for dates older than 365 days', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    expect(formatRelativeDate(date)).toBe('Jun 15, 2024');
  });
});
