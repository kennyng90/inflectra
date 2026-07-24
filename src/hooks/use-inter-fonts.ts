/* Native: Inter is embedded at build time by the expo-font config plugin
   (see app.json), so the family is available before the first render. */
export function useInterFonts(): boolean {
  return true;
}
