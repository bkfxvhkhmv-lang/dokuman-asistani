import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { KATEGORIEN, KAT_LABELS, KAT_COLORS } from '@/screens/marktplatz/constants';

interface Props {
  kategorie: string;
  setKategorie: (k: string) => void;
}

export function MarktplatzCategoryChips({ kategorie, setKategorie }: Props) {
  const { Colors: C, S } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
      contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, flexDirection: 'row' }}>
      {KATEGORIEN.map(k => {
        const kColor = KAT_COLORS[k] ?? C.primary;
        const isActive = kategorie === k;
        return (
          <TouchableOpacity key={k}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isActive ? kColor : `${kColor}38`,
              backgroundColor: isActive ? `${kColor}18` : `${kColor}08`,
            }}
            onPress={() => setKategorie(k)}
          >
            <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '500', color: isActive ? C.text : C.textSecondary }}>
              {KAT_LABELS[k] ?? k}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
