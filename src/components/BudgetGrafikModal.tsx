/**
 * BudgetGrafikModal — Yillik / aylik harcama gorunumu modal'i.
 *
 * Bu dosya yalnizca state ve callback yonetimini yapar; gorsel
 * parcalari `./budget-grafik/` altindaki ozel bilesenlere devreder:
 *
 *  - useBudgetData         — yillik gruplama + memo'lar
 *  - useChartInteraction   — pan/tooltip/haptik etkilesim
 *  - BudgetYearStrip     — başlık + yıl seçiciler
 *  - BudgetChartEmpty    — veri yoksa boş durum
 *  - SummaryHeader       — gesamt + ortalama
 *  - MonatsChart           — 12 bar + crosshair + tooltip
 *  - SeciliAyDetay         — secili ayin dokumanlari
 *  - TypBalken             — dokumenttipi bar
 *  - TopAbsender           — en cok harcamali firmalar
 *  - AnimatedCounter       — sayisal animasyon
 *
 * Eski monolithic versiyon 476 satir tek dosyaydi; modulerlestirme
 * sonrasi her bilesen ayri test edilebilir.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';

import BudgetYearStrip from '@/components/budget-grafik/BudgetYearStrip';
import BudgetChartEmpty from '@/components/budget-grafik/BudgetChartEmpty';
import SummaryHeader   from '@/components/budget-grafik/SummaryHeader';
import MonatsChart     from '@/components/budget-grafik/MonatsChart';
import SeciliAyDetay   from '@/components/budget-grafik/SeciliAyDetay';
import TopAbsender     from '@/components/budget-grafik/TopAbsender';
import TypBalken       from '@/components/budget-grafik/TypBalken';
import { useBudgetData }       from '@/components/budget-grafik/useBudgetData';
import { useChartInteraction } from '@/components/budget-grafik/useChartInteraction';

interface Props {
  visible: boolean;
  onClose: () => void;
  docs:    Dokument[];
}

type UebersichtModus = 'monat' | 'jahr';

export default function BudgetGrafikModal({ visible, onClose, docs }: Props) {
  const { Colors: C } = useTheme();
  const mevcutYil = new Date().getFullYear();

  const [seciliYil, setSeciliYil]     = useState(mevcutYil);
  const [seciliMonat, setSeciliMonat] = useState(new Date().getMonth() + 1);
  const [modus, setModus]             = useState<UebersichtModus>('monat');

  // Veri turetimi (gruplamalar + ozet) hook'tan
  const {
    yillar, monatsGruppen, typGruppen, absenderGruppen,
    gesamtBetrag, jahresDokumentAnzahl, seciliAyDocs, seciliAyBetrag,
    seciliAyDokumentAnzahl, maxMonatsBetrag, seciliAyTypGruppen, seciliAyAbsenderGruppen,
  } = useBudgetData(docs, seciliYil, seciliMonat);

  // Pan + spring tooltip + haptik etkilesim
  const chart = useChartInteraction({
    onMonthChange: setSeciliMonat,
  });

  const seciliAyName = new Date(seciliYil, seciliMonat - 1, 1)
    .toLocaleString('de-DE', { month: 'long' });
  const jahresDurchschnitt = gesamtBetrag / 12;
  const aktiverGesamtbetrag = modus === 'jahr' ? gesamtBetrag : seciliAyBetrag;
  const leerZustandText = modus === 'jahr'
    ? 'Keine Ausgaben mit Betrag gefunden.'
    : 'Keine Ausgaben für diesen Monat.';
  const aktiverTypGruppen = modus === 'jahr' ? typGruppen : seciliAyTypGruppen;
  const verteilungsTitel = modus === 'jahr' ? 'Jahresübersicht nach Dokumenttyp' : `Monatsübersicht nach Dokumenttyp`;
  const absenderTitel = modus === 'jahr' ? 'Höchste Ausgaben nach Absender' : `Absender im ${seciliAyName}`;
  const aktiveAbsenderGruppen = modus === 'jahr' ? absenderGruppen : seciliAyAbsenderGruppen;
  const modusBeschreibung = useMemo(
    () => (modus === 'jahr' ? `${seciliYil} im Überblick` : `${seciliAyName} ${seciliYil} im Überblick`),
    [modus, seciliAyName, seciliYil],
  );

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />

      <View
        style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%', paddingBottom: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8, paddingHorizontal: 16 }}>
          <View style={{ flex: 1 }} />
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, position: 'absolute', left: '50%', marginLeft: -20 }} />
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fertig"
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.primary }}>Fertig</Text>
          </TouchableOpacity>
        </View>

        <BudgetYearStrip yillar={yillar} seciliYil={seciliYil} onSelectYil={setSeciliYil} C={C} />

        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <View style={{
            flexDirection: 'row',
            alignSelf: 'flex-start',
            gap: 6,
            padding: 4,
            borderRadius: 12,
            backgroundColor: C.bgInput,
            borderWidth: 0.5,
            borderColor: C.border,
          }}>
            {([
              ['monat', 'Monat'],
              ['jahr', 'Jahr'],
            ] as const).map(([key, label]) => {
              const active = modus === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setModus(key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: active ? C.primary : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.textSecondary }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 8 }}>
            {modusBeschreibung}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {aktiverGesamtbetrag === 0 ? (
            <BudgetChartEmpty seciliYil={seciliYil} secondaryColor={C.textSecondary} title={leerZustandText} />
          ) : (
            <>
              <SummaryHeader
                modus={modus}
                seciliYil={seciliYil}
                seciliAyName={seciliAyName}
                gesamtBetrag={gesamtBetrag}
                jahresDurchschnitt={jahresDurchschnitt}
                jahresDokumentAnzahl={jahresDokumentAnzahl}
                seciliAyBetrag={seciliAyBetrag}
                seciliAyDokumentAnzahl={seciliAyDokumentAnzahl}
                C={C}
              />

              <MonatsChart
                monatsGruppen={monatsGruppen}
                maxMonatsBetrag={maxMonatsBetrag}
                seciliMonat={seciliMonat}
                seciliAyBetrag={seciliAyBetrag}
                setSeciliMonat={setSeciliMonat}
                panHandlers={chart.panResponder.panHandlers}
                onChartLayout={chart.onChartLayout}
                tooltipStyle={chart.tooltipStyle}
                crosshairStyle={chart.crosshairStyle}
                isPanning={chart.isPanning}
                C={C}
                title={modus === 'jahr' ? 'Jahresübersicht' : 'Monatsübersicht'}
              />

              <SeciliAyDetay
                modus={modus}
                seciliYil={seciliYil}
                ayName={seciliAyName}
                ayBetrag={seciliAyBetrag}
                seciliAyDocs={seciliAyDocs}
                dokumentAnzahl={seciliAyDokumentAnzahl}
                C={C}
              />

              {aktiverTypGruppen.length > 0 && (
                <View
                  style={{
                    backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                    marginBottom: 16, borderWidth: 0.5, borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 14 }}>
                    {verteilungsTitel}
                  </Text>
                  {aktiverTypGruppen.map(({ typ, betrag, anzahl }) => (
                    <TypBalken
                      key={typ}
                      typ={typ} betrag={betrag} anzahl={anzahl}
                      gesamtBetrag={aktiverGesamtbetrag}
                      C={C}
                    />
                  ))}
                </View>
              )}

              <TopAbsender absenderListe={aktiveAbsenderGruppen} C={C} title={absenderTitel} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
