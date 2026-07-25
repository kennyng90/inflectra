import * as ImagePicker from 'expo-image-picker';

import type { PickedChart } from '@/lib/chart-analysis';

export const CAMERA_ERROR = "We couldn't open the camera. Try again.";
export const LIBRARY_ERROR = "We couldn't open your photos. Try again.";
export const CAMERA_BLOCKED =
  'Camera access is off. Turn it on in Settings to take a photo of a chart.';

export type CaptureOutcome =
  | { status: 'picked'; chart: PickedChart }
  | { status: 'canceled' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };

function toOutcome(result: ImagePicker.ImagePickerResult): CaptureOutcome {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { status: 'canceled' };
  return { status: 'picked', chart: { uri: asset.uri, width: asset.width, height: asset.height } };
}

/* Camera access is asked for on first use, when the reason for it is on
   screen. iOS only ever prompts once, so a refusal points at Settings. */
export async function takeChartPhoto(): Promise<CaptureOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'blocked', message: CAMERA_BLOCKED };
    return toOutcome(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  } catch {
    return { status: 'error', message: CAMERA_ERROR };
  }
}

export async function chooseChartFromLibrary(): Promise<CaptureOutcome> {
  try {
    return toOutcome(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  } catch {
    return { status: 'error', message: LIBRARY_ERROR };
  }
}
