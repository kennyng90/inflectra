import { formatHistoryDate } from '../history-copy';

describe('formatHistoryDate', () => {
  /* Built from local parts: the label follows the user's calendar days, so a
     fixed UTC instant would say something different per timezone. */
  const at = (year: number, month: number, day: number, hour = 9) =>
    new Date(year, month - 1, day, hour).toISOString();
  const now = new Date(2026, 6, 25, 12);

  it('names the last two days instead of dating them', () => {
    expect(formatHistoryDate(at(2026, 7, 25, 1), now)).toBe('Today');
    expect(formatHistoryDate(at(2026, 7, 24, 23), now)).toBe('Yesterday');
  });

  it('drops the year within the current year', () => {
    expect(formatHistoryDate(at(2026, 3, 4), now)).toBe('Mar 4');
  });

  it('keeps the year for older Analyses', () => {
    expect(formatHistoryDate(at(2025, 12, 31), now)).toBe('Dec 31, 2025');
  });
});
