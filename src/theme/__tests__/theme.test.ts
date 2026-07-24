import { lightTheme, darkTheme } from '../tokens';

describe('design tokens', () => {
  it('every text style uses the Inter family', () => {
    for (const [name, style] of Object.entries(lightTheme.text)) {
      expect({ name, fontFamily: style.fontFamily }).toEqual({ name, fontFamily: 'Inter' });
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it('applies the mobile overrides for the large text styles', () => {
    expect(lightTheme.text.display.fontSize).toBe(40);
    expect(lightTheme.text.heading1.fontSize).toBe(36);
    expect(lightTheme.text.heading2.fontSize).toBe(28);
    expect(lightTheme.text.display.lineHeight).toBe(48);
    expect(lightTheme.text.heading1.lineHeight).toBe(44);
    expect(lightTheme.text.heading2.lineHeight).toBe(36);
  });

  it('dark theme overrides colors but keeps scale tokens', () => {
    expect(lightTheme.colors.backgroundBase).toBe('rgb(255,255,255)');
    expect(darkTheme.colors.backgroundBase).toBe('rgb(18,19,26)');
    expect(darkTheme.colors.textStrong).toBe('rgb(255,255,255)');
    expect(darkTheme.spacing).toEqual(lightTheme.spacing);
    expect(darkTheme.radius).toEqual(lightTheme.radius);
    expect(darkTheme.text).toEqual(lightTheme.text);
  });

  it('exposes the scales screens depend on', () => {
    expect(lightTheme.spacing.space16).toBe(16);
    expect(lightTheme.radius.r12).toBe(12);
    expect(lightTheme.fontWeight.strong).toBe('600');
    expect(lightTheme.elevation.sm.shadowOpacity).toBeGreaterThan(0);
  });
});
