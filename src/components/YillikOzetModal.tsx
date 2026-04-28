import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '../ThemeContext';
import { berechneJahresOzet, formatBetrag } from '../utils';
import type { Dokument } from '../store';

const RENKLER = ['#6C63FF', '#FF6584', '#43B89C', '#F7B731', '#FC5C65', '#45AAF2'];

interface MonatsGruppe {
  monat: number;
  name: string;
  anzahl: number;
  gesamtBetrag: number;
}

interface DiagrammProps {
  monatsGruppen: MonatsGruppe[];
  C: ThemeColors;
}

function BalkenDiagramm({ monatsGruppen, C }: DiagrammProps) {
  const maxBetrag = Math.max(...monatsGruppen.map(m => m.gesamtBetrag), 1);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2 }}>
        {monatsGruppen.map((m, i) => {
          const hoehe = Math.round((m.gesamtBetrag / maxBetrag) * 72);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '80%', height: hoehe || 2, borderRadius: 3,
                backgroundColor: hoehe > 0 ? RENKLER[i % RENKLER.length] : C.border }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {monatsGruppen.map((m, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: C.textTertiary }}>
            {m.name.slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function AnzahlDiagramm({ monatsGruppen, C }: DiagrammProps) {
  const maxAnzahl = Math.max(...monatsGruppen.map(m => m.anzahl), 1);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 2 }}>
        {monatsGruppen.map((m, i) => {
          const hoehe = Math.round((m.anzahl / maxAnzahl) * 52);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '80%', height: hoehe || 2, borderRadius: 3,
                backgroundColor: hoehe > 0 ? C.primary : C.border }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {monatsGruppen.map((m, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: C.textTertiary }}>
            {m.name.slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function KennzahlKarte({ icon, wert, label, farbe, C }: { icon: string; wert: string | number; label: string; farbe?: string; C: ThemeColors }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
      alignItems: 'center', borderWidth: 0.5, borderColor: C.border }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: farbe || C.text, marginTop: 4 }}>{wert}</Text>
      <Text style={{ fontSize: 10, color: C.textTertiary, textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

interface YillikOzetModalProps {
  visible: boolean;
  onClose: () => void;
  docs: Dokument[];
}

export default function YillikOzetModal({ visible, onClose, docs }: YillikOzetModalProps) {
  const { Colors: C } = useTheme();
  const mevcutYil = new Date().getFullYear();
  const [seciliYil, setSeciliYil] = useState(mevcutYil);

  const yillar = useMemo(() => {
    const set = new Set(docs
      .map(d => d.datum ? new Date(d.datum).getFullYear() : null)
      .filter((y): y is number => y !== null));
    set.add(mevcutYil);
    return [...set].sort((a, b) => b - a);
  }, [docs, mevcutYil]);

  const ozet = useMemo(() => berechneJahresOzet(docs, seciliYil), [docs, seciliYil]);

  const typEintrage = Object.entries((ozet.typVerteilung || {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '90%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
          alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: C.text }}>
            📊  Jahresrückblick
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {yillar.map(y => (
              <TouchableOpacity key={y} onPress={() => setSeciliYil(y)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: y === seciliYil ? C.primary : C.bgInput,
                  borderWidth: 0.5, borderColor: y === seciliYil ? C.primary : C.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700',
                  color: y === seciliYil ? '#fff' : C.textSecondary }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {ozet.gesamtAnzahl === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 12 }}>
                Keine Dokumente für {seciliYil}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <KennzahlKarte icon="📄" wert={ozet.gesamtAnzahl} label="Dokumente" C={C} />
                <KennzahlKarte icon="💶"
                  wert={ozet.gesamtBetrag > 0 ? (formatBetrag(ozet.gesamtBetrag) ?? '–') : '–'}
                  label="Gesamtbetrag" farbe={C.danger} C={C} />
                <KennzahlKarte icon="✅" wert={`${ozet.bezahlQuote}%`} label="Bezahlt" farbe={C.success} C={C} />
              </View>

              {ozet.offeneBetraege > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                  backgroundColor: C.dangerLight, borderRadius: 12, padding: 12,
                  marginBottom: 16, borderWidth: 0.5, borderColor: C.danger + '44' }}>
                  <Text style={{ fontSize: 13, color: C.dangerText }}>Noch offen</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>
                    {formatBetrag(ozet.offeneBetraege)}
                  </Text>
                </View>
              )}

              <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 2 }}>
                  Monatliche Beträge
                </Text>
                <BalkenDiagramm monatsGruppen={ozet.monatsGruppen} C={C} />
              </View>

              <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 2 }}>
                  Dokumente pro Monat
                </Text>
                <AnzahlDiagramm monatsGruppen={ozet.monatsGruppen} C={C} />
                {ozet.geschaefstersMonat.anzahl > 0 && (
                  <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 8 }}>
                    Meiste Dokumente: {ozet.geschaefstersMonat.name} ({ozet.geschaefstersMonat.anzahl} Dok.)
                  </Text>
                )}
              </View>

              <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 10 }}>
                  Risikoverteilung
                </Text>
                {([
                  { key: 'hoch', label: 'Hoch', farbe: C.danger, icon: '🔴' },
                  { key: 'mittel', label: 'Mittel', farbe: C.warning, icon: '🟡' },
                  { key: 'niedrig', label: 'Niedrig', farbe: C.success, icon: '🟢' },
                ] as const).map(({ key, label, farbe, icon }) => {
                  const anzahl = (ozet.risikoVerteilung as Record<string, number>)[key] || 0;
                  const prozent = ozet.gesamtAnzahl > 0
                    ? Math.round((anzahl / ozet.gesamtAnzahl) * 100) : 0;
                  return (
                    <View key={key} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: C.text }}>{icon} {label}</Text>
                        <Text style={{ fontSize: 12, color: C.textSecondary }}>{anzahl} ({prozent}%)</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3 }}>
                        <View style={{ height: 6, width: `${prozent}%`, backgroundColor: farbe, borderRadius: 3 }} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {typEintrage.length > 0 && (
                <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                  marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 10 }}>
                    Nach Dokumenttyp
                  </Text>
                  {typEintrage.map(([typ, anzahl], i) => (
                    <View key={typ} style={{ flexDirection: 'row', justifyContent: 'space-between',
                      paddingVertical: 6, borderBottomWidth: i < typEintrage.length - 1 ? 0.5 : 0,
                      borderColor: C.border }}>
                      <Text style={{ fontSize: 13, color: C.text }}>{typ}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: RENKLER[i % RENKLER.length] }}>
                        {anzahl}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {ozet.topAbsender.length > 0 && (
                <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                  marginBottom: 8, borderWidth: 0.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 10 }}>
                    Häufigste Absender
                  </Text>
                  {(ozet.topAbsender as { ad: string; anzahl: number }[]).map(({ ad, anzahl }, i) => (
                    <View key={ad} style={{ flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingVertical: 6,
                      borderBottomWidth: i < ozet.topAbsender.length - 1 ? 0.5 : 0,
                      borderColor: C.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', width: 20, height: 20,
                          borderRadius: 10, backgroundColor: RENKLER[i % RENKLER.length],
                          textAlign: 'center', lineHeight: 20 }}>{i + 1}</Text>
                        <Text style={{ fontSize: 13, color: C.text, flex: 1 }} numberOfLines={1}>{ad}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>{anzahl}×</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
