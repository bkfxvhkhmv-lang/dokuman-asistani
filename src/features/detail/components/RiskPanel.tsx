import React from 'react';
import { View, Text } from 'react-native';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../ThemeContext';

interface OcrRisikoItem {
  wort: string;
  grund: string;
  risiko: string;
}

interface HukukiRisikoItem {
  icon: string;
  text: string;
  level: string;
}

interface DarkPatternItem {
  id?: string;
  titel: string;
  beschreibung: string;
  rechtsgrundlage: string;
  empfehlung: string;
  schwere: string;
}

interface VertragRisikoItem {
  icon: string;
  text: string;
  level: string;
}

interface RiskPanelProps {
  ocrRisiken?: OcrRisikoItem[];
  hukukiRisiken?: HukukiRisikoItem[];
  hukukiSkor?: number;
  hukukiSkorColor?: string;
  darkPatterns?: DarkPatternItem[];
  vertragRisiken?: VertragRisikoItem[];
  dokTyp?: string;
  rohText?: string | null;
}

export default function RiskPanel({
  ocrRisiken = [], hukukiRisiken = [], hukukiSkor = 0, hukukiSkorColor,
  darkPatterns = [], vertragRisiken = [], dokTyp, rohText,
}: RiskPanelProps) {
  const { Colors: C, S, R, Shadow } = useTheme();

  return (
    <>
      {ocrRisiken.length > 0 && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
          backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning + '88', ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="alert-circle" size={16} color={C.warningText} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>OCR-Risiko erkannt</Text>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: C.warning }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{ocrRisiken.length}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: C.textSecondary, marginBottom: 10 }}>
            Folgende Wörter könnten durch OCR-Fehler entstanden sein:
          </Text>
          {ocrRisiken.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6,
              padding: 8, borderRadius: 8, backgroundColor: r.risiko === 'hoch' ? C.dangerLight : 'rgba(255,255,255,0.5)' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: r.risiko === 'hoch' ? C.danger : C.warning, minWidth: 80 }} numberOfLines={1}>
                „{r.wort}"
              </Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1, lineHeight: 16 }}>{r.grund}</Text>
            </View>
          ))}
        </View>
      )}

      {hukukiRisiken.length > 0 && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>⚖️</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Rechtliches Risiko</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 70, height: 6, backgroundColor: C.borderLight, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${hukukiSkor}%`, backgroundColor: hukukiSkorColor, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: hukukiSkorColor }}>{hukukiSkor}</Text>
            </View>
          </View>
          {hukukiRisiken.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              marginBottom: i < hukukiRisiken.length - 1 ? 8 : 0, padding: 10, borderRadius: 10,
              backgroundColor: r.level === 'hoch' ? C.dangerLight : r.level === 'mittel' ? C.warningLight : C.bgInput,
              borderWidth: 0.5,
              borderColor: r.level === 'hoch' ? C.dangerBorder : r.level === 'mittel' ? C.warning + '44' : C.border }}>
              <Text style={{ fontSize: 15 }}>{r.icon}</Text>
              <Text style={{ fontSize: 12, color: r.level === 'hoch' ? C.danger : r.level === 'mittel' ? C.warning : C.textSecondary, flex: 1 }}>
                {r.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {darkPatterns.length > 0 && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
          backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.danger + '66', ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 16 }}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>Verdächtige Praktiken</Text>
              <Text style={{ fontSize: 10, color: C.textTertiary }}>Mögliche Gesetzesverstöße erkannt</Text>
            </View>
            <View style={{ backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{darkPatterns.length}</Text>
            </View>
          </View>
          {darkPatterns.map((w, i) => (
            <View key={w.id || i} style={{ marginBottom: i < darkPatterns.length - 1 ? 10 : 0, padding: 12, borderRadius: 12,
              backgroundColor: w.schwere === 'hoch' ? C.dangerLight : C.warningLight,
              borderWidth: 0.5, borderColor: w.schwere === 'hoch' ? C.danger + '55' : C.warning + '55' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: w.schwere === 'hoch' ? C.danger : C.warning }}>
                  {w.schwere === 'hoch' ? '🔴' : '🟡'} {w.titel}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: C.text, lineHeight: 18, marginBottom: 4 }}>{w.beschreibung}</Text>
              <Text style={{ fontSize: 10, color: C.textTertiary, marginBottom: 4 }}>📖 {w.rechtsgrundlage}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: w.schwere === 'hoch' ? C.danger : C.warning }}>
                → {w.empfehlung}
              </Text>
            </View>
          ))}
        </View>
      )}

      {dokTyp === 'Vertrag' && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 16 }}>📜</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Vertragsrisiken</Text>
          </View>
          {vertragRisiken.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              {rohText ? '✓ Keine kritischen Klauseln erkannt' : 'Kein OCR-Text — Risiken können nicht analysiert werden'}
            </Text>
          ) : (
            vertragRisiken.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10,
                padding: 10, borderRadius: 10,
                backgroundColor: r.level === 'hoch' ? C.dangerLight : r.level === 'mittel' ? C.warningLight : C.bgInput,
                borderWidth: 0.5,
                borderColor: r.level === 'hoch' ? C.dangerBorder : r.level === 'mittel' ? C.warning + '44' : C.border }}>
                <Text style={{ fontSize: 16 }}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600',
                    color: r.level === 'hoch' ? C.danger : r.level === 'mittel' ? C.warning : C.textSecondary }}>
                    {r.level === 'hoch' ? 'Hohes Risiko' : r.level === 'mittel' ? 'Mittleres Risiko' : 'Hinweis'}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{r.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </>
  );
}
