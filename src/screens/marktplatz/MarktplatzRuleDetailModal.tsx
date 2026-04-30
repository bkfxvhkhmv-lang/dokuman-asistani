import { View, Text, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { MarketplaceRule } from '@/services/v4Api';
import { SheetDragger } from '@/screens/marktplatz/SheetDragger';

interface Props {
  rule: MarketplaceRule | null;
  onDismiss: () => void;
  onInstall: (r: MarketplaceRule) => void;
  onUninstall: (id: string) => void;
  onRate: (ruleId: string) => void;
}

export function MarktplatzRuleDetailModal({
  rule: detailRegel,
  onDismiss,
  onInstall,
  onUninstall,
  onRate,
}: Props) {
  const { Colors: C } = useTheme();

  return (
    <Modal visible={!!detailRegel} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onDismiss} />
      {detailRegel && (
        <View style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          maxHeight: '80%',
        }}>
          <SheetDragger />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 }}>{detailRegel.name}</Text>
            {detailRegel.author && (
              <Text style={{ fontSize: 12, color: C.textTertiary, marginBottom: 12 }}>von {detailRegel.author}</Text>
            )}
            {detailRegel.description && (
              <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 16 }}>
                {detailRegel.description}
              </Text>
            )}
            {detailRegel.tags != null && detailRegel.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {detailRegel.tags.map((t: string) => (
                  <View key={t} style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: C.bgInput,
                    borderWidth: 0.5,
                    borderColor: C.border,
                  }}>
                    <Text style={{ fontSize: 11, color: C.textSecondary }}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
              {detailRegel.avg_rating != null ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#f59e0b' }}>
                    {detailRegel.avg_rating.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.textTertiary }}>Bewertung</Text>
                </View>
              ) : null}
              {detailRegel.install_count !== undefined && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>{detailRegel.install_count}</Text>
                  <Text style={{ fontSize: 10, color: C.textTertiary }}>Installationen</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: 13,
                  padding: 14,
                  alignItems: 'center',
                  backgroundColor: detailRegel.installed ? C.dangerLight : C.primary,
                }}
                onPress={() => {
                  detailRegel.installed ? onUninstall(detailRegel.id) : onInstall(detailRegel);
                  onDismiss();
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: detailRegel.installed ? C.danger : '#fff' }}>
                  {detailRegel.installed ? 'Entfernen' : 'Installieren'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 13, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.primary }}
                onPress={() => {
                  onRate(detailRegel.id);
                  onDismiss();
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>Bewerten</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}
