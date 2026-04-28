import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../ThemeContext';
import { useMarketplace } from '../hooks/useMarketplace';
import { useSheet } from '../hooks/useSheet';
import AppBottomSheet from '../components/AppBottomSheet';
import Icon from '../components/Icon';

const KATEGORIEN = ['alle', 'financial', 'legal', 'tax', 'insurance', 'reminder', 'relation'];
const KAT_LABELS: Record<string, string> = {
  alle: 'Alle', financial: 'Finanzen', legal: 'Recht',
  tax: 'Steuer', insurance: 'Versicherung', reminder: 'Erinnerung', relation: 'Beziehung',
};
const KAT_COLORS: Record<string, string> = {
  alle: '#78909C', financial: '#4A90D9', legal: '#7B6FD4',
  tax: '#9B6BBE', insurance: '#4DA8A0', reminder: '#C49040', relation: '#C4706A',
};

export default function MarktplatzBildschirm() {
  const router = useRouter();
  const { Colors: C, S, R, Shadow } = useTheme();

  const [kategorie,      setKategorie]      = useState('alle');
  const [suche,          setSuche]          = useState('');
  const [detailRegel,    setDetailRegel]    = useState<any>(null);
  const [bewertungModal, setBewertungModal] = useState<string | null>(null);
  const [bewertungScore, setBewertungScore] = useState(5);
  const [bewertungText,  setBewertungText]  = useState('');

  const { rules: regeln, loading: laden, error: fehler, refetch, install, uninstall, rate } = useMarketplace({
    category: kategorie !== 'alle' ? kategorie : undefined,
    q: suche.trim() || undefined,
    limit: 40,
  });
  const { config: sheetConfig, showSheet, hideSheet } = useSheet();

  const handleInstall = async (regel: any) => {
    const ok = await install(regel.id);
    showSheet(ok
      ? { title: 'Installiert', message: `"${regel.name}" wurde hinzugefügt.`, icon: 'checkmark-circle', tone: 'success', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] }
      : { title: 'Fehler', message: 'Installation fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] }
    );
  };

  const handleUninstall = async (ruleId: string) => {
    const ok = await uninstall(ruleId);
    if (!ok) showSheet({ title: 'Fehler', message: 'Deinstallation fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
  };

  const handleRate = async () => {
    if (!bewertungModal) return;
    const ok = await rate(bewertungModal, bewertungScore, bewertungText.trim() || undefined);
    if (ok) {
      setBewertungModal(null); setBewertungText(''); setBewertungScore(5);
      showSheet({ title: 'Bewertet', message: 'Vielen Dank für Ihre Bewertung.', icon: 'checkmark-circle', tone: 'success', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
      refetch();
    } else {
      showSheet({ title: 'Fehler', message: 'Bewertung fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    }
  };

  const renderRegel = ({ item: r }: { item: any }) => {
    const installed = !!r.installed;
    const avg = r.avg_rating ? r.avg_rating.toFixed(1) : null;
    return (
      <TouchableOpacity
        style={{ marginHorizontal: 16, marginBottom: 10, borderRadius: R.lg, padding: 16,
          backgroundColor: C.bgCard, borderWidth: 0.5,
          borderColor: installed ? C.primary + '66' : C.border, ...Shadow.sm }}
        onPress={() => setDetailRegel(r)} activeOpacity={0.8}
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
          <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 8 }} numberOfLines={2}>{r.description}</Text>
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
              {r.rating_count && <Text style={{ fontSize: 10, color: C.textTertiary }}>({r.rating_count})</Text>}
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
            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
              backgroundColor: installed ? C.dangerLight : C.primary,
              borderWidth: installed ? 0.5 : 0, borderColor: C.dangerBorder }}
            onPress={() => installed ? handleUninstall(r.id) : handleInstall(r)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: installed ? C.danger : '#fff' }}>
              {installed ? 'Entfernen' : 'Installieren'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  function Dragger() {
    return <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, paddingTop: 4, paddingBottom: 10, gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>Regelmarkt</Text>
        <TouchableOpacity onPress={() => refetch()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="refresh" size={17} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ marginHorizontal: S.md, marginBottom: 10, flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.bgCard, borderRadius: 13, paddingHorizontal: 12, height: 44,
        borderWidth: 0.5, borderColor: C.border, gap: 8 }}>
        <Icon name="search" size={16} color={C.textTertiary} />
        <TextInput
          style={{ flex: 1, fontSize: 14, color: C.text }}
          placeholder="Regel suchen…"
          placeholderTextColor={C.textTertiary}
          value={suche}
          onChangeText={setSuche}
          returnKeyType="search"
          onSubmitEditing={() => refetch()}
        />
        {suche.length > 0 && (
          <TouchableOpacity onPress={() => setSuche('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="x" size={15} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
        contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, flexDirection: 'row' }}>
        {KATEGORIEN.map(k => {
          const kColor = KAT_COLORS[k] ?? C.primary;
          const isActive = kategorie === k;
          return (
            <TouchableOpacity key={k}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                borderColor: isActive ? kColor : `${kColor}38`,
                backgroundColor: isActive ? `${kColor}18` : `${kColor}08` }}
              onPress={() => setKategorie(k)}
            >
              <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '500',
                color: isActive ? C.text : C.textSecondary }}>
                {KAT_LABELS[k] ?? k}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {laden ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ fontSize: 13, color: C.textTertiary }}>Lädt…</Text>
        </View>
      ) : fehler ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 }}>
          <Icon name="alert-circle" size={36} color={C.danger} />
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            {fehler?.toLowerCase().includes('network') || fehler?.toLowerCase().includes('failed')
              ? 'Keine Verbindung zum Server.\nBitte Internetverbindung prüfen.'
              : fehler}
          </Text>
          <TouchableOpacity onPress={() => refetch()}
            style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 13, backgroundColor: C.primary }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={regeln}
          keyExtractor={r => r.id}
          renderItem={renderRegel}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
              <Icon name="archive" size={40} color={C.textTertiary} />
              <Text style={{ fontSize: 15, color: C.textSecondary }}>Keine Regeln gefunden</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!detailRegel} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setDetailRegel(null)} />
        {detailRegel && (
          <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' }}>
            <Dragger />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 }}>{detailRegel.name}</Text>
              {detailRegel.author && <Text style={{ fontSize: 12, color: C.textTertiary, marginBottom: 12 }}>von {detailRegel.author}</Text>}
              {detailRegel.description && (
                <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 16 }}>{detailRegel.description}</Text>
              )}
              {detailRegel.tags?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {detailRegel.tags.map((t: string) => (
                    <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
                      <Text style={{ fontSize: 11, color: C.textSecondary }}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
                {detailRegel.avg_rating && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#f59e0b' }}>{detailRegel.avg_rating.toFixed(1)}</Text>
                    <Text style={{ fontSize: 10, color: C.textTertiary }}>Bewertung</Text>
                  </View>
                )}
                {detailRegel.install_count !== undefined && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>{detailRegel.install_count}</Text>
                    <Text style={{ fontSize: 10, color: C.textTertiary }}>Installationen</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 13, padding: 14, alignItems: 'center',
                    backgroundColor: detailRegel.installed ? C.dangerLight : C.primary }}
                  onPress={() => { detailRegel.installed ? handleUninstall(detailRegel.id) : handleInstall(detailRegel); setDetailRegel(null); }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: detailRegel.installed ? C.danger : '#fff' }}>
                    {detailRegel.installed ? 'Entfernen' : 'Installieren'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 13, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.primary }}
                  onPress={() => { setBewertungModal(detailRegel.id); setDetailRegel(null); }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>Bewerten</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Rating Modal */}
      <Modal visible={!!bewertungModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setBewertungModal(null)} />
        <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Dragger />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 }}>Bewertung abgeben</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => (
              <TouchableOpacity key={n} onPress={() => setBewertungScore(n)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                <Icon name="star" size={28} color={n <= bewertungScore ? '#f59e0b' : C.border} weight={n <= bewertungScore ? 'fill' : 'regular'} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ textAlign: 'center', fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
            {bewertungScore === 5 ? 'Ausgezeichnet' : bewertungScore === 4 ? 'Gut' : bewertungScore === 3 ? 'Mittel' : bewertungScore === 2 ? 'Schlecht' : 'Sehr schlecht'}
          </Text>
          <TextInput
            style={{ borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput,
              color: C.text, fontSize: 13, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 16 }}
            placeholder="Kommentar (optional)…"
            placeholderTextColor={C.textTertiary}
            value={bewertungText}
            onChangeText={setBewertungText}
            multiline
          />
          <TouchableOpacity style={{ borderRadius: 13, padding: 14, alignItems: 'center', backgroundColor: C.primary }} onPress={handleRate}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Bewertung senden</Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
