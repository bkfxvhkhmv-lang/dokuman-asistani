import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ScannedAsset } from './types';
import { MAX_MULTI_UPLOAD_FILES } from './uploadConstants';

export function mapPickerAssetsToScannedAssets(assets: DocumentPickerAsset[]): ScannedAsset[] {
  return assets.slice(0, MAX_MULTI_UPLOAD_FILES).map((asset) => {
    const mime = asset.mimeType ?? 'application/pdf';
    return {
      uri: asset.uri,
      name: asset.name ?? 'document',
      mimeType: mime,
      source: 'file',
      displayName: mime === 'application/pdf' ? (asset.name ?? 'Dokument') : 'Bild ausgewählt',
    };
  });
}
