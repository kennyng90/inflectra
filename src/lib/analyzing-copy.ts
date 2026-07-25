/* What the app says while an analysis runs. The AI reports no progress of its
   own, so the stages are the app's honest account of a 15-60 second wait. */

export type AnalyzeStep = 'preparing' | 'uploading' | 'reading';

/* Where an in-flight run has got to, and when that step began. */
export type AnalyzeProgress = { step: AnalyzeStep; startedAt: number };

export type AnalyzingStage = {
  headline: string;
  detail: string;
  /* Which of STAGE_COUNT dots is lit. */
  index: number;
};

type ReadingStage = AnalyzingStage & { after: number };

const PREPARING: AnalyzingStage = {
  index: 0,
  headline: 'Getting your chart ready',
  detail: 'Shrinking it so the upload stays quick.',
};

const UPLOADING: AnalyzingStage = {
  index: 1,
  headline: 'Sending your chart',
  detail: 'It goes to your private storage. Only you can open it.',
};

/* The last entry shares its dot with the one before it: an overrun is the same
   step taking too long, not a step the user was never told about. */
const READING: ReadingStage[] = [
  {
    after: 0,
    index: 2,
    headline: 'Reading your chart',
    detail: 'Finding the price line, the dates and the numbers.',
  },
  {
    after: 15_000,
    index: 3,
    headline: 'Looking for shapes',
    detail: 'Checking for the patterns traders watch for.',
  },
  {
    after: 35_000,
    index: 4,
    headline: 'Working out the strategy',
    detail: 'Turning what it sees into one clear suggestion.',
  },
  {
    after: 70_000,
    index: 4,
    headline: 'Working out the strategy',
    detail: "This one is taking longer than usual. It's still going.",
  },
];

export const STAGE_COUNT = READING[READING.length - 1].index + 1;

export function analyzingStage(step: AnalyzeStep, elapsedMs: number): AnalyzingStage {
  if (step === 'preparing') return PREPARING;
  if (step === 'uploading') return UPLOADING;

  let current = READING[0];
  for (const stage of READING) {
    if (elapsedMs >= stage.after) current = stage;
  }
  const { headline, detail, index } = current;
  return { headline, detail, index };
}
