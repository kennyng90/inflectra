/* Source of truth for the analyze-chart response, shared by the Edge Function
   and the app (via src/lib/analysis-contract.ts). */
import { z } from 'zod';

export const TRENDS = ['bullish', 'bearish', 'sideways'] as const;
export const DIRECTIONS = ['long', 'short', 'hold'] as const;

const confidenceSchema = z.number().min(0).max(1);

export const patternSchema = z.strictObject({
  name: z.string(),
  confidence: confidenceSchema,
});

export const strategySchema = z.strictObject({
  direction: z.enum(DIRECTIONS),
  entry: z.number(),
  stop_loss: z.number(),
  take_profit: z.array(z.number()),
  confidence: confidenceSchema,
  rationale: z.string(),
});

export const analysisSchema = z.strictObject({
  is_chart: z.literal(true),
  asset_guess: z.string(),
  summary: z.string(),
  trend: z.enum(TRENDS),
  patterns: z.array(patternSchema),
  support_levels: z.array(z.number()),
  resistance_levels: z.array(z.number()),
  volatility: z.string(),
  volume_read: z.string(),
  sentiment: z.string(),
  strategy: strategySchema,
});

export const rejectionSchema = z.strictObject({
  is_chart: z.literal(false),
  reason: z.string(),
});

export const analysisResultSchema = z.discriminatedUnion('is_chart', [
  analysisSchema,
  rejectionSchema,
]);

export type Trend = (typeof TRENDS)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type Pattern = z.infer<typeof patternSchema>;
export type Strategy = z.infer<typeof strategySchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Rejection = z.infer<typeof rejectionSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/* Structured outputs supports neither oneOf (what a discriminated union emits)
   nor numeric bounds, so convert each branch and drop what it rejects. */
const UNSUPPORTED_KEYWORDS = ['$schema', 'minimum', 'maximum'];

function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(z.toJSONSchema(schema), (key, value) =>
      UNSUPPORTED_KEYWORDS.includes(key) ? undefined : value,
    ),
  );
}

/* The shape Claude is constrained to, derived from the zod schemas above so
   the two can never drift. */
export const analysisResultJsonSchema = {
  anyOf: [toJsonSchema(analysisSchema), toJsonSchema(rejectionSchema)],
};

export function isRejection(result: AnalysisResult): result is Rejection {
  return result.is_chart === false;
}
