import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { scanWithVisionKit, visionKitAvailable } from '@/modules/scanner/engine/VisionKitScanner';
import { generatePdfFromImages } from '@/core/pdf/js-pdf-generate/generatePdfFromImages';
import type { ScannedAsset, ScannerProvider } from './types';

/**
 * Bake EXIF orientation into pixels so the preview and OCR receive a
 * correctly-oriented image regardless of how the camera saved it.
 * Failsafe: returns original URI on any error.
 */
async function normalizeImageOrientation(uri: string): Promise<string> {
  try {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const result = await manipulateAsync(uri, [], { compress: 0.92, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri; // failsafe — never block the user
  }
}

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
    const normalizedUri = await normalizeImageOrientation(asset.uri);
    return {
      uri: normalizedUri,
      name: `photo_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      source: 'camera',
      displayName: 'Foto aufgenommen',
      previewUri: normalizedUri,
    };
  },

  async pickFromLibrary(): Promise<ScannedAsset | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: false,
      quality: 1,
    });
    if (res.canceled || res.assets.length === 0) return null;
    const asset = res.assets[0];
    const normalizedUri = await normalizeImageOrientation(asset.uri);
    return {
      uri: normalizedUri,
      name: `image_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      source: 'photo-library',
      displayName: 'Bild ausgewählt',
      previewUri: normalizedUri,
    };
  },

  async takePhotoWithScanner(): Promise<ScannedAsset | null> {
    if (!visionKitAvailable) {
      // Android, Expo Go, simulator — plain camera fallback
      return this.takePhoto();
    }
    const result = await scanWithVisionKit();
    if (result.cancelled || result.imageUris.length === 0) return null;

    // Single page: send as JPEG (fast, no PDF overhead)
    if (result.imageUris.length === 1) {
      const normalizedUri = await normalizeImageOrientation(result.imageUris[0]);
      return {
        uri: normalizedUri,
        name: `scan_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        source: 'camera',
        displayName: 'Scan aufgenommen',
        previewUri: normalizedUri,
        pageCount: 1,
      };
    }

    // Multi-page: bundle into PDF via pdf-lib
    const pdf = await generatePdfFromImages(
      result.imageUris.map(uri => ({ uri })),
    );
    if (!pdf) {
      throw new Error(
        'Mehrseitiger Scan konnte nicht vorbereitet werden. ' +
        'Bitte erneut versuchen oder als PDF hochladen.',
      );
    }

    return {
      uri: pdf.uri,
      name: `scan_${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      source: 'scanner',
      displayName: `Scan (${result.pageCount} Seiten)`,
      previewUri: result.imageUris[0],
      pageCount: result.pageCount,
    };
  },

  async scanDocument(): Promise<ScannedAsset[]> {
    const asset = await this.takePhoto();
    return asset ? [asset] : [];
  },
};
