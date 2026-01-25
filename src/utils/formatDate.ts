import { formatDistanceToNow, differenceInDays, format } from 'date-fns';

type DateLike = Date | string | number | null | undefined;

export function formatRelativeDate(value: DateLike): string {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  const diffDays = differenceInDays(new Date(), date);

  if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, diffDays > 365 ? 'MMM d, yyyy' : 'MMM d');
}
