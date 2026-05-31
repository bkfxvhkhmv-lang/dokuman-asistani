import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import AiSparkle from '@/components/AiSparkle';
import { useTheme } from '@/ThemeContext';
import type { SummaryResult, SummaryMode } from '@/services/SmartSummaryService';
import { stripLlmLanguageMetaLines } from '@/utils/sanitizeLlmText';

// ── Simple inline markdown renderer (bold only) ───────────────────────────────

function MarkdownText({ text, style }: { text: string; style?: object }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text key={li} style={style}>
            {parts.map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>
                : part,
            )}
          </Text>
        );
      })}
    </View>
  );
}

interface SmartSummaryCardProps {
  result: SummaryResult | null;
  loading?: boolean;
  onLoadDetailed?: () => void;
  currentMode: SummaryMode;
  onModeChange: (mode: SummaryMode) => void;
}

const MODE_LABEL: Record<SummaryMode, string> = {
  kurz:        'Kurz',
  mittel:      'Kurz',
  detailliert: 'Detailliert',
};


const QUELLE_LABEL: Record<string, string> = {
  lokal:    'Offline',
  ki_cloud: 'Cloud-Analyse',
  ki_cache: 'Zwischengespeichert',
};

function normalizeDetailSingularCopy(text: string): string {
  return text.replace(/\bRechnungen\b/g, 'Rechnung');
}

export default function SmartSummaryCard({
  result, loading = false, onLoadDetailed, currentMode, onModeChange,
}: SmartSummaryCardProps) {
  const { Colors: C, R, S } = useTheme();
  if (!result && !loading) return null;

  const QUELLE_COLOR: Record<string, string> = {
    lokal:    C.success,
    ki_cloud: C.primaryDark,
    ki_cache: C.primary,
  };
  const sourceColor = result ? QUELLE_COLOR[result.quelle] || C.primary : C.primary;

  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: S.lg,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>Zusammenfassung</Text>
          <AiSparkle size={10} />
        </View>
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
        {(['mittel', 'detailliert'] as SummaryMode[]).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => {
              onModeChange(m);
              if (m === 'detailliert' && onLoadDetailed) onLoadDetailed();
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: 6, borderRadius: R.md,
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
            Analysiert …
          </Text>
        </View>
      ) : result ? (
        <>
          {(currentMode === 'mittel' || currentMode === 'kurz') && (
            <View style={{ gap: 6 }}>
              {result.kernPunkte.map((p, i) => (
                <Text key={i} style={{ fontSize: 14, lineHeight: 21, color: C.text }}>
                  {normalizeDetailSingularCopy(p.replace(/^[^\x00-\x7F]{1,2}\s+/, ''))}
                </Text>
              ))}
            </View>
          )}

          {currentMode === 'detailliert' && result.detailText && (
            <>
              <MarkdownText
                text={normalizeDetailSingularCopy(stripLlmLanguageMetaLines(result.detailText))}
                style={{ fontSize: 13, lineHeight: 20, color: C.text }}
              />
              {result.handlungsempfehlungen.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 6 }}>
                    EMPFEHLUNGEN
                  </Text>
                  {result.handlungsempfehlungen.map((e, i) => (
                    <Text key={i} style={{ fontSize: 13, lineHeight: 20, color: C.text, marginBottom: 3 }}>
                      {normalizeDetailSingularCopy(e.replace(/^[^\x00-\x7F]{1,2}\s+/, ''))}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}

          {currentMode === 'detailliert' && !result.detailText && onLoadDetailed && (
            <TouchableOpacity
              onPress={() => onLoadDetailed()}
              style={{ backgroundColor: C.primary, borderRadius: R.md,
                padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                Analyse laden
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}

      {/* Processing time removed from release UI */}
    </View>
  );
}
