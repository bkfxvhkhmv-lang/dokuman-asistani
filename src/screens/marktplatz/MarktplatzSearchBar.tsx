import { View, TextInput, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

interface Props {
  suche: string;
  setSuche: (s: string) => void;
  onSubmitSearch: () => void;
}

export function MarktplatzSearchBar({ suche, setSuche, onSubmitSearch }: Props) {
  const { Colors: C, S } = useTheme();
  return (
    <View style={{
      marginHorizontal: S.md,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bgCard,
      borderRadius: 13,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 0.5,
      borderColor: C.border,
      gap: 8,
    }}>
      <Icon name="search" size={16} color={C.textTertiary} />
      <TextInput
        style={{ flex: 1, fontSize: 14, color: C.text }}
        placeholder="Regel suchen…"
        placeholderTextColor={C.textTertiary}
        value={suche}
        onChangeText={setSuche}
        returnKeyType="search"
        onSubmitEditing={onSubmitSearch}
      />
      {suche.length > 0 && (
        <TouchableOpacity onPress={() => setSuche('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="x" size={15} color={C.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
