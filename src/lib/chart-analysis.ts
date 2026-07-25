import type { SupabaseClient } from '@supabase/supabase-js';
import { File as FileSystemFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { analysisResultSchema, type AnalysisResult } from '@/lib/analysis-contract';
import { type AnalyzeStep } from '@/lib/analyzing-copy';
import { supabase } from '@/lib/supabase';
import { SERVER_UNCONFIGURED, UserFacingError } from '@/lib/user-facing-error';

/* Longest edge the app uploads: enough detail for the AI to read price levels,
   small enough to keep uploads and analysis fast. */
export const MAX_CHART_EDGE = 2000;

const BUCKET = 'charts';
const CONTENT_TYPE = 'image/jpeg';
const JPEG_QUALITY = 0.8;

export const GENERIC_ANALYZE_ERROR =
  "The analysis didn't go through. Check your connection and try again.";


/* An expected failure whose message is safe to show the user as-is. */
export class AnalyzeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyzeError';
  }
}

export function analyzeErrorMessage(error: unknown): string {
  return error instanceof AnalyzeError ? error.message : GENERIC_ANALYZE_ERROR;
}

/* The user walked away from the run; nothing to report and nothing to fix. */
export class CanceledError extends Error {
  constructor() {
    super('The analysis was canceled.');
    this.name = 'CanceledError';
  }
}

export function isCanceled(error: unknown): boolean {
  return error instanceof CanceledError;
}
export type PickedChart = { uri: string; width: number; height: number };

/* Dimensions to shrink to, or null when the Chart already fits. Only one edge
   is given so the manipulator preserves the aspect ratio. */
export function resizeTarget(
  width: number,
  height: number,
): { width: number } | { height: number } | null {
  const longest = Math.max(width, height);
  if (!Number.isFinite(longest) || longest <= MAX_CHART_EDGE) return null;
  return width >= height ? { width: MAX_CHART_EDGE } : { height: MAX_CHART_EDGE };
}

/* The Edge Function answers failures with { error: { code, message } }, and
   supabase-js hands that response back on the error's `context`. */
export async function serverErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (typeof context?.json !== 'function') return GENERIC_ANALYZE_ERROR;
  const body = (await context.json().catch(() => null)) as {
    error?: { message?: unknown };
  } | null;
  const message = body?.error?.message;
  return typeof message === 'string' && message.length > 0 ? message : GENERIC_ANALYZE_ERROR;
}

/* Always re-encodes to JPEG so HEIC and PNG picks both match the bucket's
   allowed types. */
async function prepareChart(chart: PickedChart): Promise<string> {
  const context = ImageManipulator.manipulate(chart.uri);
  const target = resizeTarget(chart.width, chart.height);
  if (target) context.resize(target);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

async function readChartBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
  return new FileSystemFile(uri).bytes();
}

function chartObjectName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

/* A canceled run leaves no trace: the Chart goes, and so does the History row
   the Edge Function saved after the app stopped listening. */
async function discardRun(client: SupabaseClient, storagePath: string): Promise<void> {
  /* Independently, so one failing half still leaves the other cleaned up. */
  await Promise.allSettled([
    client.storage.from(BUCKET).remove([storagePath]),
    client.from('analyses').delete().eq('storage_path', storagePath),
  ]);
}

export type AnalyzeOptions = {
  /* Aborted when the user cancels the wait. */
  signal?: AbortSignal;
  onStep?: (step: AnalyzeStep) => void;
};

const CANCELED = Symbol('canceled');

/* Resolves once the signal aborts, and never otherwise. One that aborted during
   an earlier step fires no event, so answer it straight away. */
function canceledPromise(signal: AbortSignal): Promise<typeof CANCELED> {
  if (signal.aborted) return Promise.resolve(CANCELED);
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(CANCELED), { once: true });
  });
}

/* Neither the upload nor the Edge Function can be called off, so cancelling
   stops waiting on them rather than stopping them: the caller gets control back
   at once and undoes whatever they leave behind. */
function untilCanceled<T>(
  work: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T | typeof CANCELED> {
  return signal ? Promise.race([work, canceledPromise(signal)]) : work;
}

/* Uploads to the user's private folder, then hands the path to analyze-chart -
   which saves the History row itself on success. */
export async function analyzeChart(
  chart: PickedChart,
  userId: string,
  { signal, onStep }: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const client = supabase;
  if (!client) throw new UserFacingError(SERVER_UNCONFIGURED);

  onStep?.('preparing');
  const preparedUri = await prepareChart(chart);
  const storagePath = `${userId}/${chartObjectName()}`;
  const bytes = await readChartBytes(preparedUri);
  if (signal?.aborted) throw new CanceledError();

  /* Only a saved Analysis earns its Chart a place in storage: a Rejection or a
     failure leaves the upload behind, so drop it. */
  const discardChart = () => client.storage.from(BUCKET).remove([storagePath]);

  onStep?.('uploading');
  const upload = client.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: CONTENT_TYPE });

  if ((await untilCanceled(upload, signal)) === CANCELED) {
    /* The AI was never asked, so the Chart is all there is to undo. */
    void upload.then(discardChart).catch(() => undefined);
    throw new CanceledError();
  }

  const { error: uploadError } = await upload;
  if (uploadError) {
    throw new AnalyzeError("We couldn't upload your chart. Check your connection and try again.");
  }

  onStep?.('reading');
  const pending = client.functions.invoke('analyze-chart', {
    body: { storage_path: storagePath },
  });

  if ((await untilCanceled(pending, signal)) === CANCELED) {
    /* The Edge Function runs to the end whatever the app does, and saves the
       Analysis on the way, so let it finish and then undo it. */
    void pending
      .then(
        () => discardRun(client, storagePath),
        /* It failed anyway, so there is no Analysis to undo. */
        () => discardChart(),
      )
      .catch(() => undefined);
    throw new CanceledError();
  }

  const { data, error } = await pending;
  if (error) {
    const message = await serverErrorMessage(error);
    await discardChart();
    throw new UserFacingError(message);
  }

  const parsed = analysisResultSchema.safeParse(data);
  if (!parsed.success) {
    await discardChart();
    throw new UserFacingError("The AI's answer came back garbled. Try again.");
  }
  if (!parsed.data.is_chart) await discardChart();
  return parsed.data;
}
