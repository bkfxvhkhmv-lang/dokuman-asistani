import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

interface Props {
  onPress: () => void;
  disabled?: boolean;
}

export default function UnanalysedDocumentCard({ onPress, disabled = false }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t } = useT();

  return (
    <View style={{
      marginHorizontal: S.md,
      marginBottom: S.md,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: C.borderLight,
      backgroundColor: C.bgCard,
      paddingHorizontal: S.lg,
      paddingVertical: 20,
    }}>
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${C.primary}1A`,
        backgroundColor: `${C.primary}0D`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon name="sparkle" size={22} color={`${C.primary}CC`} />
      </View>

      <Text style={{
        fontSize: 17,
        fontWeight: '700',
        color: C.text,
        letterSpacing: -0.2,
        marginBottom: 8,
      }}>
        {t('detail.unanalysed.title')}
      </Text>

      <Text style={{
        fontSize: 14,
        color: C.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
      }}>
        {t('detail.unanalysed.body')}
      </Text>

      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('detail.unanalysed.cta')}
        style={{
          backgroundColor: C.primary,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {t('detail.unanalysed.cta')}
        </Text>
      </TouchableOpacity>

      <Text style={{
        marginTop: 10,
        fontSize: 12,
        color: C.textTertiary,
        textAlign: 'center',
      }}>
        {t('detail.unanalysed.cta_sub')}
      </Text>
    </View>
  );
}
