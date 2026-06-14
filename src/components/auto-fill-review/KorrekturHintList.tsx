import { View, Text } from 'react-native';
import type { RadiusTokens } from '@/theme';
import type { AutoFillResult } from '@/services/SmartAutoFillService';

interface KorrekturHintListProps {
  autoFillResult: AutoFillResult;
  R: RadiusTokens;
}

export function KorrekturHintList({ autoFillResult, R }: KorrekturHintListProps) {
  const items = autoFillResult.korrekturVorschlaege ?? [];
  if (items.length === 0) return null;
  return (
    <View style={{
      backgroundColor: '#FAEEDA', borderRadius: R.lg, padding: 12,
      marginBottom: 14, borderWidth: 1, borderColor: '#EF9F27',
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#633806', marginBottom: 6 }}>
        Bitte prüfen
      </Text>
      {items.map((k, i) => (
        <Text key={i} style={{ fontSize: 12, color: '#633806', marginTop: 2 }}>
          • {k.grund}
        </Text>
      ))}
    </View>
  );
}
