import type { Essay } from '../models/essay';

/**
 * Serialize an essay to a string for comparison.
 * Used for dirty checking to detect unsaved changes.
 */
export function serializeEssay(essay: Essay): string {
  return JSON.stringify(essay);
}

/**
 * Check if two essays are equal by comparing their serialized form.
 */
export function essayEquals(a: Essay, b: Essay): boolean {
  return serializeEssay(a) === serializeEssay(b);
}
