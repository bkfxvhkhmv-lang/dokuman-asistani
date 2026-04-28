import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../src/ThemeContext';
import Icon from '../../src/components/Icon';
import MainTabs from '../../src/navigation/MainTabs';

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', opacity: focused ? 1 : 0.55 }}>
      <Icon name={name} size={focused ? 24 : 22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { Colors } = useTheme();
  return <MainTabs />;
}
