import { mapPickerAssetsToScannedAssets } from '@/features/ocr-mvp/scanner/mapPickerAssets';
import { MAX_MULTI_UPLOAD_FILES } from '@/features/ocr-mvp/scanner/uploadConstants';

function makeAsset(index: number) {
  return {
    uri: `file:///doc-${index}.pdf`,
    name: `invoice-${index}.pdf`,
    mimeType: 'application/pdf',
    lastModified: 0,
  };
}

describe('mapPickerAssetsToScannedAssets', () => {
  it('maps each asset to a ScannedAsset with file source', () => {
    const mapped = mapPickerAssetsToScannedAssets([makeAsset(1)]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      uri: 'file:///doc-1.pdf',
      name: 'invoice-1.pdf',
      mimeType: 'application/pdf',
      source: 'file',
      displayName: 'invoice-1.pdf',
    });
  });

  it('caps the returned array at MAX_MULTI_UPLOAD_FILES', () => {
    const assets = Array.from({ length: 8 }, (_, i) => makeAsset(i));
    const mapped = mapPickerAssetsToScannedAssets(assets);
    expect(mapped).toHaveLength(MAX_MULTI_UPLOAD_FILES);
    expect(mapped[0].name).toBe('invoice-0.pdf');
    expect(mapped[MAX_MULTI_UPLOAD_FILES - 1].name).toBe(`invoice-${MAX_MULTI_UPLOAD_FILES - 1}.pdf`);
  });

  it('uses Bild ausgewählt display name for images', () => {
    const mapped = mapPickerAssetsToScannedAssets([
      { uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg', lastModified: 0 },
    ]);
    expect(mapped[0].displayName).toBe('Bild ausgewählt');
  });
});
