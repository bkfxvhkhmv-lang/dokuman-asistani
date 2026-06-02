import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Share, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANG } from '@/i18n/langConfig';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/ThemeContext';
import { explainDocument } from '@/services/v4Api';
import { isOnline } from '@/services/offlineQueue';
import type { Dokument } from '@/store';

const _cacheKey = (docId: string, lang: string) => `@bp_aciklama_${docId}_${lang}`;

import { TTS_LANG_TO_LOCALE } from '@/services/tts/locales';

interface DilItem {
  code: string;
  flag: string;
  name: string;
}

const DILLER: DilItem[] = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'sr', flag: '🇷🇸', name: 'Srpski' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
  { code: 'so', flag: '🇸🇴', name: 'Soomaali' },
  { code: 'ku', flag: '🏳️', name: 'Kurdî' },
];

interface AciklamaResult {
  text?: string | null;
  zusammenfassung?: string | null;
  kurzfassung?: string | null;
  model_used?: string;
}

function explainBody(r: AciklamaResult | null): string {
  if (!r) return '';
  return [r.zusammenfassung, r.kurzfassung, r.text].find(s => typeof s === 'string' && s.trim().length > 0)?.trim() ?? '';
}

/** Ohne Server-Sync: gespeicherte Zusammenfassung oder OCR-Text als Erklärung */
function localExplainPayload(dok: Dokument): AciklamaResult | null {
  const zus = dok.zusammenfassung?.trim();
  if (zus && zus.length > 0) {
    return { zusammenfassung: zus, model_used: 'local/zusammenfassung' };
  }
  const raw = dok.rohText?.trim();
  if (raw && raw.length > 80) {
    return { text: raw.slice(0, 12_000), model_used: 'local/ocr' };
  }
  return null;
}

interface BelgeAciklamaModalProps {
  visible: boolean;
  onClose: () => void;
  dok?: Dokument;
}

