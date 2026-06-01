import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG } from '@/theme';
import type { Dokument } from '@/store';
import { getDocumentSpeechPlainText } from '@/services/tts/documentPlainText';
import { buildCriticalActionsSpeakText } from '@/services/tts/criticalActionsSpeakText';
import { inferSpeechLocaleFromText, ttsLocaleForAppLang, ttsLocaleForDetectedLanguage } from '@/services/tts/locales';
import { splitTextIntoSpeechChunks, speakChunksSequentially, stopAllSpeech } from '@/services/tts/speakChunks';
import { useLangPreference } from '@/hooks/useLangPreference';
import { speechUi, speechA11yLabel } from '@/i18n/speechUiStrings';
import { useT } from '@/hooks/useT';

interface Props {
  dok: Dokument;
  /** Detail „Einfacher Modus“: gut sichtbare Vorlese-Leiste */
  prominent?: boolean;
}

type Kind = 'full' | 'critical';

/** Özet sekmesi: OCR tam metin + kritik noktaları TTS; tekrar dokunuş durdurur */
export default function DocumentSpeechSection({ dok, prominent = false }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const { lang } = useLangPreference();
  const { t: T } = useT();

  const [busyKind, setBusyKind] = useState<Kind | null>(null);
  const [playingKind, setPlayingKind] = useState<Kind | null>(null);

  const cancelledRef = useRef(false);
  const interruptRef = useRef<(() => void) | null>(null);

  const fullText = getDocumentSpeechPlainText(dok);
  const hasFull = fullText.length > 0;
  const criticalText = buildCriticalActionsSpeakText(dok, lang) ?? '';
  const hasCritical = criticalText.trim().length > 0;
  const appLocale = ttsLocaleForAppLang(lang);
  const deviceAwareFallback = ttsLocaleForAppLang(lang, 'en-US');
  const detectedLocale = ttsLocaleForDetectedLanguage(dok.detectedLanguage, '');
  const fullTextLocale = detectedLocale || inferSpeechLocaleFromText(fullText, deviceAwareFallback);
  const criticalLocale = inferSpeechLocaleFromText(criticalText, appLocale);

  const killPlayback = useCallback(async () => {
    cancelledRef.current = true;
    interruptRef.current?.();   // mevcut chunk promise'ini anında resolve et
    interruptRef.current = null;
    await stopAllSpeech();
    setPlayingKind(null);
    setBusyKind(null);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      void stopAllSpeech();
    };
  }, []);

  const toggle = useCallback(
    async (kind: Kind, source: string) => {
      if (!source.trim()) return;

      if (playingKind === kind || busyKind === kind) {
        await killPlayback();
        return;
      }

      if (playingKind || busyKind) await killPlayback();

      const chunks = splitTextIntoSpeechChunks(source);
      if (chunks.length === 0) return;

      cancelledRef.current = false;
      setBusyKind(kind);

      try {
        setBusyKind(null);
        setPlayingKind(kind);
        await speakChunksSequentially(chunks, {
          language: kind === 'critical' ? criticalLocale : fullTextLocale,
          rate: kind === 'critical' ? 0.95 : 0.9,
          cancelledRef,
          interruptRef,
        });
      } finally {
        setPlayingKind(null);
        setBusyKind(null);
      }
    },
    [busyKind, criticalLocale, fullTextLocale, killPlayback, playingKind],
  );

  if (!hasFull && !hasCritical) return null;

  return (
    <View style={{ marginBottom: prominent ? S.md : 0 }}>
      {prominent ? (
        <View style={{ marginHorizontal: S.md, marginTop: 2, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary }}>
            {T('detail.speech.title')}
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 18 }}>
            {T('detail.speech.body')}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          marginHorizontal: S.md,
          marginBottom: S.sm,
          borderRadius: R.md,
          paddingHorizontal: S.md,
          paddingBottom: hasFull && hasCritical ? 0 : S.sm,
          paddingTop: prominent ? S.sm : 0,
          backgroundColor: C.bgCard,
          borderWidth: prominent ? 1.5 : 0.5,
          borderColor: prominent ? `${C.primary}55` : C.border,
          ...Shadow.sm,
        }}
      >
        {hasFull && (
          <TouchableOpacity
            onPress={() => void toggle('full', fullText)}
            disabled={busyKind === 'full'}
            hitSlop={HIT_SLOP_LG}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: (prominent ? S.md : S.sm + 2) as number,
              borderBottomWidth: hasCritical ? 0.5 : 0,
              borderBottomColor: hasCritical ? C.borderLight : undefined,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              playingKind === 'full'
                ? speechA11yLabel(lang, 'stop')
                : speechA11yLabel(lang, 'full')
            }
          >
            <Icon name="speaker-high" size={prominent ? 22 : 16} color={C.primary} />
            {busyKind === 'full' ? <ActivityIndicator size="small" color={C.primary} /> : null}
            <Text style={{ fontSize: prominent ? 15 : 13, fontWeight: '800', color: C.primary }}>
              {playingKind === 'full'
                ? speechUi(lang, 'stop')
                : busyKind === 'full'
                  ? speechUi(lang, 'busy')
                  : speechUi(lang, 'full_listen')}
            </Text>
          </TouchableOpacity>
        )}
        {hasCritical && (
          <TouchableOpacity
            onPress={() => void toggle('critical', criticalText)}
            disabled={busyKind === 'critical'}
            hitSlop={HIT_SLOP_LG}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: S.sm + 2,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              playingKind === 'critical'
                ? speechA11yLabel(lang, 'stop')
                : speechA11yLabel(lang, 'critical')
            }
          >
            <Icon name={playingKind === 'critical' ? 'stop-circle' : 'microphone'} size={16} color={C.primary} />
            {busyKind === 'critical' ? <ActivityIndicator size="small" color={C.primary} /> : null}
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>
              {playingKind === 'critical'
                ? speechUi(lang, 'stop')
                : busyKind === 'critical'
                  ? speechUi(lang, 'busy')
                  : speechUi(lang, 'critical_listen')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
