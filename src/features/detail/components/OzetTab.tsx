/**
 * Detail "Özet" — Hero sonrasında gescannte Seiten (Vollbild), TTS und Blöcke in `ozet-tab/`.
 */
import React, { useRef } from 'react';
import { Animated } from 'react-native';
import HeroCard from '@/features/detail/components/HeroCard';
import SimpleDocumentOverview from '@/features/detail/components/SimpleDocumentOverview';
import ActionCard from '@/design/components/ActionCard';
import DocumentSpeechSection from '@/features/detail/components/DocumentSpeechSection';
import DocumentAnalysisProgressCard from '@/features/detail/components/DocumentAnalysisProgressCard';
import { BesserErkennenCard } from '@/features/detail/components/details-panel/BesserErkennenCard';
import DocumentTodosCard from '@/features/detail/components/DocumentTodosCard';
import PagesPreviewCard from '@/features/detail/components/ozet-tab/PagesPreviewCard';
import OzetKarteListe from '@/features/detail/components/ozet-tab/OzetKarteListe';
import AktionenVerlauf from '@/features/detail/components/ozet-tab/AktionenVerlauf';
import WarnhinweisKarte from '@/features/detail/components/ozet-tab/WarnhinweisKarte';
import KiZusammenfassung from '@/features/detail/components/ozet-tab/KiZusammenfassung';
import DocumentKlassifikationStrip from '@/features/detail/components/DocumentKlassifikationStrip';
import { findeOzetQuellen } from '@/utils';
import type { OzetTabProps } from '@/features/detail/components/ozet-tab/types';
import { formatFrist, getTageText } from '@/utils/formatters';
import { getDocumentPipelineInfo } from '@/utils/documentPipelineStatus';
import { useT } from '@/hooks/useT';

export type { OzetTabProps } from '@/features/detail/components/ozet-tab/types';

export default function OzetTab({
  dok, info, score, scoreColor, docIntent, outcomePrediction,
  kontaktName, onKontaktVerknuepfen, onSimulator, anonModus,
  ozetKartlari = [], onOzetAktion, onMailTaslak,
  ozetQuellenSichtbar, setOzetQuellenSichtbar,
  documentChain: _documentChain,
  onOpenPages,
  scrollBottomPadding = 132,
  simpleLayout = false,
  actionPlan = null,
  naechsterSchrittZeile = null,
  suppressNextStepBanner = false,
  suppressOzetKartePrimaryAktion = null,
  onSimpleZahlen,
  onSimpleKalender,
  onSimpleHilfe,
  onRetryPipelineAnalysis,
  onKlassifikationBearbeiten,
}: OzetTabProps) {
  const { t } = useT();
  const scrollY = useRef(new Animated.Value(0)).current;
  const parallaxTranslate = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, -55],
    extrapolate: 'clamp',
  });

  const ozetQuellen = ozetQuellenSichtbar
    ? findeOzetQuellen(dok.rohText, dok.zusammenfassung)
    : [];
  const history = dok.actionHistory || [];
  const fristSubtitle =
    dok.frist ?
      `${formatFrist(dok.frist)}${getTageText(dok.frist) ? ` · ${getTageText(dok.frist)}` : ''}`
    : null;

  const pipelinePhase = getDocumentPipelineInfo(dok).phase;
  const showActionFirstCard =
    pipelinePhase === 'completed' &&
    !suppressNextStepBanner &&
    !!naechsterSchrittZeile &&
    actionPlan?.primary?.key !== 'review';

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
      scrollEventThrottle={16}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
    >
      {simpleLayout ? (
        <>
          <DocumentAnalysisProgressCard dok={dok} onRetryPipelineAnalysis={onRetryPipelineAnalysis} />
          <SimpleDocumentOverview
            dok={dok}
            naechsterSchritt={naechsterSchrittZeile}
            actionPlan={actionPlan}
            onZahlen={onSimpleZahlen}
            onKalender={onSimpleKalender}
            onHilfe={onSimpleHilfe}
            deferPrimaryActions={pipelinePhase !== 'completed'}
          />
          <BesserErkennenCard dok={dok} />
          <DocumentSpeechSection dok={dok} prominent />
          {dok.warnung ? <WarnhinweisKarte text={dok.warnung} /> : null}
        </>
      ) : (
        <>
          <HeroCard
            dok={dok} info={info} score={score} scoreColor={scoreColor}
            docIntent={docIntent} outcomePrediction={outcomePrediction}
            kontaktName={kontaktName} onKontaktVerknuepfen={onKontaktVerknuepfen}
            onSimulator={onSimulator} anonModus={anonModus}
            parallaxTranslate={parallaxTranslate}
            simpleLayout={simpleLayout}
          />
          <DocumentAnalysisProgressCard dok={dok} onRetryPipelineAnalysis={onRetryPipelineAnalysis} />

          {onKlassifikationBearbeiten ? (
            <DocumentKlassifikationStrip
              typ={dok.typ}
              userOrdner={dok.userOrdner}
              onAendern={onKlassifikationBearbeiten}
            />
          ) : null}

          {!suppressNextStepBanner && naechsterSchrittZeile && showActionFirstCard ? (
            <ActionCard
              title={naechsterSchrittZeile}
              subtitle={fristSubtitle}
              primaryAction={
                actionPlan?.primary?.onPress
                  ? { label: t(actionPlan.primary.shortLabelKey), onPress: actionPlan.primary.onPress }
                  : undefined
              }
              secondaryAction={
                actionPlan?.secondary?.[0]?.onPress
                  ? {
                      label: t(actionPlan.secondary[0].shortLabelKey),
                      onPress: actionPlan.secondary[0].onPress,
                    }
                  : undefined
              }
            />
          ) : null}

          <DocumentSpeechSection dok={dok} prominent />

          {dok.pages && dok.pages.length > 0 && onOpenPages && (
            <PagesPreviewCard pages={dok.pages} onOpen={onOpenPages} />
          )}

          <OzetKarteListe
            kartlar={ozetKartlari ?? []}
            onOzetAktion={onOzetAktion}
            suppressAktionKey={suppressOzetKartePrimaryAktion}
          />

          <AktionenVerlauf eintraege={history} />

          {dok.warnung && <WarnhinweisKarte text={dok.warnung} />}

          {dok.zusammenfassung && (
            <KiZusammenfassung
              zusammenfassung={dok.zusammenfassung}
              rohTextPresent={!!dok.rohText}
              ozetQuellenSichtbar={ozetQuellenSichtbar}
              setOzetQuellenSichtbar={setOzetQuellenSichtbar}
              quellenEintraege={ozetQuellen}
              onMailTaslak={onMailTaslak}
            />
          )}

          <DocumentTodosCard dok={dok} />
        </>
      )}
    </Animated.ScrollView>
  );
}
