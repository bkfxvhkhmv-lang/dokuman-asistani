import React, { Fragment } from 'react';
import { ScrollView } from 'react-native';
import ActionsPanel from '@/features/detail/components/ActionsPanel';
import SmartRemindersPanel from '@/components/SmartRemindersPanel';
import PremiumToast from '@/design/components/PremiumToast';

type Props = {
  smartActions: any;
  smartReminders: any;
  handleSmartAction: (key: string) => void;
  detail: any;
  actionPlan: any;
  moreMenuCount?: number;
  onOpenMore: () => void;
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  scrollBottomPadding?: number;
};

export default function DetailActionsTab({
  smartActions: _smartActions,
  smartReminders,
  handleSmartAction: _handleSmartAction,
  detail,
  actionPlan,
  moreMenuCount,
  onOpenMore,
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  scrollBottomPadding = 132,
}: Props) {
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
      />
      <SmartRemindersPanel
        suggestions={smartReminders.suggestions}
        scheduled={smartReminders.scheduled}
        isScheduling={smartReminders.isScheduling}
        onSchedule={smartReminders.schedule}
        onCancel={smartReminders.cancel}
        isAlreadyScheduled={smartReminders.isAlreadyScheduled}
      />
    </ScrollView>
    <PremiumToast config={smartReminders.toastConfig ?? null} onHide={smartReminders.hideToast} />
    </Fragment>
  );
}
