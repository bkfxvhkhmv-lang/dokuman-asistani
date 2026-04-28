import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../ThemeContext';
import { MAIN_TABS } from './mainTabsConfig';
import CustomBottomTab from './CustomBottomTab';

export default function MainTabs() {
  const { Colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomBottomTab {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
      }}
    >
      {MAIN_TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={tab.options(Colors)}
        />
      ))}
    </Tabs>
  );
}
