import { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { MarketplaceRule } from '@/services/v4Api';
import { MarktplatzRuleCard } from '@/screens/marktplatz/MarktplatzRuleCard';

function SkeletonCard() {
  const { Colors: C, R } = useTheme();
  const bone = C.borderLight;
  return (
    <View style={{ backgroundColor: C.bgCard, borderRadius: R.lg, padding: 16, marginHorizontal: 16, marginBottom: 10, gap: 10 }}>
      <View style={{ height: 15, width: '55%', backgroundColor: bone, borderRadius: 4 }} />
      <View style={{ height: 12, width: '80%', backgroundColor: bone, borderRadius: 4 }} />
      <View style={{ height: 12, width: '65%', backgroundColor: bone, borderRadius: 4 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <View style={{ height: 24, width: 60, backgroundColor: bone, borderRadius: 12 }} />
        <View style={{ height: 32, width: 88, backgroundColor: bone, borderRadius: 10, marginLeft: 'auto' }} />
      </View>
    </View>
  );
}

function SkeletonRules() {
  return (
    <View style={{ paddingTop: 4 }}>
      {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </View>
  );
}

function ErrorCenter({ onRetry }: { onRetry: () => void }) {
  const { Colors: C } = useTheme();
  const [retrying, setRetrying] = useState(false);
  const handleRetry = () => {
    setRetrying(true);
    onRetry();
    setTimeout(() => setRetrying(false), 1500);
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
      <Icon name="alert-circle" size={36} color={C.textTertiary} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' }}>
        Verbindung fehlgeschlagen
      </Text>
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
        Die Regeln konnten gerade nicht geladen werden. Bitte versuche es erneut.
      </Text>
      <TouchableOpacity
        onPress={handleRetry}
        disabled={retrying}
        style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 13, backgroundColor: retrying ? C.bgInput : C.primary }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: retrying ? C.textSecondary : '#fff' }}>
          {retrying ? 'Lädt…' : 'Erneut versuchen'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyRules() {
  const { Colors: C } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 12 }}>
      <Icon name="archive" size={40} color={C.textTertiary} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: C.textSecondary, textAlign: 'center' }}>
        Keine Regeln gefunden
      </Text>
      <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center', lineHeight: 19 }}>
        Wähle eine andere Kategorie oder versuche es später erneut.
      </Text>
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

  if (laden) return <SkeletonRules />;

  if (fehler) {
    if (isMarketplaceDataMissingError(fehler)) {
      return <MarketplaceEndpointEmpty onReload={onRefetch} />;
    }
    return <ErrorCenter onRetry={onRefetch} />;
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
