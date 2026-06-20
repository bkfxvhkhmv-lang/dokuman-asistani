import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { renderAccordionContentWhenOpen } from '@/features/detail/components/details-panel/lazyAccordionContent';

interface Props {
  title: string;
  testID?: string;
  contentTestID?: string;
  children: React.ReactNode | (() => React.ReactNode);
}

/** Collapsed by default; children mount only while open (no display:none hiding). */
export function WeitereAktionenAccordion({
  title,
  testID = 'detail-weitere-aktionen-toggle',
  contentTestID = 'detail-weitere-aktionen-content',
  children,
}: Props) {
  const { Colors: C, S, R } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View
      style={{
        marginTop: S.lg,
        marginBottom: S.md,
        borderRadius: R.lg,
        backgroundColor: C.bgCard,
        borderWidth: 0.5,
        borderColor: C.border,
      }}
    >
      <TouchableOpacity
        testID={testID}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: S.lg,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSecondary }}>{title}</Text>
        <Icon name={open ? 'caret-up' : 'caret-down'} size={14} color={C.textTertiary} />
      </TouchableOpacity>
      {renderAccordionContentWhenOpen(open, () => (
        <View testID={contentTestID} style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
          {typeof children === 'function' ? children() : children}
        </View>
      ))}
    </View>
  );
}
