import { FlatList, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { MarketplaceRule } from '@/services/v4Api';
import { MarktplatzRuleCard } from '@/screens/marktplatz/MarktplatzRuleCard';

function LoadingCenter() {
  const { Colors: C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ fontSize: 13, color: C.textTertiary }}>Lädt…</Text>
    </View>
  );
}

function ErrorCenter({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { Colors: C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
      <Icon name="alert-circle" size={36} color={C.danger} />
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
      <TouchableOpacity onPress={onRetry}
        style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 13, backgroundColor: C.primary }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyRules() {
  const { Colors: C } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
      <Icon name="archive" size={40} color={C.textTertiary} />
      <Text style={{ fontSize: 15, color: C.textSecondary }}>Keine Regeln gefunden</Text>
    </View>
  );
}

/** Regelmarkt-API oft noch nicht ausgerollt — kein gefährlicher Offline-Fallback auf 404 */
function isMarketplaceDataMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return /\b404\b/.test(m)
    || m.includes('not found')
    || m.includes('nicht gefunden');
}

function MarketplaceEndpointEmpty({ onReload }: { onReload: () => void }) {
  const { Colors: C, R } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
      <Icon name="storefront" size={42} color={C.textTertiary} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' }}>
        Regelmarkt: noch keine Daten
      </Text>
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
        Der Server liefert derzeit keine Regeln (Endpunkt fehlt noch). Sobald Daten verfügbar sind,
        erscheinen diese hier — das ist kein WLAN-Problem.
      </Text>
      <TouchableOpacity onPress={onReload}
        style={{ marginTop: 6, paddingHorizontal: 22, paddingVertical: 11, borderRadius: R.lg,
          borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.primaryDark }}>Aktualisieren</Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  laden: boolean;
  fehler: string | null;
  regeln: MarketplaceRule[];
  onRefetch: () => void;
  onRulePress: (r: MarketplaceRule) => void;
  onInstall: (r: MarketplaceRule) => void;
  onUninstall: (id: string) => void;
}

export function MarktplatzListBody(props: Props) {
  const { laden, fehler, regeln, onRefetch, onRulePress, onInstall, onUninstall } = props;

  if (laden) return <LoadingCenter />;

  if (fehler) {
    if (isMarketplaceDataMissingError(fehler)) {
      return <MarketplaceEndpointEmpty onReload={onRefetch} />;
    }
    const errText =
      typeof fehler === 'string' &&
      (fehler.toLowerCase().includes('network') || fehler.toLowerCase().includes('failed'))
        ? 'Keine Verbindung zum Server.\nBitte Internetverbindung prüfen.'
        : String(fehler);
    return <ErrorCenter message={errText} onRetry={onRefetch} />;
  }

  return (
    <FlatList
      data={regeln}
      keyExtractor={r => r.id}
      renderItem={({ item }) => (
        <MarktplatzRuleCard
          rule={item}
          onOpenDetail={onRulePress}
          onInstall={onInstall}
          onUninstall={onUninstall}
        />
      )}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
      ListEmptyComponent={<EmptyRules />}
    />
  );
}
