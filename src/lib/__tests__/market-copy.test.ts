import { DISCLAIMER } from '../analysis-copy';
import {
  MARKET_PRICE_NOTE,
  MARKET_TITLE,
  PAST_WEEK,
  PRICES_FAILED_TITLE,
  PRICES_LOADING,
  PRICES_RATE_LIMITED,
  PRICES_RETRY,
  PRICES_UNAVAILABLE,
  PRICES_UNREADABLE,
  kronerLabel,
  priceInKroner,
  priceMove,
} from '../market-copy';

const EVERY_STRING = [
  MARKET_TITLE,
  MARKET_PRICE_NOTE,
  PAST_WEEK,
  PRICES_FAILED_TITLE,
  PRICES_LOADING,
  PRICES_UNAVAILABLE,
  PRICES_UNREADABLE,
  PRICES_RATE_LIMITED,
  PRICES_RETRY,
];

describe('the words the Market uses', () => {
  it('names none of the things the Market is not', () => {
    for (const copy of EVERY_STRING) {
      expect(copy).not.toMatch(/watchlist|portfolio|feed|ticker|sparkline|API|rate limit/i);
    }
  });
});

describe('MARKET_PRICE_NOTE', () => {
  it("warns that the prices are the wider market, not the user's exchange", () => {
    expect(MARKET_PRICE_NOTE).toMatch(/wider market/i);
    expect(MARKET_PRICE_NOTE).toMatch(/exchange/i);
  });

  it('says nothing the disclaimer says, so it can never stand in for it', () => {
    expect(MARKET_PRICE_NOTE).not.toMatch(/advice|inflectra/i);
    expect(MARKET_PRICE_NOTE).not.toBe(DISCLAIMER);
  });

  it('names no index, no feed and no ticker', () => {
    expect(MARKET_PRICE_NOTE).not.toMatch(/index|aggregat|order book|spread|oracle/i);
  });
});

describe('the messages a failed price load shows', () => {
  it('offers a way on and never blames the user', () => {
    for (const message of [PRICES_UNAVAILABLE, PRICES_UNREADABLE, PRICES_RATE_LIMITED]) {
      expect(message).toMatch(/try again/i);
      /* The prices are ours to load, so nothing here reads as the user's fault. */
      expect(message).not.toMatch(/you (picked|chose|asked)|your (chart|fault)/i);
    }
    expect(PRICES_UNAVAILABLE.toLowerCase()).toContain(PRICES_RETRY.toLowerCase());
  });

  /* Waiting is the thing to do, and checking a connection is not, so the two
     messages must not tell the user the same thing. */
  it('tells a rate limit apart from a network fault, in what it asks for', () => {
    expect(PRICES_RATE_LIMITED).toMatch(/wait/i);
    expect(PRICES_RATE_LIMITED).not.toMatch(/connection/i);
    expect(PRICES_UNAVAILABLE).toMatch(/connection/i);
    expect(PRICES_RATE_LIMITED).not.toBe(PRICES_UNAVAILABLE);
  });
});

describe('kronerLabel', () => {
  /* One way of writing kroner, wherever an amount is written: beside a price
     here, and once at the top of a drawn Chart's price axis. */
  it('puts the unit after the amount, spaced', () => {
    expect(kronerLabel('1 243 501')).toBe('1 243 501 kr');
  });
});

describe('priceInKroner', () => {
  it('writes kroner the Norwegian way, with the unit after the number', () => {
    expect(priceInKroner(1_243_501)).toBe('1 243 501 kr');
  });

  /* Precision that tells the reader something: a coin worth thousands does not
     need øre, and one worth pennies is nothing but øre. */
  it('goes finer the less one of them costs', () => {
    expect(priceInKroner(41_250.7)).toBe('41 251 kr');
    expect(priceInKroner(10.114)).toBe('10,11 kr');
    expect(priceInKroner(0.0523)).toBe('0,0523 kr');
  });
});

describe('priceMove', () => {
  it('says which way and how far, in an arrow and in words', () => {
    expect(priceMove(2.44)).toEqual({
      label: '↑ 2,4%',
      spoken: 'Rising 2,4% over the past week',
      direction: 'rising',
    });
    expect(priceMove(-3.16)).toEqual({
      label: '↓ 3,2%',
      spoken: 'Falling 3,2% over the past week',
      direction: 'falling',
    });
  });

  /* Rising/Falling/Flat, never bullish or bearish, and never up or down as the
     only cue - the arrow is a second way of saying the word. */
  it('speaks the direction in the three words the app uses', () => {
    for (const percent of [5, -5, 0]) {
      expect(priceMove(percent).spoken).toMatch(/^(Rising|Falling|Flat)/);
      expect(priceMove(percent).spoken).not.toMatch(/bull|bear|gain|loss/i);
    }
  });

  /* A move too small to show is flat, so no card claims a direction beside a
     number that says nothing happened. */
  it('calls a move that rounds to nothing flat, and gives it no arrow', () => {
    const move = priceMove(0.04);

    expect(move.direction).toBe('flat');
    expect(move.label).toBe('0,0%');
    expect(move.spoken).toBe('Flat 0,0% over the past week');
  });

  it('never writes a minus sign, because the arrow already said which way', () => {
    expect(priceMove(-12.5).label).not.toContain('-');
  });
});
