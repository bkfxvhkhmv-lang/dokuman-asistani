import React from 'react';
import { ScrollView } from 'react-native';
import DigitalTwinPanel from '@/features/detail/components/DigitalTwinPanel';
import AIBox from '@/features/detail/components/AIBox';
import RiskPanel from '@/features/detail/components/RiskPanel';
import TasksPanel from '@/features/detail/components/TasksPanel';
import ChatEntryBar from '@/features/detail/components/ChatEntryBar';
import SmartSummaryCard from '@/components/SmartSummaryCard';
import SmartRiskPanel from '@/components/SmartRiskPanel';
import AnalyseHeaderCard from '@/features/detail/components/AnalyseHeaderCard';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';

type Props = {
  smartSummary: any;
  detail: any;
  modal: any;
  smartRisk: any;
  handleSmartAction: (key: string) => void;
  actions: any;
  dokId: string;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  scrollBottomPadding?: number;
  actionPlan: ActionPlan | null;
};

export default function DetailAnalysisTab({
  smartSummary,
  detail,
  modal,
  smartRisk,
  handleSmartAction,
  actions,
  dokId,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  scrollBottomPadding = 132,
  actionPlan,
}: Props) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: scrollBottomPadding }}
      scrollEventThrottle={16}
      onScroll={onTabScroll}
      onContentSizeChange={onScrollContentSize}
      onLayout={onScrollLayout}
    >
      <AnalyseHeaderCard dok={detail.dok} actionPlan={actionPlan} />

      <SmartSummaryCard
        result={smartSummary.result}
        loading={smartSummary.loading}
        currentMode={smartSummary.mode}
        onModeChange={smartSummary.setMode}
        onLoadDetailed={smartSummary.loadDetailed}
      />

      {smartRisk && <SmartRiskPanel result={smartRisk} onAktion={handleSmartAction} />}

      <RiskPanel
        ocrRisiken={detail.ocrRisiken}
        hukukiRisiken={detail.hukukiRisiken}
        hukukiSkor={detail.hukukiSkor}
        hukukiSkorColor={detail.hukukiSkorColor}
        darkPatterns={detail.darkPatterns}
        vertragRisiken={detail.vertragRisiken}
        dokTyp={detail.dok?.typ}
        rohText={detail.dok?.rohText}
      />

      <DigitalTwinPanel
        dok={detail.dok}
        digitalTwin={detail.digitalTwin}
        institutionDesc={detail.institutionDesc?.description ?? detail.institutionDesc?.name ?? null}
        isLoading={!detail.digitalTwin && !!detail.dok}
      />

      <AIBox
        dok={detail.dok}
        onMailTaslak={actions.handleMailTaslak}
        ozetQuellenSichtbar={modal.ozetQuellenSichtbar}
        setOzetQuellenSichtbar={modal.setOzetQuellenSichtbar}
        ozetQuellen={detail.ozetQuellen || []}
      />

      <TasksPanel
        aufgaben={detail.aufgaben}
        offeneAufgaben={detail.offeneAufgaben}
        vorschlaege={detail.aufgabenVorschlaege}
        onOpenAddModal={() => modal.open('aufgaben')}
        onToggle={(a: { id: string; erledigt: boolean }) =>
          detail.dispatch({
            type: 'UPDATE_AUFGABE',
            dokId,
            payload: { id: a.id, erledigt: !a.erledigt },
          })
        }
        onAdd={(v: { id?: string; titel: string; frist?: string | null }) =>
          detail.dispatch({
            type: 'ADD_AUFGABE',
            dokId,
            payload: {
              id: v.id || Date.now().toString(36),
              titel: v.titel,
              faellig: v.frist || null,
              erledigt: false,
            },
          })
        }
      />

      <ChatEntryBar dok={detail.dok} onOpen={() => modal.open('chat')} />
    </ScrollView>
  );
}
