import { useEffect, useRef, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { DrawnChartCanvas } from '@/components/drawn-chart-canvas';
import type { CaptureOutcome } from '@/lib/chart-capture';
import {
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  buildDrawnChart,
  type DrawnChart,
  type DrawnChartPick,
} from '@/lib/drawn-chart';
import { DRAWING_FAILED } from '@/lib/drawn-chart-copy';
import { userFacingMessage } from '@/lib/user-facing-error';

/* How wide the Chart is drawn, in points. The capture is taken at the device's
   pixel density, so the image the AI reads is this times that density. */
const CAPTURE_WIDTH = 360;
const CAPTURE_HEIGHT = Math.round((CAPTURE_WIDTH * DRAWING_HEIGHT) / DRAWING_WIDTH);

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/* The third way a Chart arrives, alongside the camera and the photo library. It
   needs a mounted view to capture, so it comes as a pair: the source the screen
   calls, and the off-screen canvas the screen has to render. */
export function useDrawnChartCapture() {
  const [onCanvas, setOnCanvas] = useState<DrawnChart | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<View>(null);
  /* Resolved once the drawing this run asked for is on the canvas. */
  const mountedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current?.();
    mountedRef.current = null;
  }, [onCanvas]);

  const drawChart = async (pick: DrawnChartPick): Promise<CaptureOutcome> => {
    setBusy(true);
    try {
      const chart = await buildDrawnChart(pick);
      await new Promise<void>((resolve) => {
        mountedRef.current = resolve;
        setOnCanvas(chart);
      });
      /* The commit only queues the draw; the capture has to follow the paint. */
      await nextFrame();

      const uri = await captureRef(canvasRef, { format: 'jpg', quality: 1 });
      return {
        status: 'picked',
        chart: {
          uri,
          width: PixelRatio.getPixelSizeForLayoutSize(CAPTURE_WIDTH),
          height: PixelRatio.getPixelSizeForLayoutSize(CAPTURE_HEIGHT),
          origin: chart.origin,
        },
      };
    } catch (error) {
      return { status: 'error', message: userFacingMessage(error, DRAWING_FAILED) };
    } finally {
      setBusy(false);
    }
  };

  /* Kept off-screen rather than hidden: a view with nothing to show has nothing
     to capture. */
  const canvas = (
    <View
      collapsable={false}
      pointerEvents="none"
      ref={canvasRef}
      style={{ position: 'absolute', left: -10_000, top: 0, width: CAPTURE_WIDTH }}>
      {onCanvas && <DrawnChartCanvas chart={onCanvas} width={CAPTURE_WIDTH} />}
    </View>
  );

  return { drawChart, canvas, busy };
}
