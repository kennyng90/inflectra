export const HISTORY_LOAD_ERROR =
  "We couldn't load your history. Check your connection and try again.";

export const HISTORY_ENTRY_LOAD_ERROR =
  "We couldn't open this analysis. Check your connection and try again.";

export const HISTORY_ENTRY_MISSING = "It was deleted, so there's nothing left to show.";

export const HISTORY_ENTRY_UNREADABLE =
  "It was saved by an older version of the app, so we can't show it anymore.";

export const HISTORY_DELETE_ERROR =
  "We couldn't delete this analysis. Check your connection and try again.";

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function daysApart(from: Date, to: Date): number {
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOf(to).getTime() - startOf(from).getTime()) / millisecondsPerDay);
}

export function formatHistoryDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = daysApart(date, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.getFullYear() === now.getFullYear() ? monthDay.format(date) : monthDayYear.format(date);
}
