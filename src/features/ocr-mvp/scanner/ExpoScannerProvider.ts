import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { ScannedAsset, ScannerProvider } from './types';

export const ExpoScannerProvider: ScannerProvider = {
  async pickFile(): Promise<ScannedAsset | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || res.assets.length === 0) return null;
    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'application/pdf';
    return {
      uri: asset.uri,
      name: asset.name ?? 'document',
      mimeType: mime,
      source: 'file',
      displayName: mime === 'application/pdf' ? (asset.name ?? 'Dokument') : 'Bild ausgewählt',
    };
  },

  async takePhoto(): Promise<ScannedAsset | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });
    if (res.canceled || res.assets.length === 0) return null;
    const asset = res.assets[0];
    return {
      uri: asset.uri,
      name: `photo_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      source: 'camera',
      displayName: 'Foto aufgenommen',
    };
  },

  async scanDocument(): Promise<ScannedAsset[]> {
    const asset = await this.takePhoto();
    return asset ? [asset] : [];
  },
};
