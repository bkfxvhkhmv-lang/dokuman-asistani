import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useSheet } from '@/hooks/useSheet';
import { useTheme } from '@/ThemeContext';
import type { MarketplaceRule } from '@/services/v4Api';
import { MarktplatzHeader } from '@/screens/marktplatz/MarktplatzHeader';
import { MarktplatzSearchBar } from '@/screens/marktplatz/MarktplatzSearchBar';
import { MarktplatzCategoryChips } from '@/screens/marktplatz/MarktplatzCategoryChips';
import { MarktplatzListBody } from '@/screens/marktplatz/MarktplatzListBody';
import { MarktplatzRuleDetailModal } from '@/screens/marktplatz/MarktplatzRuleDetailModal';
import { MarktplatzRatingModal } from '@/screens/marktplatz/MarktplatzRatingModal';

export default function MarktplatzBildschirmView() {
  const router = useRouter();
  const { Colors: C } = useTheme();

  const [kategorie, setKategorie] = useState('alle');
  const [suche, setSuche] = useState('');
  const [detailRegel, setDetailRegel] = useState<MarketplaceRule | null>(null);
  const [bewertungModal, setBewertungModal] = useState<string | null>(null);
  const [bewertungScore, setBewertungScore] = useState(5);
  const [bewertungText, setBewertungText] = useState('');

  const {
    rules: regeln,
    loading: laden,
    error: fehler,
    refetch,
    install,
    uninstall,
    rate,
  } = useMarketplace({
    category: kategorie !== 'alle' ? kategorie : undefined,
    q: suche.trim() || undefined,
    limit: 40,
  });

  const { config: sheetConfig, showSheet, hideSheet } = useSheet();

  const handleInstall = useCallback(async (regel: MarketplaceRule) => {
    const ok = await install(regel.id);
    showSheet(ok
      ? { title: 'Installiert', message: `"${regel.name}" wurde hinzugefügt.`, icon: 'checkmark-circle', tone: 'success', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] }
      : { title: 'Fehler', message: 'Installation fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] }
    );
  }, [install, showSheet, hideSheet]);

  const handleUninstall = useCallback(async (ruleId: string) => {
    const ok = await uninstall(ruleId);
    if (!ok) {
      showSheet({ title: 'Fehler', message: 'Deinstallation fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    }
  }, [uninstall, showSheet, hideSheet]);

  const handleRate = useCallback(async () => {
    if (!bewertungModal) return;
    const ok = await rate(bewertungModal, bewertungScore, bewertungText.trim() || undefined);
    if (ok) {
      setBewertungModal(null);
      setBewertungText('');
      setBewertungScore(5);
      showSheet({
        title: 'Bewertet',
        message: 'Vielen Dank für Ihre Bewertung.',
        icon: 'checkmark-circle',
        tone: 'success',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
      refetch();
    } else {
      showSheet({
        title: 'Fehler',
        message: 'Bewertung fehlgeschlagen.',
        icon: 'alert-circle',
        tone: 'danger',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
    }
  }, [bewertungModal, bewertungScore, bewertungText, rate, showSheet, hideSheet, refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      <MarktplatzHeader onBack={() => safeBack(router)} onRefresh={() => void refetch()} />

      <MarktplatzSearchBar
        suche={suche}
        setSuche={setSuche}
        onSubmitSearch={() => void refetch()}
      />

      <MarktplatzCategoryChips kategorie={kategorie} setKategorie={setKategorie} />

      <MarktplatzListBody
        laden={laden}
        fehler={fehler}
        regeln={regeln}
        onRefetch={() => void refetch()}
        onRulePress={setDetailRegel}
        onInstall={r => void handleInstall(r)}
        onUninstall={id => void handleUninstall(id)}
      />

      <MarktplatzRuleDetailModal
        rule={detailRegel}
        onDismiss={() => setDetailRegel(null)}
        onInstall={r => void handleInstall(r)}
        onUninstall={id => void handleUninstall(id)}
        onRate={(id) => { setBewertungModal(id); setDetailRegel(null); }}
      />

      <MarktplatzRatingModal
        visible={!!bewertungModal}
        onDismiss={() => setBewertungModal(null)}
        score={bewertungScore}
        setScore={setBewertungScore}
        text={bewertungText}
        setText={setBewertungText}
        onSubmit={() => void handleRate()}
      />

      <AppBottomSheet
        visible={!!sheetConfig}
        onClose={hideSheet}
        title={sheetConfig?.title ?? ''}
        message={sheetConfig?.message}
        icon={sheetConfig?.icon ?? 'information-circle'}
        tone={sheetConfig?.tone ?? 'default'}
        actions={sheetConfig?.actions ?? [{ label: 'OK', variant: 'primary', onPress: hideSheet }]}
      />
    </SafeAreaView>
  );
}
