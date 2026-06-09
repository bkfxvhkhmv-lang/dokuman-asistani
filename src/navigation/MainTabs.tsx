import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { MAIN_TABS } from '@/navigation/mainTabsConfig';
import CustomBottomTab from '@/navigation/CustomBottomTab';

export default function MainTabs() {
  const { Colors } = useTheme();
  const { t: T } = useT();

  return (
    <Tabs
      tabBar={(props) => <CustomBottomTab {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
        lazy: true,
      }}
    >
      {MAIN_TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={tab.options(Colors, T)}
        />
      ))}
    </Tabs>
  );
}
