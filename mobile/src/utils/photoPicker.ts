import * as ImagePicker from 'expo-image-picker';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Alert, Linking } from 'react-native';

export type PhotoResult = { uri: string } | null;

export type MediaResult = { uri: string; mimeType?: string } | null;

/** Expo Go cannot load native crop UI; use expo-image-picker editing fallback. */
function useNativeCropPicker(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function normalizePickerPathToUri(path: string): string {
  const p = path.trim();
  if (p.startsWith('file://') || p.startsWith('content://')) return p;
  return `file://${p}`;
}

function assetToMediaResult(asset: ImagePicker.ImagePickerAsset): MediaResult {
  const mimeType =
    asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : asset.type === 'image' ? 'image/jpeg' : undefined);
  return { uri: asset.uri, mimeType };
}

const NATIVE_CROP_OPTIONS = {
  cropping: true,
  freeStyleCropEnabled: true,
  cropperToolbarTitle: 'Crop photo',
  cropperChooseText: 'Use photo',
  cropperCancelText: 'Cancel',
  compressImageQuality: 0.88,
  mediaType: 'photo' as const,
  includeBase64: false,
  forceJpg: true,
};

async function takePhotoWithNativeCrop(): Promise<PhotoResult> {
  const ImageCropPicker = require('react-native-image-crop-picker').default as typeof import('react-native-image-crop-picker');
  try {
    const image = await ImageCropPicker.openCamera(NATIVE_CROP_OPTIONS);
    if (!image?.path) return null;
    return { uri: normalizePickerPathToUri(image.path) };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'E_PICKER_CANCELLED') return null;
    throw e;
  }
}

async function pickPhotoWithNativeCrop(): Promise<PhotoResult> {
  const ImageCropPicker = require('react-native-image-crop-picker').default as typeof import('react-native-image-crop-picker');
  try {
    const image = await ImageCropPicker.openPicker(NATIVE_CROP_OPTIONS);
    if (!image?.path) return null;
    return { uri: normalizePickerPathToUri(image.path) };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'E_PICKER_CANCELLED') return null;
    throw e;
  }
}

/**
 * Request camera permission and show alert if denied. Returns true if granted.
 */
async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') {
    Alert.alert(
      'Camera access needed',
      'To take photos or record videos for updates, please allow camera access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
  return false;
}

/**
 * Request media library permission and show alert if denied. Returns true if granted.
 */
async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') {
    Alert.alert(
      'Photo library access needed',
      'To choose photos or videos for updates, please allow photo library access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
  return false;
}

/**
 * Launch camera to take a photo. Handles permission request and denial.
 * Returns { uri } if user took a photo, null if cancelled or permission denied.
 * On dev/production builds, opens a crop step after capture.
 */
export async function takePhotoAsync(): Promise<PhotoResult> {
  if (useNativeCropPicker()) {
    const granted = await ensureCameraPermission();
    if (!granted) return null;
    try {
      return await takePhotoWithNativeCrop();
    } catch {
      return null;
    }
  }

  const granted = await ensureCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri };
}

/**
 * Record a video with the device camera.
 */
export async function takeVideoAsync(): Promise<MediaResult> {
  const granted = await ensureCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: 60,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return assetToMediaResult(result.assets[0]);
}

/**
 * Open photo library to pick an image. Handles permission request and denial.
 * Returns { uri } if user picked a photo, null if cancelled or permission denied.
 * On dev/production builds, opens a crop step after selection.
 */
export async function pickPhotoAsync(): Promise<PhotoResult> {
  if (useNativeCropPicker()) {
    const granted = await ensureMediaLibraryPermission();
    if (!granted) return null;
    try {
      return await pickPhotoWithNativeCrop();
    } catch {
      return null;
    }
  }

  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri };
}

/**
 * Open media library to pick a video.
 */
export async function pickVideoAsync(): Promise<MediaResult> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return assetToMediaResult(result.assets[0]);
}

/**
 * Open media library to pick a photo or video.
 */
export async function pickMediaAsync(): Promise<MediaResult> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return assetToMediaResult(result.assets[0]);
}

/**
 * Let the teacher choose how to add media: photo or video, camera or library.
 */
export function showMediaSourceAlert(
  onTakePhoto: () => void,
  onRecordVideo: () => void,
  onChoosePhoto: () => void,
  onChooseVideo: () => void
): void {
  Alert.alert('Add media', 'Share a photo or video with parents.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Take photo', onPress: onTakePhoto },
    { text: 'Record video', onPress: onRecordVideo },
    { text: 'Choose photo', onPress: onChoosePhoto },
    { text: 'Choose video', onPress: onChooseVideo },
  ]);
}

/**
 * Show an action sheet / alert to choose Take Photo or Choose from Library.
 * Returns the result of the chosen action, or null if cancelled.
 */
export function showPhotoSourceAlert(
  onTakePhoto: () => void,
  onChooseFromLibrary: () => void
): void {
  Alert.alert('Add Photo', 'Take a new photo or choose from your library.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Take Photo', onPress: onTakePhoto },
    { text: 'Choose from Library', onPress: onChooseFromLibrary },
  ]);
}
