import React, { useMemo, Fragment } from 'react';
import { ScrollView } from 'react-native';
import ActionsPanel from '@/features/detail/components/ActionsPanel';
import SmartActionsPanel from '@/components/SmartActionsPanel';
import SmartRemindersPanel from '@/components/SmartRemindersPanel';
import PremiumToast from '@/design/components/PremiumToast';
import type { ActionKey } from '@/services/SmartActionsService';

/** SmartActionsPanel: keine doppelte Zeile zum großen „Nächster Schritt“-Karten-CTA darüber */
const SMART_OMIT_FOR_PRIMARY: Partial<Record<string, ActionKey[]>> = {
  ai: ['ai_erklären'],
  zahlen: ['zahlen'],
  einspruch: ['einspruch'],
  kalender: ['kalender'],
  review: ['bearbeiten'],
};

type Props = {
  smartActions: any;
  smartReminders: any;
  handleSmartAction: (key: string) => void;
  detail: any;
  actionPlan: any;
  moreMenuCount?: number;
  onOpenMore: () => void;
  onBack: () => void;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  scrollBottomPadding?: number;
};

export default function DetailActionsTab({
  smartActions,
  smartReminders,
  handleSmartAction,
  detail,
  actionPlan,
  moreMenuCount,
  onOpenMore,
  onBack,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  scrollBottomPadding = 132,
}: Props) {
  const smartOmitKeys = useMemo((): readonly ActionKey[] | undefined => {
    const k = actionPlan?.primary?.key;
    const list = k ? SMART_OMIT_FOR_PRIMARY[k] : undefined;
    return list?.length ? list : undefined;
  }, [actionPlan?.primary?.key]);

  return (
    <Fragment>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: scrollBottomPadding }}
      scrollEventThrottle={16}
      onScroll={onTabScroll}
      onContentSizeChange={onScrollContentSize}
      onLayout={onScrollLayout}
    >
      <ActionsPanel
        dok={detail.dok}
        digitalTwin={detail.digitalTwin}
        actionPlan={actionPlan}
        moreMenuCount={moreMenuCount}
        onOpenMore={onOpenMore}
        onBack={onBack}
      />
      <SmartRemindersPanel
        suggestions={smartReminders.suggestions}
        scheduled={smartReminders.scheduled}
        isScheduling={smartReminders.isScheduling}
        onSchedule={smartReminders.schedule}
        onCancel={smartReminders.cancel}
        isAlreadyScheduled={smartReminders.isAlreadyScheduled}
      />
      {smartActions && (
        <SmartActionsPanel
          result={smartActions}
          onAction={handleSmartAction}
          omitPrimaryBanner
          omitKeys={smartOmitKeys}
        />
      )}
    </ScrollView>
    <PremiumToast config={smartReminders.toastConfig ?? null} onHide={smartReminders.hideToast} />
    </Fragment>
  );
}
