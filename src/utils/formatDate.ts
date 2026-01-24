import type { Timestamp } from 'firebase/firestore';

type TimestampLike = Timestamp | Date | string | number | null | undefined;

export function formatRelativeDate(timestamp: TimestampLike): string {
  if (!timestamp) return '';

  const date =
    timestamp && typeof timestamp === 'object' && 'toDate' in timestamp
      ? timestamp.toDate()
      : new Date(timestamp as string | number | Date);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}
