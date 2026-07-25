import * as ImagePicker from 'expo-image-picker';

import {
  CAMERA_BLOCKED,
  CAMERA_ERROR,
  LIBRARY_ERROR,
  chooseChartFromLibrary,
  takeChartPhoto,
} from '../chart-capture';

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const chart = { uri: 'file:///chart.jpg', width: 4032, height: 3024 };
const photo: ImagePicker.ImagePickerResult = { canceled: false, assets: [chart] };
const canceled: ImagePicker.ImagePickerResult = { canceled: true, assets: null };

const permission = (granted: boolean): ImagePicker.CameraPermissionResponse => ({
  granted,
  canAskAgain: !granted,
  expires: 'never',
  status: (granted ? 'granted' : 'denied') as ImagePicker.PermissionStatus,
});

beforeEach(() => {
  jest.clearAllMocks();
  picker.requestCameraPermissionsAsync.mockResolvedValue(permission(true));
});

describe('takeChartPhoto', () => {
  it('returns the photo the user took', async () => {
    picker.launchCameraAsync.mockResolvedValue(photo);

    await expect(takeChartPhoto()).resolves.toEqual({ status: 'picked', chart });
  });

  it('reports a cancel when the user backs out of the camera', async () => {
    picker.launchCameraAsync.mockResolvedValue(canceled);

    await expect(takeChartPhoto()).resolves.toEqual({ status: 'canceled' });
  });

  it('points at Settings when camera access is refused', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(permission(false));

    await expect(takeChartPhoto()).resolves.toEqual({
      status: 'blocked',
      message: CAMERA_BLOCKED,
    });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('reports an error when the camera fails to open', async () => {
    picker.launchCameraAsync.mockRejectedValue(new Error('no camera'));

    await expect(takeChartPhoto()).resolves.toEqual({ status: 'error', message: CAMERA_ERROR });
  });
});

describe('chooseChartFromLibrary', () => {
  it('returns the chart the user chose', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(photo);

    await expect(chooseChartFromLibrary()).resolves.toEqual({ status: 'picked', chart });
  });

  it('reports a cancel when the user picks nothing', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(canceled);

    await expect(chooseChartFromLibrary()).resolves.toEqual({ status: 'canceled' });
  });

  it('reports a cancel when the picker comes back empty-handed', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [] });

    await expect(chooseChartFromLibrary()).resolves.toEqual({ status: 'canceled' });
  });

  it('reports an error when the photo library fails to open', async () => {
    picker.launchImageLibraryAsync.mockRejectedValue(new Error('no photos'));

    await expect(chooseChartFromLibrary()).resolves.toEqual({
      status: 'error',
      message: LIBRARY_ERROR,
    });
  });

  it('never asks for camera access', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(photo);

    await chooseChartFromLibrary();

    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });
});
