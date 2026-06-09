/**
 * Steuerberater Export v2 — mobile downloader
 *
 * Calls GET /steuerpaket?year=YYYY on the OCR backend.
 * Backend returns BriefPilot_Steuerberater_{year}.zip with:
 *   BriefPilot_Ausgaben_{year}.xlsx
 *   Belege/*.pdf
 *   README.txt
 *
 * No CSV. No DATEV.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { OCR_MVP_BASE } from '@/config';

const TIMEOUT_MS = 120_000; // 2 min — large exports with many PDFs

export async function downloadSteuerberaterZip(year: number): Promise<void> {
  const url = `${OCR_MVP_BASE}/steuerpaket?year=${year}`;
  const localPath = `${FileSystem.cacheDirectory ?? ''}steuerberater_${year}.zip`;

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert(
      'Teilen nicht verfügbar',
      'Das Gerät unterstützt das Teilen von Dateien nicht.',
    );
    return;
  }

  let downloadResult: FileSystem.FileSystemDownloadResult;
  try {
    downloadResult = await FileSystem.downloadAsync(url, localPath, {
      headers: { Accept: 'application/zip' },
    } as FileSystem.DownloadOptions);
  } catch (e: any) {
    throw new Error(
      e?.message?.includes('network')
        ? 'Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Internetverbindung.'
        : (e?.message ?? 'Download fehlgeschlagen'),
    );
  }

  if (downloadResult.status === 404) {
    Alert.alert(
      'Keine Steuerbelege',
      `Für ${year} wurden keine steuerrelevanten Belege gefunden.`,
    );
    return;
  }

  if (downloadResult.status !== 200) {
    throw new Error(`Server-Fehler: ${downloadResult.status}`);
  }

  await Sharing.shareAsync(downloadResult.uri, {
    mimeType: 'application/zip',
    UTI: 'public.zip-archive',
    dialogTitle: `BriefPilot_Steuerberater_${year}.zip`,
  });
}
