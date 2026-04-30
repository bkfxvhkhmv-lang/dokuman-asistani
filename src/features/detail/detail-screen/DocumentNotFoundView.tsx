import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';

interface Props {
  onBackToOverview: () => void;
}

export function DocumentNotFoundView({ onBackToOverview }: Props) {
  const { Colors: C } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1.5,
          borderColor: `${C.primary}1A`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}>
          <View style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: C.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 36 }}>📭</Text>
          </View>
        </View>

        <Text style={{
          fontSize: 19,
          fontWeight: '700',
          color: C.text,
          textAlign: 'center',
          letterSpacing: -0.4,
          marginBottom: 8,
        }}>
          Dokument nicht gefunden
        </Text>
        <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 }}>
          Dieses Dokument wurde möglicherweise gelöscht oder verschoben.
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          backgroundColor: C.primaryLight,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${C.primary}28`,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 28,
          alignSelf: 'stretch',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 5, flexShrink: 0 }} />
          <Text style={{ flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18, fontStyle: 'italic' }}>
            Deine anderen Dokumente sind sicher. Du kannst jederzeit neue hinzufügen.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onBackToOverview}
          style={{ backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 }}
          accessibilityRole="button"
          accessibilityLabel="Zurück zur Übersicht"
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.1 }}>Zur Übersicht</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
