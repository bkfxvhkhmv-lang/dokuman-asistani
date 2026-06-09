import { View } from 'react-native';
import { useTheme } from '@/ThemeContext';

export function SheetDragger() {
  const { Colors: C } = useTheme();
  return (
    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />
  );
}