export default function BelgeAciklamaModal({ visible, onClose, dok }: BelgeAciklamaModalProps) {
  const { Colors: C, R } = useTheme();
  const { t } = useT();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [seciliDil, setSeciliDil] = useState(DEFAULT_LANG);
  const [aciklama, setAciklama]   = useState<AciklamaResult | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata]           = useState<string | null>(null);
  const [dilSec, setDilSec]       = useState(false);
  const [okuyor, setOkuyor]       = useState(false);

  useEffect(() => {
    if (visible) {
      setAciklama(null);
      setHata(null);
      setDilSec(false);
    } else {
      Speech.stop();
      setOkuyor(false);
    }
  }, [visible]);

  const handleDinle = async () => {
    if (okuyor) {
      await Speech.stop();
      setOkuyor(false);
      return;
    }
    const body = explainBody(aciklama);
    if (!body) return;
    setOkuyor(true);
    Speech.speak(body, {
      language: TTS_LANG_TO_LOCALE[seciliDil] || 'de-DE',
      rate: 0.9,
      onDone: () => setOkuyor(false),
      onError: () => setOkuyor(false),
    });
  };

  const finishWithLocalIfPossible = (): boolean => {
    if (!dok) return false;
    const local = localExplainPayload(dok);
    const body = explainBody(local);
    if (!local || !body) return false;
    setAciklama(local);
    setHata(null);
    return true;
  };

  const handleAcikla = async (dilKodu = seciliDil) => {
    if (!dok?.id) {
      setHata('Kein Dokument geladen. Bitte erneut öffnen.');
      return;
    }
    const serverDocId = (dok.v4DocId && String(dok.v4DocId).trim()) || '';
    const cacheDocId = serverDocId || dok.id;
    setYukleniyor(true);
    setHata(null);
    setAciklama(null);
    try {
      const online = await isOnline();
      if (!online) {
        const cacheKey = _cacheKey(cacheDocId, dilKodu);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setAciklama({ ...JSON.parse(cached), model_used: 'cache/offline' });
          return;
        }
        if (finishWithLocalIfPossible()) return;
        setHata('Kein Internet und keine gespeicherte Erklärung. Mit Verbindung wird die KI-Antwort gecacht.');
        return;
      }
      if (!serverDocId) {
        if (finishWithLocalIfPossible()) return;
        setHata(
          'Dieses Dokument hat noch keine lesbare Kurzfassung. Bitte warten bis der Text erkannt wurde oder einen Scan mit OCR erneut anlegen.',
        );
        return;
      }
      const sonuc = await explainDocument(serverDocId, dilKodu) as unknown as AciklamaResult;
      if (!mountedRef.current) return;
      const body = explainBody(sonuc);
      if (!body) {
        if (finishWithLocalIfPossible()) return;
        setHata('Die KI-Antwort enthielt keinen Text. Bitte erneut versuchen oder ein anderes Dokument wählen.');
        return;
      }
      setAciklama(sonuc);
      await AsyncStorage.setItem(_cacheKey(cacheDocId, dilKodu), JSON.stringify(sonuc));
    } catch (e) {
      if (!mountedRef.current) return;
      const raw = e instanceof Error ? e.message : String(e);
      if (finishWithLocalIfPossible()) return;
      if (raw.includes(' 404') || raw.includes('404:')) {
        setHata('Dokument auf dem Server nicht gefunden. Bitte Synchronisierung prüfen.');
      } else if (raw.includes(' 422') || raw.includes('422:')) {
        setHata(
          'Text für dieses Dokument ist noch nicht bereit (OCR läuft oder fehlgeschlagen). Bitte später erneut versuchen.',
        );
      } else if (raw.includes(' 401') || raw.includes('401:')) {
        setHata('Sitzung abgelaufen. Bitte erneut anmelden.');
      } else if (__DEV__) {
        setHata(`Erklärung fehlgeschlagen (Dev): ${raw}`);
      } else {
        setHata('Erklärung konnte nicht geladen werden. Bitte erneut versuchen.');
      }
    } finally {
      if (mountedRef.current) setYukleniyor(false);
    }
  };

  const handleDilSec = (dil: DilItem) => {
    setSeciliDil(dil.code);
    setDilSec(false);
    handleAcikla(dil.code);
  };

  const handleKopyala = async () => {
    const body = explainBody(aciklama);
    if (body) await Clipboard.setStringAsync(body);
  };

  const handlePaylas = async () => {
    const body = explainBody(aciklama);
    if (body) await Share.share({ message: body });
  };

  const seciliDilObj = DILLER.find(d => d.code === seciliDil) || DILLER[0];

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Schließen"
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: C.bgCard,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
            paddingBottom: 32,
          }}
        >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
          alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 10 }}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{t('modal.understand_doc.title')}</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary }}>{t('modal.understand_doc.sub')}</Text>
          </View>
          <TouchableOpacity onPress={() => setDilSec(!dilSec)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 7,
              backgroundColor: C.bgInput, borderRadius: R.full,
              borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 16 }}>{seciliDilObj.flag}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{seciliDilObj.name}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>▾</Text>
          </TouchableOpacity>
        </View>

        {dilSec && (
          <View style={{ marginHorizontal: 16, marginBottom: 12,
            backgroundColor: C.bgCard, borderRadius: R.lg,
            borderWidth: 1, borderColor: C.border, maxHeight: 240,
            shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DILLER.map(dil => (
                <TouchableOpacity key={dil.code} onPress={() => handleDilSec(dil)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                    borderBottomWidth: 0.5, borderBottomColor: C.borderLight,
                    backgroundColor: seciliDil === dil.code ? C.primaryLight : 'transparent' }}>
                  <Text style={{ fontSize: 18 }}>{dil.flag}</Text>
                  <Text style={{ fontSize: 14,
                    fontWeight: seciliDil === dil.code ? '700' : '400',
                    color: seciliDil === dil.code ? C.primaryDark : C.text }}>{dil.name}</Text>
                  {seciliDil === dil.code && (
                    <Text style={{ marginLeft: 'auto', fontSize: 14, color: C.primary }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {!aciklama && !yukleniyor && !hata && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>
                {t('modal.understand_doc.prompt')}
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                {t('modal.understand_doc.explain_lang', { language: seciliDilObj.name })}{'\n'}
                {t('modal.understand_doc.content_local')}
              </Text>
              <TouchableOpacity onPress={() => handleAcikla()}
                style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: R.full, backgroundColor: C.primary }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {seciliDilObj.flag}  {t('modal.understand_doc.explain_action', { language: seciliDilObj.name })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {yukleniyor && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 16 }}>{t('detail.analysis.recognizing')}</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 6 }}>
                {t('modal.understand_doc.loading_eta')}
              </Text>
            </View>
          )}

          {hata && (
            <View style={{ backgroundColor: C.dangerLight, borderRadius: R.lg,
              padding: 16, borderWidth: 1, borderColor: C.dangerBorder, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: C.dangerText }}>{hata}</Text>
              <TouchableOpacity onPress={() => handleAcikla()} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>{t('common.retry')} →</Text>
              </TouchableOpacity>
            </View>
          )}

          {aciklama && !yukleniyor && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                marginBottom: 14, padding: 8, borderRadius: R.md,
                backgroundColor: (() => {
                  const m = aciklama.model_used ?? '';
                  if (m.startsWith('local/')) return C.warningLight;
                  if (m.startsWith('cache/')) return C.successLight;
                  return C.primaryLight;
                })() }}>
                <Text style={{ fontSize: 12 }}>
                  {(aciklama.model_used ?? '').startsWith('local/') ? '📱'
                    : (aciklama.model_used ?? '').startsWith('cache/') ? '🟢' : '🟣'}
                </Text>
                <Text style={{ fontSize: 11,
                  color: (() => {
                    const m = aciklama.model_used ?? '';
                    if (m.startsWith('local/')) return C.warningText ?? C.warning;
                    if (m.startsWith('cache/')) return C.successText;
                    return C.primaryDark;
                  })(),
                  }}>
                  {(aciklama.model_used ?? '').startsWith('local/')
                    ? t('modal.understand_doc.source_local')
                    : (aciklama.model_used ?? '').startsWith('cache/')
                      ? t('modal.understand_doc.source_cache')
                      : t('modal.understand_doc.source_cloud')}
                </Text>
              </View>

              <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg,
                padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 14, color: C.text, lineHeight: 22,
                  textAlign: seciliDil === 'ar' || seciliDil === 'fa' ? 'right' : 'left' }}>
                  {explainBody(aciklama)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity onPress={handleDinle}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center',
                    backgroundColor: okuyor ? C.warningLight : C.successLight,
                    borderWidth: 1, borderColor: okuyor ? C.warningBorder : C.successBorder }}>
                  <Text style={{ fontSize: 13, fontWeight: '600',
                    color: okuyor ? C.warningText : C.successText }}>
                    {okuyor ? `⏹ ${t('common.close')}` : `🔊 ${t('detail.listen')}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleKopyala}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center',
                    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgInput }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>📋 {t('reply.copy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePaylas}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center', backgroundColor: C.primary }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>⬆ {t('reply.share')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setDilSec(true)}
                style={{ padding: 12, borderRadius: R.lg, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, color: C.textSecondary }}>🌍 {t('modal.understand_doc.choose_other_language')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
