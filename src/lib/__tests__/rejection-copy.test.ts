import { REJECTION_FALLBACK_REASON, rejectionReason } from '../rejection-copy';

describe('rejectionReason', () => {
  it("keeps the AI's reason as it came", () => {
    expect(rejectionReason('This looks like a photo of a cat, not a chart.')).toBe(
      'This looks like a photo of a cat, not a chart.',
    );
  });

  it('keeps other sentence endings alone', () => {
    expect(rejectionReason('Is this a chart?')).toBe('Is this a chart?');
    expect(rejectionReason('The prices are cut off…')).toBe('The prices are cut off…');
  });

  it('finishes a reason the AI left unpunctuated', () => {
    expect(rejectionReason('The picture is too blurry to read the prices')).toBe(
      'The picture is too blurry to read the prices.',
    );
  });

  it('trims stray whitespace', () => {
    expect(rejectionReason('  Too dark to read.\n')).toBe('Too dark to read.');
  });

  it('falls back when the AI gives no reason', () => {
    expect(rejectionReason('')).toBe(REJECTION_FALLBACK_REASON);
    expect(rejectionReason('   ')).toBe(REJECTION_FALLBACK_REASON);
    expect(rejectionReason(null)).toBe(REJECTION_FALLBACK_REASON);
  });
});
