/* What the app says about the things it can draw a Chart of. Which ones exist
   is Firi's answer (see `instruments.ts`); this is how they are spoken about. */

export const PICK_INSTRUMENT_TITLE = 'What should we draw?';
export const PICK_INSTRUMENT_DISMISS = 'Not now';

export const INSTRUMENT_LIST_LOADING = 'Loading what we can draw…';
export const INSTRUMENT_LIST_UNAVAILABLE =
  "We couldn't load what we can draw. Check your connection and try again.";
/* The way on the message above offers. */
export const INSTRUMENT_LIST_RETRY = 'Try again';

/* Shown instead of a way in, because there is nothing to read on a flat line.
   The fact comes off the Instrument, so this never appears on a quiet day. */
export const STABLE_INSTRUMENT_NOTE = "Its price is meant to stay put, so there's no shape to read.";
