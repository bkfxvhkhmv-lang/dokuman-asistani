/**
 * Login / Register sekme degistirici.
 */
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { authStyles as st } from '@/features/auth/styles';

export type AuthTab = 'login' | 'register';

interface Props {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}

export default function AuthTabs({ active, onChange }: Props) {
  const { Colors: C } = useTheme();
  return (
    <View style={[st.tabs, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {(['login', 'register'] as const).map(t => (
        <TouchableOpacity
          key={t}
          style={[st.tab, active === t && { backgroundColor: C.primary }]}
          onPress={() => onChange(t)}
          activeOpacity={0.82}
        >
          <Text style={[st.tabText, { color: active === t ? '#fff' : C.textSecondary }]}>
            {t === 'login' ? 'Anmelden' : 'Registrieren'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
