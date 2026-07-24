import { themeForScheme } from '../index';
import { darkTheme, lightTheme } from '../tokens';

describe('themeForScheme', () => {
  it('returns the light theme for light scheme', () => {
    expect(themeForScheme('light')).toBe(lightTheme);
  });

  it('returns the dark theme for dark scheme', () => {
    expect(themeForScheme('dark')).toBe(darkTheme);
  });

  it('falls back to light when the scheme is unknown', () => {
    expect(themeForScheme(null)).toBe(lightTheme);
    expect(themeForScheme(undefined)).toBe(lightTheme);
  });
});
