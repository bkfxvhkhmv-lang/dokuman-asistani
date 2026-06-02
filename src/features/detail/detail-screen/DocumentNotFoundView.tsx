import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import Icon from '@/components/Icon';

interface Props {
  onBackToOverview: () => void;
}

export function DocumentNotFoundView({ onBackToOverview }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        {/* Muted icon box — EmptyState-consistent sizing */}
        <View style={{
          width: 52, height: 52, borderRadius: 14, borderWidth: 1,
          borderColor: `${C.primary}1A`, backgroundColor: `${C.primary}0D`,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Icon name="inbox" size={24} color={`${C.primary}CC`} />
        </View>

        <Text style={{
          fontSize: 16, fontWeight: '700', color: C.text,
          textAlign: 'center', letterSpacing: -0.2, marginBottom: 8,
        }}>
          {T('doc.not_found.title')}
        </Text>

        <Text style={{
          fontSize: 13, color: C.textSecondary, textAlign: 'center',
          lineHeight: 19, marginBottom: 16,
        }}>
          {T('doc.not_found.body')}
        </Text>

        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: C.primaryLight, borderRadius: 12, borderWidth: 1,
          borderColor: `${C.primary}28`, paddingHorizontal: 14, paddingVertical: 10,
          marginBottom: 24, alignSelf: 'stretch',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 5, flexShrink: 0 }} />
          <Text style={{ flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18 }}>
            {T('doc.not_found.info')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onBackToOverview}
          style={{
            backgroundColor: C.primary, paddingHorizontal: 32, paddingVertical: 14,
            borderRadius: 12,
          }}
          accessibilityRole="button"
          accessibilityLabel={T('common.overview')}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.1 }}>
            {T('common.overview')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
