import { useEffect, useState } from 'react';

/* Web: the config plugin only embeds fonts in native binaries, so register the
   bundled ttfs as proper @font-face rules (one per weight) instead. */
const faces: [number, string][] = [
  [400, require('@/assets/fonts/Inter-Regular.ttf')],
  [500, require('@/assets/fonts/Inter-Medium.ttf')],
  [600, require('@/assets/fonts/Inter-SemiBold.ttf')],
  [700, require('@/assets/fonts/Inter-Bold.ttf')],
];

export function useInterFonts(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      faces.map(([weight, uri]) => {
        const face = new FontFace('Inter', `url(${uri})`, { weight: String(weight) });
        document.fonts.add(face);
        return face.load();
      }),
    )
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
}
