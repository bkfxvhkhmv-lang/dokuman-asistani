import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

interface Props {
  onBack: () => void;
  onRefresh: () => void;
}

export function MarktplatzHeader({ onBack, onRefresh }: Props) {
  const { Colors: C, S } = useTheme();
  const iconBtnStyle = {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.bgCard,
    borderWidth: 0.5,
    borderColor: C.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, paddingTop: 4, paddingBottom: 10, gap: 10 }}>
      <TouchableOpacity onPress={onBack} style={iconBtnStyle}>
        <Icon name="arrow-left" size={18} color={C.text} />
      </TouchableOpacity>
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>Regelmarkt</Text>
      <TouchableOpacity onPress={onRefresh} style={iconBtnStyle}>
        <Icon name="refresh" size={17} color={C.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}
