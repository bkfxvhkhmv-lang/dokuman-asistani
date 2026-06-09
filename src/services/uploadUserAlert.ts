import { Alert } from 'react-native';
import { getLang } from '@/hooks/useLangPreference';

export async function alertUploadFailedRetry(
  retry: () => void | Promise<void>,
  err: unknown,
): Promise<void> {
  const lang = await getLang();
  const tr = lang === 'tr';
  const msg = err instanceof Error ? err.message : String(err);
  Alert.alert(
    tr ? 'Yükleme başarısız' : 'Upload fehlgeschlagen',
    tr
      ? `Sunucuya yüklenemedi. İnternet bağlantını kontrol et.\n\n${msg}`
      : `Das Dokument konnte nicht hochgeladen werden.\nBitte das Netzwerk prüfen.\n\n${msg}`,
    [
      { text: tr ? 'Kapat' : 'Abbrechen', style: 'cancel' },
      { text: tr ? 'Yeniden dene' : 'Erneut versuchen', onPress: () => void retry() },
    ],
  );
}
