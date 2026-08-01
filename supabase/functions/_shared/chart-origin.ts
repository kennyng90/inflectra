/* Where a Chart came from, shared by the Edge Function and the app (via
   src/lib/chart-origin.ts). Absent means the user supplied the Chart. */
import { z } from 'zod';

/* The range asked for picks the granularity, so the range is the resolution. */
export const TIME_RESOLUTIONS = ['two_days', 'thirty_days'] as const;

/* The Instrument list is decided at runtime from what Firi sells, so an
   Instrument is a label written on a row, not a set the server can close over. */
export const MAX_INSTRUMENT_LENGTH = 32;

export const timeResolutionSchema = z.enum(TIME_RESOLUTIONS);
export const instrumentSchema = z.string().trim().min(1).max(MAX_INSTRUMENT_LENGTH);

export type TimeResolution = (typeof TIME_RESOLUTIONS)[number];
export type ChartOrigin = {
  instrument: string;
  time_resolution: TimeResolution;
};
