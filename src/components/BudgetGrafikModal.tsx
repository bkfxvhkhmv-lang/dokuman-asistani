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
import React, { useState } from 'react';
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

export default function BudgetGrafikModal({ visible, onClose, docs }: Props) {
  const { Colors: C } = useTheme();
  const mevcutYil = new Date().getFullYear();

  const [seciliYil, setSeciliYil]     = useState(mevcutYil);
  const [seciliMonat, setSeciliMonat] = useState(new Date().getMonth() + 1);

  // Veri turetimi (gruplamalar + ozet) hook'tan
  const {
    yillar, monatsGruppen, typGruppen, absenderGruppen,
    gesamtBetrag, seciliAyDocs, seciliAyBetrag, maxMonatsBetrag,
  } = useBudgetData(docs, seciliYil, seciliMonat);

  // Pan + spring tooltip + haptik etkilesim
  const chart = useChartInteraction({
    onMonthChange: setSeciliMonat,
  });

  const seciliAyName = new Date(seciliYil, seciliMonat - 1, 1)
    .toLocaleString('de-DE', { month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />

      <View
        style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%', paddingBottom: 32,
        }}
      >
        <View
          style={{
            width: 40, height: 4, borderRadius: 2,
            backgroundColor: C.border,
            alignSelf: 'center', marginTop: 12, marginBottom: 8,
          }}
        />

        <BudgetYearStrip yillar={yillar} seciliYil={seciliYil} onSelectYil={setSeciliYil} C={C} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {gesamtBetrag === 0 ? (
            <BudgetChartEmpty seciliYil={seciliYil} secondaryColor={C.textSecondary} />
          ) : (
            <>
              <SummaryHeader seciliYil={seciliYil} gesamtBetrag={gesamtBetrag} C={C} />

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
              />

              <SeciliAyDetay
                ayName={seciliAyName}
                ayBetrag={seciliAyBetrag}
                seciliAyDocs={seciliAyDocs}
                C={C}
              />

              {typGruppen.length > 0 && (
                <View
                  style={{
                    backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                    marginBottom: 16, borderWidth: 0.5, borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 14 }}>
                    Nach Dokumenttyp
                  </Text>
                  {typGruppen.map(({ typ, betrag, anzahl }) => (
                    <TypBalken
                      key={typ}
                      typ={typ} betrag={betrag} anzahl={anzahl}
                      gesamtBetrag={gesamtBetrag}
                      C={C}
                    />
                  ))}
                </View>
              )}

              <TopAbsender absenderListe={absenderGruppen} C={C} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
