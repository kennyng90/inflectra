import Anthropic from '@anthropic-ai/sdk';
import { withSupabase } from '@supabase/server';
import { encodeBase64 } from '@std/encoding/base64';
import {
  analysisResultJsonSchema,
  analysisResultSchema,
  type AnalysisResult,
} from '../_shared/analysis-contract.ts';
import {
  instrumentSchema,
  timeResolutionSchema,
  type ChartOrigin,
} from '../_shared/chart-origin.ts';
import type { Database } from '../_shared/database.types.ts';
import { SYSTEM_PROMPT, USER_INSTRUCTION } from './prompt.ts';

const BUCKET = 'charts';
const MODEL = 'claude-opus-5';
/* Thinking is on by default on claude-opus-5 and shares this budget with the
   answer, so leave room for both. */
const MAX_TOKENS = 16000;

/* Matches the bucket's allowed_mime_types. Extensions are the fallback for
   objects stored without a content type. */
const MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

type ErrorCode =
  | 'invalid_request'
  | 'chart_not_found'
  | 'ai_unavailable'
  | 'ai_invalid_response'
  | 'save_failed';

function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function mediaTypeOf(contentType: string, path: string) {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  return MEDIA_TYPES[contentType.split(';')[0].trim().toLowerCase()] ?? MEDIA_TYPES[extension];
}

/* An origin is a pair, so half of one is refused rather than written: an
   Instrument without a Time resolution says nothing about what the Chart
   covers. Neither is an origin at all - the user supplied the Chart. */
function readOrigin(body: {
  instrument?: unknown;
  time_resolution?: unknown;
}): { origin: ChartOrigin | null } | { message: string } {
  if (body.instrument == null && body.time_resolution == null) return { origin: null };

  const instrument = instrumentSchema.safeParse(body.instrument);
  if (!instrument.success) {
    return { message: "We couldn't tell which instrument this chart is for. Try again." };
  }

  const timeResolution = timeResolutionSchema.safeParse(body.time_resolution);
  if (!timeResolution.success) {
    return { message: "We couldn't tell what time range this chart covers. Try again." };
  }

  return { origin: { instrument: instrument.data, time_resolution: timeResolution.data } };
}

export default {
  fetch: withSupabase<Database>({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims?.id;
    if (!userId) return errorResponse('invalid_request', 'Sign in and try again.', 401);

    const body = await req.json().catch(() => null);
    const storagePath = typeof body?.storage_path === 'string' ? body.storage_path.trim() : '';
    if (!storagePath) {
      return errorResponse('invalid_request', 'Pick a chart image to analyze.', 400);
    }

    const parsedOrigin = readOrigin(body);
    if ('message' in parsedOrigin) {
      return errorResponse('invalid_request', parsedOrigin.message, 400);
    }

    /* RLS-scoped client: a path outside the caller's folder reads as missing. */
    const { data: chart } = await ctx.supabase.storage.from(BUCKET).download(storagePath);
    if (!chart) {
      return errorResponse(
        'chart_not_found',
        "We couldn't open that chart. Pick it again and retry.",
        404,
      );
    }

    const mediaType = mediaTypeOf(chart.type, storagePath);
    if (!mediaType) {
      return errorResponse(
        'invalid_request',
        'That file type is not supported. Use a JPEG, PNG or WebP.',
        400,
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return errorResponse('ai_unavailable', 'The AI is not set up yet. Try again later.', 500);
    }

    let message: Anthropic.Message;
    try {
      const anthropic = new Anthropic({
        apiKey,
        /* Resolved per call so tests can fake the network at the fetch boundary. */
        fetch: (input, init) => globalThis.fetch(input, init),
      });
      message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: analysisResultJsonSchema },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: encodeBase64(await chart.arrayBuffer()),
                },
              },
              { type: 'text', text: USER_INSTRUCTION },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('analyze-chart: Anthropic call failed', error);
      return errorResponse('ai_unavailable', "The AI didn't answer. Try again in a moment.", 502);
    }

    if (message.stop_reason === 'refusal') {
      console.error('analyze-chart: the AI declined the request', message.stop_details);
      return errorResponse('ai_unavailable', "The AI wouldn't read that chart. Try another.", 502);
    }
    if (message.stop_reason === 'max_tokens') {
      console.error('analyze-chart: the AI answer was cut off');
      return errorResponse('ai_invalid_response', 'The answer got cut off. Try again.', 502);
    }

    const text = message.content.find((block) => block.type === 'text');
    let result: AnalysisResult;
    try {
      result = analysisResultSchema.parse(JSON.parse(text?.type === 'text' ? text.text : ''));
    } catch (error) {
      console.error('analyze-chart: AI response did not match the contract', error);
      return errorResponse(
        'ai_invalid_response',
        "The AI's answer came back garbled. Try again.",
        502,
      );
    }

    /* A Rejection is not an Analysis: nothing is saved to History. */
    if (!result.is_chart) return Response.json(result);

    const { error: insertError } = await ctx.supabase.from('analyses').insert({
      user_id: userId,
      storage_path: storagePath,
      asset_guess: result.asset_guess,
      analysis: result,
      instrument: parsedOrigin.origin?.instrument ?? null,
      time_resolution: parsedOrigin.origin?.time_resolution ?? null,
    });
    if (insertError) {
      console.error('analyze-chart: saving the Analysis failed', insertError);
      return errorResponse(
        'save_failed',
        "We couldn't save this analysis. Try again in a moment.",
        500,
      );
    }

    return Response.json(result);
  }),
};
