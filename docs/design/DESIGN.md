# Token export

Two generated files, one source of truth (`tokens/*.css` in this design system).
Re-run the generator whenever the Figma tokens change — do not hand-edit these.

## `tokens.css`
Every token flattened into one file with all `var()` aliases resolved to literal
values. No `@import`s. Default `:root` is the light theme; `[data-theme="dark"]`
(or `.dark`) and `[data-mode="mobile"]` carry only the values that differ.

Use it for web, or as the input to a style-dictionary / codegen step.

## `tokens.js` — React Native
React Native cannot read CSS, so the same tokens are emitted as a plain JS module.
Colours are `rgb()`/`rgba()` strings (RN accepts both), and every dimension is a
unitless number — exactly what RN style props expect.

```js
import { lightTheme, darkTheme, mobile } from './tokens';
import { useColorScheme, StyleSheet, Text, View } from 'react-native';

const t = useColorScheme() === 'dark' ? darkTheme : lightTheme;

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.colors.backgroundRaised,
    borderColor: t.colors.borderWeak,
    borderWidth: 1,
    borderRadius: t.radius.r12,
    padding: t.spacing.space16,
    gap: t.spacing.space8,
    ...t.elevation.sm,
  },
  title: { ...t.text.heading3, color: t.colors.textStrong, fontWeight: t.fontWeight.strong },
  body:  { ...t.text.body,     color: t.colors.textWeak },
});
```

Exports: `colors`, `darkColors`, `spacing`, `radius`, `fontSize`, `lineHeight`,
`fontWeight`, `fontFamily`, `duration`, `text` (spreadable text styles),
`elevation` (RN shadow equivalents of the CSS shadow tokens), `mobile` (phone
overrides for the two heading sizes), plus `lightTheme` / `darkTheme`.

### Fonts
Inter is loaded from Google Fonts on web. In React Native, bundle the Inter
`.ttf` files and register them (`expo-font` or `react-native.config.js`) so
`fontFamily: 'Inter'` resolves; `fontWeight` values are strings for RN.
