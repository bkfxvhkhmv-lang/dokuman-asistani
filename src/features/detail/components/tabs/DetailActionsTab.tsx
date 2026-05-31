import React, { Fragment } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ActionsPanel from '@/features/detail/components/ActionsPanel';
import SmartRemindersPanel from '@/components/SmartRemindersPanel';
import PremiumToast from '@/design/components/PremiumToast';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';

type Props = {
  smartActions: any;
  smartReminders: any;
  handleSmartAction: (key: string) => void;
  detail: any;
  actionPlan: any;
  moreMenuCount?: number;
  moreItems?: MoreMenuItem[];
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
  moreItems = [],
  onTabScroll,
  onScrollContentSize,
  onScrollLayout,
  scrollBottomPadding = 132,
}: Props) {
  const { Colors: C, S, R } = useTheme();

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
        moreMenuCount={0}
        onOpenMore={() => {}}
      />

      {moreItems.length > 0 && (
        <View style={{ marginTop: S.md }}>
          <Text style={{
            fontSize: 10, fontWeight: '800', letterSpacing: 0.75,
            color: C.textTertiary, marginBottom: 8,
          }}>
            WEITERE WERKZEUGE
          </Text>
          <View style={{
            borderRadius: R.lg, borderWidth: 0.5, borderColor: C.border,
            backgroundColor: C.bgCard, overflow: 'hidden',
          }}>
            {moreItems.map((item, i) => {
              const isLast = i === moreItems.length - 1;
              const isDestructive = item.destructive;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 13,
                    paddingHorizontal: S.lg,
                    borderBottomWidth: isLast ? 0 : 0.45,
                    borderBottomColor: C.border,
                    backgroundColor: isDestructive ? `${C.danger}0D` : undefined,
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    color={isDestructive ? C.danger : C.textSecondary}
                  />
                  <Text style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '600',
                    color: isDestructive ? C.danger : C.text,
                  }}>
                    {item.label}
                  </Text>
                  {!isDestructive && (
                    <Icon name="caret-right" size={14} color={C.border} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

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
