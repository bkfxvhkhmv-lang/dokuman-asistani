import React from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { deriveNaechsterSchrittSatz } from '@/utils/detailNextStep';

interface Props {
  dok: Dokument;
  actionPlan: ActionPlan | null;
}

export default function NaechsterSchrittCard({ dok, actionPlan }: Props) {
  const { Colors: C, S, R } = useTheme();
  const satz = deriveNaechsterSchrittSatz(dok, actionPlan);
  if (!satz) return null;

  const isOverdue = !!(dok.frist && (() => {
    const t = Math.ceil((new Date(dok.frist!).getTime() - Date.now()) / 86_400_000);
    return t < 0;
  })());
  const isLowConf = (dok.confidence ?? 1) < 0.55;

  const tone = isOverdue || isLowConf ? 'warning' : 'primary';
  const bg     = tone === 'warning' ? C.warningLight : C.primaryLight;
  const border = tone === 'warning' ? C.warningBorder : `${C.primary}44`;
  const iconColor = tone === 'warning' ? C.warning : C.primary;
  const iconName  = isLowConf ? 'warning' : isOverdue ? 'clock' : 'arrow-right-circle';

  return (
    <View style={{
      marginHorizontal: S.md,
      marginBottom: S.md,
      borderRadius: R.md,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: bg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: S.lg,
      paddingVertical: 12,
    }}>
      <Icon name={iconName} size={18} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: iconColor, letterSpacing: 0.6, marginBottom: 3 }}>
          NÄCHSTER SCHRITT
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 }}>
          {satz}
        </Text>
      </View>
    </View>
  );
}
