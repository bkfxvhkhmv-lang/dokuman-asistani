import { Alert } from 'react-native';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Shared close/abort flow for camera top bar and Android hardware back. */
export function confirmCameraClose(
  pageCount: number,
  onClose: () => void,
  t: Translate,
): void {
  if (pageCount > 0) {
    Alert.alert(
      t('scan.camera.abort_title'),
      t(pageCount === 1 ? 'scan.camera.abort_body_single' : 'scan.camera.abort_body_multi', { n: pageCount }),
      [
        { text: t('scan.camera.continue'), style: 'cancel' },
        { text: t('common.cancel'), style: 'destructive', onPress: onClose },
      ],
    );
    return;
  }
  onClose();
}
