import { analyzingStage, STAGE_COUNT } from '../analyzing-copy';

describe('analyzingStage', () => {
  it('names the work while the chart is being prepared', () => {
    const stage = analyzingStage('preparing', 0);
    expect(stage.index).toBe(0);
    expect(stage.headline).toBe('Getting your chart ready');
    expect(stage.detail.length).toBeGreaterThan(0);
  });

  it('names the work while the chart uploads', () => {
    expect(analyzingStage('uploading', 4000).index).toBe(1);
  });

  it('starts the read at the first reading stage', () => {
    const stage = analyzingStage('reading', 0);
    expect(stage.index).toBe(2);
    expect(stage.headline).toBe('Reading your chart');
  });

  it('advances the read through later stages as time passes', () => {
    const early = analyzingStage('reading', 5_000);
    const middle = analyzingStage('reading', 20_000);
    const late = analyzingStage('reading', 50_000);

    expect(middle.index).toBeGreaterThan(early.index);
    expect(late.index).toBeGreaterThan(middle.index);
    expect(new Set([early.headline, middle.headline, late.headline]).size).toBe(3);
  });

  it('admits an overrun without inventing a new step', () => {
    const late = analyzingStage('reading', 50_000);
    const overrun = analyzingStage('reading', 120_000);

    expect(overrun.index).toBe(late.index);
    expect(overrun.detail).not.toBe(late.detail);
    expect(overrun.detail).toMatch(/longer than usual/);
  });

  it('never runs past the last stage', () => {
    for (const elapsed of [0, 15_000, 35_000, 70_000, 600_000]) {
      const stage = analyzingStage('reading', elapsed);
      expect(stage.index).toBeLessThan(STAGE_COUNT);
    }
  });

  it('treats a nonsense elapsed time as the start of the read', () => {
    expect(analyzingStage('reading', -1).index).toBe(2);
    expect(analyzingStage('reading', Number.NaN).index).toBe(2);
  });
});
