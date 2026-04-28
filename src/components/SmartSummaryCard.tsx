import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { SummaryResult, SummaryMode } from '../services/SmartSummaryService';

// ── TypewriterText ────────────────────────────────────────────────────────────

function TypewriterText({ text, speed = 18, style }: { text: string; speed?: number; style?: any }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef  = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;

    const tick = () => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        timerRef.current = setTimeout(tick, speed);
      }
    };

    timerRef.current = setTimeout(tick, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, speed]);

  return <Text style={style}>{displayed}</Text>;
}

// ── Main component ────────────────────────────────────────────────────────────

interface SmartSummaryCardProps {
  result: SummaryResult | null;
  loading?: boolean;
  onLoadDetailed?: (lang?: string) => void;
  currentMode: SummaryMode;
  onModeChange: (mode: SummaryMode) => void;
}

const MODE_LABEL: Record<SummaryMode, string> = {
  kurz:        '1 Satz',
  mittel:      '3 Punkte',
  detailliert: 'KI-Detail',
};


const QUELLE_LABEL: Record<string, string> = {
  lokal:    'Lokal · Offline',
  ki_cloud: 'KI-Analyse',
  ki_cache: 'KI · Gecacht',
};

export default function SmartSummaryCard({
  result, loading = false, onLoadDetailed, currentMode, onModeChange,
}: SmartSummaryCardProps) {
  const { Colors: C, R } = useTheme();
  const [lang, setLang] = useState('de');

  if (!result && !loading) return null;

  const QUELLE_COLOR: Record<string, string> = {
    lokal:    C.success,
    ki_cloud: C.primaryDark,
    ki_cache: C.primary,
  };
  const sourceColor = result ? QUELLE_COLOR[result.quelle] || C.primary : C.primary;

  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, flex: 1 }}>
          🤖 Zusammenfassung
        </Text>
        {result && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: sourceColor + '18', borderRadius: 999,
            paddingHorizontal: 8, paddingVertical: 3,
            borderWidth: 1, borderColor: sourceColor + '44' }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: sourceColor }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: sourceColor }}>
              {QUELLE_LABEL[result.quelle]}
            </Text>
          </View>
        )}
      </View>

      {/* Mode selector */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {(['kurz', 'mittel', 'detailliert'] as SummaryMode[]).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => {
              onModeChange(m);
              if (m === 'detailliert' && onLoadDetailed) onLoadDetailed(lang);
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: R.md,
              backgroundColor: currentMode === m ? C.primary : C.bgCard,
              borderWidth: 1, borderColor: currentMode === m ? C.primary : C.border }}>
            <Text style={{ fontSize: 11, fontWeight: '700',
              color: currentMode === m ? '#fff' : C.textSecondary }}>
              {MODE_LABEL[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator color={C.primary} />
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 8 }}>
            KI analysiert…
          </Text>
        </View>
      ) : result ? (
        <>
          {currentMode === 'kurz' && (
            <TypewriterText
              text={result.kurzSatz}
              speed={14}
              style={{ fontSize: 14, color: C.text, lineHeight: 22 }}
            />
          )}

          {currentMode === 'mittel' && (
            <View style={{ gap: 6 }}>
              {result.kernPunkte.map((p, i) => (
                <TypewriterText
                  key={i}
                  text={p}
                  speed={10}
                  style={{ fontSize: 13, color: C.text, lineHeight: 20 }}
                />
              ))}
            </View>
          )}

          {currentMode === 'detailliert' && result.detailText && (
            <>
              <TypewriterText
                text={result.detailText}
                speed={8}
                style={{ fontSize: 13, color: C.text, lineHeight: 20 }}
              />
              {result.handlungsempfehlungen.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, marginBottom: 6 }}>
                    EMPFEHLUNGEN
                  </Text>
                  {result.handlungsempfehlungen.map((e, i) => (
                    <Text key={i} style={{ fontSize: 12, color: C.text, marginBottom: 3 }}>{e}</Text>
                  ))}
                </View>
              )}
            </>
          )}

          {currentMode === 'detailliert' && !result.detailText && onLoadDetailed && (
            <TouchableOpacity
              onPress={() => onLoadDetailed(lang)}
              style={{ backgroundColor: C.primary, borderRadius: R.md,
                padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                🤖 KI-Analyse laden
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}

      {/* Processing time */}
      {result && result.verarbeitungMs > 0 && (
        <Text style={{ fontSize: 9, color: C.textTertiary, marginTop: 8, textAlign: 'right' }}>
          {result.verarbeitungMs}ms
        </Text>
      )}
    </View>
  );
}
