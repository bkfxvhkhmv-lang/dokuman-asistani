import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import type { Dokument } from '../../../store';
import type { ErweiterteFeld, OcrRisikoItem, BeziehungsGraph } from '../../../utils/types';
import DocumentEntityOverlay from '../../../components/DocumentEntityOverlay';
import DocumentMagnifier from '../../../components/DocumentMagnifier';
import DocumentSpotlight from '../../../components/DocumentSpotlight';
import type { EntityBox } from '../../../services/visionApi';
import { InstitutionBehaviorModel, type InstitutionSuggestion } from '../../../core/intelligence/InstitutionBehaviorModel';

interface DetailsPanelProps {
  dok: Dokument | undefined;
  mevcutEtiketten?: string[];
  extrahierteFelder?: ErweiterteFeld[];
  aehnlicheDoks?: Array<Dokument & { _aehnlichScore?: number }>;
  ocrRisiken?: OcrRisikoItem[];
  graph?: BeziehungsGraph;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors: C, S, R, Shadow } = useTheme();
  return (
    <View style={{ marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary,
        letterSpacing: 0.8, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

function FieldRow({ icon, label, value, isLast = false }: { icon: string; label: string; value: string; isLast?: boolean }) {
  const { Colors: C, S } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: C.border }}>
      <Text style={{ fontSize: 16, width: 26 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function DetailsPanel({
  dok, mevcutEtiketten = [], extrahierteFelder = [], aehnlicheDoks = [], ocrRisiken = [], graph,
}: DetailsPanelProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const [imgSize,      setImgSize]      = useState({ w: 0, h: 0 });
  const [spotlightBox, setSpotlightBox] = useState<EntityBox | null>(null);
  const [rohTextOpen,  setRohTextOpen]  = useState(false);
  const [institution,  setInstitution]  = useState<InstitutionSuggestion | null>(null);

  useEffect(() => {
    if (!dok?.absender) return;
    InstitutionBehaviorModel.getSuggestion(dok.absender)
      .then(s => setInstitution(s))
      .catch(() => {});
  }, [dok?.absender]);

  if (!dok) return null;

  // Smart fields — V12 auto-fill results stored directly on the doc
  const smartFields: { icon: string; label: string; value: string }[] = [];
  if (dok.iban)         smartFields.push({ icon: '🏦', label: 'IBAN',          value: dok.iban });
  if (dok.aktenzeichen) smartFields.push({ icon: '📋', label: 'Aktenzeichen',  value: dok.aktenzeichen });
  if (dok.rechnungsnr)  smartFields.push({ icon: '🧾', label: 'Rechnungs-Nr.', value: dok.rechnungsnr });
  if (dok.kundennr)     smartFields.push({ icon: '👤', label: 'Kunden-Nr.',    value: dok.kundennr });
  if (dok.vertragsnr)   smartFields.push({ icon: '📄', label: 'Vertrags-Nr.',  value: dok.vertragsnr });
  if (dok.zahlungszweck)smartFields.push({ icon: '💬', label: 'Verwendungs-\nzweck', value: dok.zahlungszweck });
  if (dok.steuerid)     smartFields.push({ icon: '🔢', label: 'Steuer-ID',     value: dok.steuerid });
  if (dok.garantieBis)  smartFields.push({ icon: '🛡️', label: 'Garantie bis',  value: dok.garantieBis });

  const confidencePct  = dok.confidence ?? null;
  const confidenceColor =
    confidencePct == null ? C.textTertiary :
    confidencePct >= 85   ? '#22C55E' :
    confidencePct >= 60   ? '#F59E0B' : '#EF4444';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: S.md, paddingBottom: 48 }}>

      {/* ── OCR quality ────────────────────────────────────────────────────── */}
      {confidencePct != null && (
        <SectionCard title="OCR-QUALITÄT">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }}>
              <View style={{ width: `${confidencePct}%`, height: '100%', borderRadius: 3, backgroundColor: confidenceColor }} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: confidenceColor, minWidth: 38 }}>
              {confidencePct}%
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 6 }}>
            {confidencePct >= 85 ? 'Sehr gute Texterkennungsqualität' :
             confidencePct >= 60 ? 'Mittlere Qualität — einige Felder ggf. unvollständig' :
             'Niedrige Qualität — manuelle Prüfung empfohlen'}
          </Text>
          {ocrRisiken.length > 0 && (
            <View style={{ marginTop: 10, gap: 4 }}>
              {ocrRisiken.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5,
                    backgroundColor: r.risiko === 'hoch' ? C.danger : C.warning }} />
                  <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>{r.wort}</Text>: {r.grund}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {/* ── Smart erkannte Felder ───────────────────────────────────────────── */}
      {smartFields.length > 0 && (
        <SectionCard title="ERKANNTE FELDER (SMART)">
          {smartFields.map((f, i) => (
            <FieldRow key={f.label} icon={f.icon} label={f.label} value={f.value}
              isLast={i === smartFields.length - 1} />
          ))}
        </SectionCard>
      )}

      {/* ── Institution profile ─────────────────────────────────────────────── */}
      {institution && institution.totalDocs > 0 && (
        <SectionCard title="ABSENDER-PROFIL (GELERNT)">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
              backgroundColor: institution.confidence === 'high'   ? '#22C55E22' :
                               institution.confidence === 'medium' ? '#F59E0B22' : '#6B728022',
              borderWidth: 0.5,
              borderColor:  institution.confidence === 'high'   ? '#22C55E' :
                            institution.confidence === 'medium' ? '#F59E0B' : '#6B7280',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700',
                color: institution.confidence === 'high'   ? '#22C55E' :
                       institution.confidence === 'medium' ? '#F59E0B' : C.textSecondary }}>
                {institution.confidence === 'high' ? 'Hohe Konfidenz' :
                 institution.confidence === 'medium' ? 'Mittlere Konfidenz' : 'Geringe Konfidenz'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>
              {institution.totalDocs} {institution.totalDocs === 1 ? 'Dokument' : 'Dokumente'} bekannt
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            {institution.likelyTyp && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Häufigster Typ</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.likelyTyp}</Text>
              </View>
            )}
            {institution.avgFristText && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Ø Frist</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.avgFristText}</Text>
              </View>
            )}
            {institution.avgBetragText && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Ø Betrag</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{institution.avgBetragText}</Text>
              </View>
            )}
            {institution.likelyRisiko && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Typ. Risiko</Text>
                <Text style={{ fontSize: 12, fontWeight: '700',
                  color: institution.likelyRisiko === 'hoch'   ? C.danger :
                         institution.likelyRisiko === 'mittel' ? C.warning : '#22C55E' }}>
                  {institution.likelyRisiko === 'hoch'   ? 'Hoch' :
                   institution.likelyRisiko === 'mittel' ? 'Mittel' : 'Niedrig'}
                </Text>
              </View>
            )}
          </View>
        </SectionCard>
      )}

      {/* ── Document image preview with BBox overlay ───────────────────────── */}
      {dok.uri && (
        <View style={{ marginBottom: S.md, borderRadius: R.lg, overflow: 'hidden',
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary,
            letterSpacing: 0.8, padding: S.md, paddingBottom: S.sm }}>DOKUMENT VORSCHAU</Text>
          <View
            onLayout={e => {
              const w = e.nativeEvent.layout.width;
              setImgSize(prev => prev.w === w ? prev : { w, h: w * 1.414 });
            }}
          >
            <Image
              source={{ uri: dok.uri }}
              style={{ width: imgSize.w || '100%', height: imgSize.h || 300 }}
              resizeMode="contain"
            />
            {dok.entityBoxes && dok.entityBoxes.length > 0 && imgSize.w > 0 && (
              <DocumentEntityOverlay
                entityBoxes={dok.entityBoxes}
                imageWidth={imgSize.w}
                imageHeight={imgSize.h}
                viewWidth={imgSize.w}
                viewHeight={imgSize.h}
                onBoxPress={box => setSpotlightBox(box)}
              />
            )}
            <DocumentSpotlight
              entity={spotlightBox}
              scaleX={1}
              scaleY={1}
              onDismiss={() => setSpotlightBox(null)}
            />
            <DocumentMagnifier
              uri={dok.uri}
              containerWidth={imgSize.w}
              containerHeight={imgSize.h}
            />
          </View>
        </View>
      )}

      {/* ── Etiketten ───────────────────────────────────────────────────────── */}
      {mevcutEtiketten.length > 0 && (
        <SectionCard title="ETIKETTEN">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {mevcutEtiketten.map(e => (
              <View key={e} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.primaryDark }}>🏷 {e}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* ── Extrahierte Felder (AI) ──────────────────────────────────────────── */}
      {extrahierteFelder.length > 0 && (
        <SectionCard title="ERKANNTE FELDER (KI)">
          {extrahierteFelder.map((f, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
              borderBottomWidth: i < extrahierteFelder.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 18, width: 28 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>{f.label.toUpperCase()}</Text>
                <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2 }}>{f.wert}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Ähnliche Dokumente ───────────────────────────────────────────────── */}
      {aehnlicheDoks.length > 0 && (
        <SectionCard title="ÄHNLICHE DOKUMENTE">
          {aehnlicheDoks.slice(0, 3).map((d, i) => (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
              borderBottomWidth: i < Math.min(aehnlicheDoks.length, 3) - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>{d.titel}</Text>
                <Text style={{ fontSize: 11, color: C.textTertiary }}>{d.absender} · {d.typ}</Text>
              </View>
              {d._aehnlichScore != null && (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.primaryLight }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.primaryDark }}>{d._aehnlichScore}★</Text>
                </View>
              )}
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Rohtext (collapsible) ───────────────────────────────────────────── */}
      {dok.rohText ? (
        <View style={{ borderRadius: R.lg, padding: S.md, backgroundColor: C.bgCard,
          borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8 }}>
              ORIGINALTEXT (OCR)
            </Text>
            <TouchableOpacity onPress={() => setRohTextOpen(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>
                {rohTextOpen ? 'Weniger' : 'Alles anzeigen'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}
            numberOfLines={rohTextOpen ? undefined : 6}>
            {dok.rohText}
          </Text>
        </View>
      ) : null}

    </ScrollView>
  );
}
