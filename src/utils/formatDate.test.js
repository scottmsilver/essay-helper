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

  it('returns "Just now" for less than 1 minute ago', () => {
    const date = new Date('2026-01-19T11:59:30Z');
    expect(formatRelativeDate(date)).toBe('Just now');
  });

  it('returns minutes ago for 1-59 minutes', () => {
    const date = new Date('2026-01-19T11:55:00Z');
    expect(formatRelativeDate(date)).toBe('5 min ago');
  });

  it('returns hours ago for 1-23 hours', () => {
    const date = new Date('2026-01-19T09:00:00Z');
    expect(formatRelativeDate(date)).toBe('3 hours ago');
  });

  it('returns "1 hour ago" (singular) for 1 hour', () => {
    const date = new Date('2026-01-19T11:00:00Z');
    expect(formatRelativeDate(date)).toBe('1 hour ago');
  });

  it('returns days ago for 1-6 days', () => {
    const date = new Date('2026-01-17T12:00:00Z');
    expect(formatRelativeDate(date)).toBe('2 days ago');
  });

  it('returns "1 day ago" (singular) for 1 day', () => {
    const date = new Date('2026-01-18T12:00:00Z');
    expect(formatRelativeDate(date)).toBe('1 day ago');
  });
});
