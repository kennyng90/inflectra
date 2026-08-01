import {
  INSTRUMENT_LIST_LOADING,
  INSTRUMENT_LIST_RETRY,
  INSTRUMENT_LIST_UNAVAILABLE,
  PICK_INSTRUMENT_DISMISS,
  PICK_INSTRUMENT_TITLE,
  STABLE_INSTRUMENT_NOTE,
} from '../instrument-copy';

const EVERY_STRING = [
  PICK_INSTRUMENT_TITLE,
  PICK_INSTRUMENT_DISMISS,
  INSTRUMENT_LIST_LOADING,
  INSTRUMENT_LIST_UNAVAILABLE,
  INSTRUMENT_LIST_RETRY,
  STABLE_INSTRUMENT_NOTE,
];

describe('the words the app uses about Instruments', () => {
  it('names none of the things an Instrument is not', () => {
    for (const copy of EVERY_STRING) {
      expect(copy).not.toMatch(/ticker|asset|stablecoin|crypto|pair\b/i);
    }
  });

  it('offers a way on when the list cannot be loaded', () => {
    expect(INSTRUMENT_LIST_UNAVAILABLE).toMatch(/try again/i);
    /* The button says what the message told the user to do. */
    expect(INSTRUMENT_LIST_UNAVAILABLE.toLowerCase()).toContain(
      INSTRUMENT_LIST_RETRY.toLowerCase(),
    );
    /* The list is ours to load, so nothing here reads as the user's mistake. */
    expect(INSTRUMENT_LIST_UNAVAILABLE).not.toMatch(/you (picked|chose)|your chart/i);
  });

  it('says why a steady price cannot be analyzed rather than hiding it', () => {
    expect(STABLE_INSTRUMENT_NOTE).toMatch(/price/i);
    expect(STABLE_INSTRUMENT_NOTE).toMatch(/read|shape/i);
  });
});
