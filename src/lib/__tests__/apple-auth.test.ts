import { fullNameFrom, isAppleSignInCanceled } from '@/lib/apple-auth';

const emptyName = {
  namePrefix: null,
  givenName: null,
  middleName: null,
  familyName: null,
  nameSuffix: null,
  nickname: null,
};

describe('fullNameFrom', () => {
  it('joins the parts Apple provides', () => {
    expect(fullNameFrom({ ...emptyName, givenName: 'Kenny', familyName: 'Nguyen' })).toBe(
      'Kenny Nguyen',
    );
  });

  it('keeps the middle name in order', () => {
    expect(
      fullNameFrom({ ...emptyName, givenName: 'Ada', middleName: 'King', familyName: 'Lovelace' }),
    ).toBe('Ada King Lovelace');
  });

  it('is null when Apple withholds the name', () => {
    expect(fullNameFrom(null)).toBeNull();
    expect(fullNameFrom(emptyName)).toBeNull();
  });
});

describe('isAppleSignInCanceled', () => {
  it('recognizes the dismissal Apple throws', () => {
    expect(isAppleSignInCanceled({ code: 'ERR_REQUEST_CANCELED' })).toBe(true);
  });

  it('leaves real failures alone', () => {
    expect(isAppleSignInCanceled({ code: 'ERR_REQUEST_FAILED' })).toBe(false);
    expect(isAppleSignInCanceled(new Error('offline'))).toBe(false);
    expect(isAppleSignInCanceled(null)).toBe(false);
  });
});
