import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export type PhotoResult = { uri: string } | null;

export type MediaResult = { uri: string; mimeType?: string } | null;

/**
 * Request camera permission and show alert if denied. Returns true if granted.
 */
async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') {
    Alert.alert(
      'Camera access needed',
      'To take photos for updates, please allow camera access in your device settings.',
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
      'To choose photos for updates, please allow photo library access in your device settings.',
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
 */
export async function takePhotoAsync(): Promise<PhotoResult> {
  const granted = await ensureCameraPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri };
}

/**
 * Open photo library to pick an image. Handles permission request and denial.
 * Returns { uri } if user picked a photo, null if cancelled or permission denied.
 */
export async function pickPhotoAsync(): Promise<PhotoResult> {
  const granted = await ensureMediaLibraryPermission();
  if (!granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri };
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
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: (asset as { mimeType?: string }).mimeType,
  };
}

/**
 * Show an action sheet / alert to choose Take Photo, Choose Photo, or Choose Video.
 */
export function showMediaSourceAlert(
  onTakePhoto: () => void,
  onChoosePhoto: () => void,
  onChooseVideo?: () => void
): void {
  const opts = [
    { text: 'Cancel', style: 'cancel' as const },
    { text: 'Take Photo', onPress: onTakePhoto },
    { text: 'Choose from Library', onPress: onChoosePhoto },
  ];
  if (onChooseVideo) {
    opts.push({ text: 'Choose Video', onPress: onChooseVideo });
  }
  Alert.alert('Add media', 'Take a photo or choose from your library.', opts);
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
