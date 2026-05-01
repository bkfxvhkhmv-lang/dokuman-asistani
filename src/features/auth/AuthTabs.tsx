/**
 * Login / Register sekme degistirici.
 */
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { authStyles as st } from '@/features/auth/styles';

export type AuthTab = 'login' | 'register';

interface Props {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}

export default function AuthTabs({ active, onChange }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  return (
    <View style={[st.tabs, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {(['login', 'register'] as const).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[st.tab, active === tab && { backgroundColor: C.text }]}
          onPress={() => onChange(tab)}
          activeOpacity={0.82}
        >
          <Text style={[st.tabText, { color: active === tab ? C.bg : C.textSecondary }]}>
            {tab === 'login' ? T('auth.login') : T('auth.register')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
