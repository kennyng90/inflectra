/* A Rejection in the app's voice: the AI's own reason, framed so the user knows
   nothing went wrong and what to try next. */

export const REJECTION_HEADING = "The AI couldn't read this one";

/* Neutral about photo vs screenshot: the Chart can come from either. */
export const REJECTION_TIP = 'Try a picture of a price chart where the numbers are easy to read.';

export const REJECTION_FALLBACK_REASON = "This image doesn't look like a trading chart.";

const SENTENCE_ENDINGS = ['.', '!', '?', '…'];

export function rejectionReason(reason: string | null): string {
  const trimmed = reason?.trim() ?? '';
  if (!trimmed) return REJECTION_FALLBACK_REASON;
  return SENTENCE_ENDINGS.some((ending) => trimmed.endsWith(ending)) ? trimmed : `${trimmed}.`;
}
