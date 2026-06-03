import React, { Fragment } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ActionsPanel from '@/features/detail/components/ActionsPanel';
import SmartRemindersPanel from '@/components/SmartRemindersPanel';
import PremiumToast from '@/design/components/PremiumToast';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { MoreMenuItem } from '@/features/detail/detail-modals/types';
import { useT } from '@/hooks/useT';

const ReplyAssistantDevPreview = __DEV__
  ? require('@/features/reply-assistant/components/ReplyAssistantDevPreview').default
  : null;

function inferReplyCategory(typ: string | null | undefined): string | undefined {
  if (!typ) return undefined;
  const t = typ.toLowerCase();
  if (/bußgeld|bussgeld|ordnungswidrig/.test(t)) return 'bussgeld';
  if (/jobcenter|bürgergeld/.test(t))            return 'jobcenter';
  if (/finanzamt|steuer/.test(t))                return 'finanzamt';
  if (/miete|nebenkosten|vermieter|mietvertrag/.test(t)) return 'miete';
  if (/schufa/.test(t))                          return 'schufa';
  if (/inkasso|mahnung|pfändung/.test(t))        return 'inkasso';
  return undefined;
}

type Props = {
  smartActions: any;
  smartReminders: any;
  handleSmartAction: (key: string) => void;
  detail: any;
  actionPlan: any;
  moreItems?: MoreMenuItem[];
  onTabScroll: (e: any) => void;
  onScrollContentSize: (w: number, h: number) => void;
  onScrollLayout: (e: any) => void;
  scrollBottomPadding?: number;
};

// Section definition — order and key membership decide display
const SECTIONS: { labelKey: string; keys: string[]; primaryKeys?: string[] }[] = [
  {
    labelKey: 'detail.section.share_export',
    keys: ['menu_exportieren', 'menu_vorlage', 'menu_signpdf', 'menu_partner'],
    primaryKeys: ['menu_exportieren'],
  },
  {
    labelKey: 'detail.section.edit',
    keys: ['menu_edit', 'menu_revert_sig', 'menu_budget'],
    primaryKeys: ['menu_budget'],
  },
  {
    labelKey: 'detail.section.close',
    keys: ['menu_erl', 'del'],
    primaryKeys: [],
  },
];

function SectionLabel({ label }: { label: string }) {
  const { Colors: C } = useTheme();
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700',
      color: C.textTertiary,
      marginTop: 20, marginBottom: 6, marginLeft: 2,
    }}>
      {label}
    </Text>
  );
}

interface RowProps {
  item: MoreMenuItem;
  isLast: boolean;
  isPrimary: boolean;
}

function ToolRow({ item, isLast, isPrimary }: RowProps) {
  const { Colors: C, S } = useTheme();
  const isDestructive = !!item.destructive;

  const iconColor = isDestructive
    ? C.danger
    : isPrimary
      ? C.primary
      : C.textSecondary;

  const textColor = isDestructive ? C.danger : C.text;

  return (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: isPrimary ? 15 : 13,
        paddingHorizontal: S.lg,
        borderBottomWidth: isLast ? 0 : 0.45,
        borderBottomColor: C.border,
        backgroundColor: isDestructive ? `${C.danger}0D` : undefined,
      }}
    >
      <Icon name={item.icon} size={isPrimary ? 20 : 18} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: isPrimary ? 15 : 14,
          fontWeight: isPrimary ? '700' : '600',
          color: textColor,
        }}>
          {item.label}
        </Text>
        {!!item.subtitle && !isDestructive && (
          <Text style={{ marginTop: 2, fontSize: 11, color: C.textTertiary }}>
            {item.subtitle}
          </Text>
        )}
      </View>
      {!isDestructive && (
        <Icon name="caret-right" size={14} color={C.border} />
      )}
    </TouchableOpacity>
  );
}

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
  const { Colors: C, R } = useTheme();
  const { t } = useT();

  // Filter out main-group items (shown in ActionsPanel above)
  const visibleItems = moreItems.filter(i => i.group !== 'main');

  // Assign each item to its section; uncategorised items go to a fallback bucket
  const byKey = Object.fromEntries(visibleItems.map(i => [i.key, i]));
  const assignedKeys = new Set(SECTIONS.flatMap(s => s.keys));
  const fallback = visibleItems.filter(i => !assignedKeys.has(i.key));

  const renderedSections = SECTIONS
    .map(sec => ({
      ...sec,
      items: sec.keys.map(k => byKey[k]).filter(Boolean) as MoreMenuItem[],
    }))
    .filter(sec => sec.items.length > 0);

  const hasContent = renderedSections.length > 0 || fallback.length > 0;

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
        />

        {hasContent && (
          <View style={{ marginTop: 4 }}>
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: C.textSecondary,
              marginTop: 16, marginBottom: 2, marginLeft: 2,
            }}>
              {t('detail.panel.more_actions')}
            </Text>

            {renderedSections.map(sec => (
              <View key={sec.labelKey}>
                <SectionLabel label={t(sec.labelKey)} />
                <View style={{
                  borderRadius: R.lg, borderWidth: 0.5,
                  borderColor: C.border, backgroundColor: C.bgCard,
                  overflow: 'hidden',
                }}>
                  {sec.items.map((item, i) => (
                    <ToolRow
                      key={item.key}
                      item={item}
                      isLast={i === sec.items.length - 1}
                      isPrimary={!!(sec.primaryKeys?.includes(item.key))}
                    />
                  ))}
                </View>
              </View>
            ))}

            {fallback.length > 0 && (
              <View>
                <SectionLabel label={t('detail.panel.more_actions')} />
                <View style={{
                  borderRadius: R.lg, borderWidth: 0.5,
                  borderColor: C.border, backgroundColor: C.bgCard,
                  overflow: 'hidden',
                }}>
                  {fallback.map((item, i) => (
                    <ToolRow
                      key={item.key}
                      item={item}
                      isLast={i === fallback.length - 1}
                      isPrimary={false}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {__DEV__ && ReplyAssistantDevPreview && detail?.dok?.typ && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
            <ReplyAssistantDevPreview
              category={inferReplyCategory(detail.dok.typ)}
            />
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
