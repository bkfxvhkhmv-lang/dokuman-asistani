import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import AppButton from '@/design/components/AppButton';

export type ActionCardAction = { label: string; onPress: () => void };

type Props = {
  title: string;
  subtitle?: string | null;
  kicker?: string;
  primaryAction?: ActionCardAction;
  secondaryAction?: ActionCardAction;
};

export default function ActionCard({
  title,
  subtitle,
  kicker = 'DEIN NÄCHSTER SCHRITT',
  primaryAction,
  secondaryAction,
}: Props) {
  const { Colors: C, S, R } = useTheme();

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.md,
        paddingVertical: S.lg - 2,
        paddingHorizontal: S.lg,
        borderRadius: R.lg,
        backgroundColor: C.bgCard,
        borderWidth: 1,
        borderColor: C.borderLight,
        gap: S.sm,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.65 }}>
        {kicker.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 19, fontWeight: '900', color: C.text }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>{subtitle}</Text>
      ) : null}

      {(primaryAction || secondaryAction) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: S.sm }}>
          {primaryAction ? (
            <View style={{ flex: 1 }}>
              <AppButton label={primaryAction.label} onPress={primaryAction.onPress} variant="primary" />
            </View>
          ) : null}
          {secondaryAction ? (
            <View style={{ flex: 1 }}>
              <AppButton label={secondaryAction.label} onPress={secondaryAction.onPress} variant="secondary" />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
