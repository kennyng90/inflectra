import { useColorScheme, type ColorSchemeName } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './tokens';

export { darkTheme, lightTheme, type Theme } from './tokens';

export function themeForScheme(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export function useTheme(): Theme {
  return themeForScheme(useColorScheme());
}
