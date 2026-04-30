import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import type { Dokument } from '@/store';
import type { ModalController } from '@/features/detail/hooks/useModalController';
import {
  anonymisiereText,
  shareDokument,
} from '@/utils';

type OpenNotice = (title: string, message: string) => void;

export function runHandleTeilen(dok: Dokument | undefined, anonModus: boolean): void {
  if (!dok) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  if (anonModus) {
    shareDokument(anonymisiereText(dok) as unknown as Dokument);
  } else {
    shareDokument(dok);
  }
}

export async function runHandleOriginalTeilen(params: {
  dok: Dokument | undefined;
  openNotice: OpenNotice;
}): Promise<void> {
  const { dok, openNotice } = params;
  if (!dok?.v4DocId) {
    openNotice('Nicht verfügbar', 'Noch nicht synchronisiert.');
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    const { shareOriginalFile } = await import('@/services/v4Api');
    await shareOriginalFile(dok.v4DocId, dok.dateiName || `${dok.titel}.pdf`);
  } catch (e: unknown) {
    openNotice('Fehler', (e as Error).message || 'Datei konnte nicht geteilt werden.');
  }
}

export function runHandleGuvenliPaylasim(modal: ModalController): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  modal.open('sicherTeilen');
}

export async function runHandleSicherTeilenMitTTL(params: {
  dok: Dokument | undefined;
  ttl: string;
  modal: ModalController;
  openNotice: OpenNotice;
}): Promise<void> {
  const { dok, ttl, modal, openNotice } = params;
  if (!dok?.v4DocId) {
    openNotice('Nicht verfügbar', 'Dieses Dokument wurde noch nicht mit V4 synchronisiert.');
    return;
  }
  try {
    const { createShareLink } = await import('@/services/v4Api');
    const res = await createShareLink(dok.v4DocId, ttl);
    if (!res?.share_url) throw new Error('Es wurde kein Freigabelink zurückgegeben.');
    await Clipboard.setStringAsync(res.share_url);
    await Share.share({
      message: `${dok.titel}\n\nBriefPilot Sicherer Link:\n${res.share_url}\n\nGültigkeit: ${ttl}`,
      title: dok.titel,
    });
    modal.close();
  } catch (e: unknown) {
    console.error('[SicherTeilen]', e);
    openNotice('Fehler', (e as Error)?.message || 'Link konnte nicht erstellt werden.');
  }
}
