import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { MarketplaceRule } from '@/services/v4Api';
import { KAT_LABELS } from '@/screens/marktplatz/constants';

interface Props {
  rule: MarketplaceRule;
  onOpenDetail: (r: MarketplaceRule) => void;
  onInstall: (r: MarketplaceRule) => void;
  onUninstall: (id: string) => void;
}

export function MarktplatzRuleCard({ rule: r, onOpenDetail, onInstall, onUninstall }: Props) {
  const { Colors: C, R, Shadow } = useTheme();
  const installed = !!r.installed;
  const avg = r.avg_rating ? r.avg_rating.toFixed(1) : null;

  return (
    <TouchableOpacity
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: R.lg,
        padding: 16,
        backgroundColor: C.bgCard,
        borderWidth: 0.5,
        borderColor: installed ? C.primary + '66' : C.border,
        ...Shadow.sm,
      }}
      onPress={() => onOpenDetail(r)}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{r.name}</Text>
          {r.author && <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>von {r.author}</Text>}
        </View>
        {installed && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: C.primaryLight }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primaryDark }}>✓ Installiert</Text>
          </View>
        )}
      </View>
      {r.description && (
        <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 8 }} numberOfLines={2}>
          {r.description}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {r.category && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{KAT_LABELS[r.category] ?? r.category}</Text>
          </View>
        )}
        {avg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="star" size={13} color="#f59e0b" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.text }}>{avg}</Text>
            {r.rating_count ? <Text style={{ fontSize: 10, color: C.textTertiary }}>({r.rating_count})</Text> : null}
          </View>
        )}
        <View style={{ flex: 1 }} />
        {r.install_count !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="download" size={11} color={C.textTertiary} />
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{r.install_count}</Text>
          </View>
        )}
        <TouchableOpacity
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: installed ? C.dangerLight : C.primary,
            borderWidth: installed ? 0.5 : 0,
            borderColor: C.dangerBorder,
          }}
          onPress={() => (installed ? onUninstall(r.id) : onInstall(r))}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: installed ? C.danger : '#fff' }}>
            {installed ? 'Entfernen' : 'Installieren'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
