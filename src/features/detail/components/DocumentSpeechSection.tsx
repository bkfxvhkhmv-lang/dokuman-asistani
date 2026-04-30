import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG } from '@/theme';
import type { Dokument } from '@/store';
import { getDocumentSpeechPlainText } from '@/services/tts/documentPlainText';
import { buildCriticalActionsSpeakText } from '@/services/tts/criticalActionsSpeakText';
import { ttsLocaleForAppLang } from '@/services/tts/locales';
import { splitTextIntoSpeechChunks, speakChunksSequentially, stopAllSpeech } from '@/services/tts/speakChunks';
import { useAiLangPreference } from '@/hooks/useAiLangPreference';
import { useLangPreference } from '@/hooks/useLangPreference';
import { speechUi, speechA11yLabel } from '@/i18n/speechUiStrings';

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
  const { aiLang } = useAiLangPreference();

  const [busyKind, setBusyKind] = useState<Kind | null>(null);
  const [playingKind, setPlayingKind] = useState<Kind | null>(null);

  const cancelledRef = useRef(false);

  const fullText = getDocumentSpeechPlainText(dok);
  const hasFull = fullText.length > 0;
  const criticalText = buildCriticalActionsSpeakText(dok, lang) ?? '';
  const hasCritical = criticalText.trim().length > 0;

  const killPlayback = useCallback(async () => {
    cancelledRef.current = true;
    await stopAllSpeech();
    cancelledRef.current = false;
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
          language:
            kind === 'critical'
              ? ttsLocaleForAppLang(lang)
              : ttsLocaleForAppLang(aiLang),
          rate: kind === 'critical' ? 0.95 : 0.9,
          cancelledRef,
        });
      } finally {
        setPlayingKind(null);
        setBusyKind(null);
      }
    },
    [aiLang, busyKind, killPlayback, lang, playingKind],
  );

  if (!hasFull && !hasCritical) return null;

  return (
    <View style={{ marginBottom: prominent ? S.md : 0 }}>
      {prominent ? (
        <View style={{ marginHorizontal: S.md, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.5 }}>
            VORLESEN
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 18 }}>
            Den kompletten Brief anhören — ein Tipp genügt.
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
            <Text style={{ fontSize: prominent ? 22 : 16 }}>🔊</Text>
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
