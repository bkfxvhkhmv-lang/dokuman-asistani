import React, { useCallback, useRef } from 'react';
import EmptyState from '../components/EmptyState';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppInput } from '../design/components';
import { useStore } from '../store';
import { useTheme, type ThemeColors } from '../ThemeContext';
import DokumentKarte from '../components/DokumentKarte';
import Icon from '../components/Icon';
import { useSearchState } from '../features/search/useSearchState';
import { useSmartSearch } from '../hooks/useSmartSearch';
import type { Dokument } from '../store';

const SCHNELLSUCHE = [
  { label: 'Überfällig',   query: 'überfällig' },
  { label: 'Diese Woche',  query: 'diese Woche' },
  { label: 'Dringend',     query: 'dringend' },
  { label: 'Rechnung',     query: 'Rechnung' },
  { label: 'Mahnung',      query: 'Mahnung' },
  { label: 'Finanzamt',    query: 'Finanzamt' },
  { label: 'Bußgeld',      query: 'Bußgeld' },
  { label: 'Versicherung', query: 'Versicherung' },
  { label: 'Über 100 €',   query: 'über 100€' },
];

const TYPEN   = ['alle','Rechnung','Mahnung','Bußgeld','Behörde','Steuerbescheid','Termin','Versicherung','Vertrag','Sonstiges'];
const RISIKEN = ['alle', 'hoch', 'mittel', 'niedrig'];
const MAX_VERLAUF = 8;

const CHIP_SPRING = { damping: 14, stiffness: 420, mass: 0.55, useNativeDriver: true };

function SpringChip({ onPress, style, children }: { onPress: () => void; style?: import('react-native').ViewStyle; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      onPressIn={() => Animated.spring(scale, { toValue: 0.90, ...CHIP_SPRING }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, ...CHIP_SPRING }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={1}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

interface HighlightProps {
  text?: string;
  query?: string;
  color: string;
  secondaryColor: string;
}

function Highlight({ text = '', query = '', color, secondaryColor }: HighlightProps) {
  if (!query.trim() || !text) return <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>{text}</Text>;
  const words = query.trim().split(/\s+/).filter(w => w.length > 2).slice(0, 10);
  if (words.length === 0) return <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>{text}</Text>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const testRegex = new RegExp(`^(${escaped})$`, 'i');
  return (
    <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>
      {parts.map((p, i) =>
        testRegex.test(p)
          ? <Text key={i} style={{ backgroundColor: color + '33', color, fontWeight: '700' }}>{p}</Text>
          : p
      )}
    </Text>
  );
}

interface SemanticResult {
  doc_id?: string;
  score?: number;
  title?: string;
  filename?: string;
  snippet?: string;
  doc_type?: string;
  created_at?: string;
}

interface SemanticKarteProps {
  result: SemanticResult;
  query: string;
  onPress: () => void;
  C: ThemeColors;
}

function SemanticKarte({ result, query, onPress, C }: SemanticKarteProps) {
  const score = result.score ?? 0;
  const scoreColor = score >= 0.7 ? C.success : score >= 0.4 ? C.warning : C.textTertiary;
  return (
    <TouchableOpacity
      style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
        backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border }}
      onPress={onPress} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }} numberOfLines={1}>
            {result.title || result.filename || result.doc_id}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
          backgroundColor: scoreColor + '22', borderWidth: 0.5, borderColor: scoreColor }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: scoreColor }}>{(score * 100).toFixed(0)}%</Text>
        </View>
      </View>
      {result.snippet && (
        <Highlight text={result.snippet} query={query} color={C.primary} secondaryColor={C.textSecondary} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {result.doc_type && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: C.primaryLight }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.primaryDark }}>{result.doc_type}</Text>
          </View>
        )}
        {result.created_at && (
          <Text style={{ fontSize: 10, color: C.textTertiary }}>
            {new Date(result.created_at).toLocaleDateString('de-DE')}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 10, color: C.textTertiary }}>V4 Semantik</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Suchbildschirm() {
  const router = useRouter();
  const { state } = useStore();
  const { Colors, S } = useTheme();
  const C = Colors;

  const {
    query, filterOffen, setFilterOffen,
    minBetrag, setMinBetrag, maxBetrag, setMaxBetrag,
    vonDatum, setVonDatum, bisDatum, setBisDatum,
    typ, setTyp, risiko, setRisiko,
    mitErledigt, setMitErledigt,
    suchVerlauf, setSuchVerlauf,
    v4Modus, ftsWeight, setFtsWeight,
    filterAktiv, parsedHint, lokal, zeigeSuche,
    v4Ergebnisse, v4Laden, v4Fehler,
    handleSearch, handleSubmit, toggleV4, resetFilter,
    clearV4,
  } = useSearchState(state.dokumente);

  const smartSearch = useSmartSearch(state.dokumente);

  const handleSearchWithSmart = useCallback((text: string) => {
    handleSearch(text);
    smartSearch.search(text);
  }, [handleSearch, smartSearch.search]);

  // Use smart-ordered docs when no special filters are active
  const displayDocs: Dokument[] = !v4Modus && zeigeSuche && !filterAktiv && smartSearch.mergedResults.length > 0
    ? smartSearch.mergedResults.map(r => r.dok)
    : lokal;

  const renderLokal = useCallback(({ item }: { item: Dokument }) => (
    <DokumentKarte dok={item} onPress={() => router.push({ pathname: '/detail', params: { dokId: item.id } })} onLongPress={() => {}} secilen={false} />
  ), [router]);

  const renderV4 = useCallback(({ item }: { item: SemanticResult }) => (
    <SemanticKarte result={item} query={query} C={C}
      onPress={() => {
        const local = state.dokumente.find((d: Dokument) => d.v4DocId === item.doc_id);
        if (local) router.push({ pathname: '/detail', params: { dokId: local.id } });
      }}
    />
  ), [query, C, state.dokumente, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Search bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: S.md, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppInput
            variant="search"
            placeholder='z. B. "überfällig", "über 100€", "Finanzamt"'
            value={query}
            onChangeText={handleSearchWithSmart}
            onClear={() => { handleSearchWithSmart(''); clearV4(); smartSearch.clearSearch(); }}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
        </View>
        <TouchableOpacity
          style={{ height: 44, paddingHorizontal: 12, borderRadius: 13, borderWidth: 0.5,
            borderColor: v4Modus ? C.primary : C.border,
            backgroundColor: v4Modus ? C.primaryLight : C.bgCard,
            alignItems: 'center', justifyContent: 'center' }}
          onPress={toggleV4}>
          <Icon name="bulb" size={16} color={v4Modus ? C.primaryDark : C.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterOffen(true)}
          style={{ width: 44, height: 44, borderRadius: 13, borderWidth: 0.5,
            borderColor: filterAktiv ? C.primary : C.border,
            backgroundColor: filterAktiv ? C.primaryLight : C.bgCard,
            alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="funnel" size={17} color={filterAktiv ? C.primaryDark : C.textTertiary} />
          {filterAktiv && <View style={{ position: 'absolute', top: 8, right: 8,
            width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary }} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: C.primary, fontWeight: '500' }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>

      {v4Modus && (
        <View style={{ marginHorizontal: S.md, marginBottom: 6, borderRadius: 10, padding: 10,
          backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary + '44',
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: C.primaryDark }}> Semantische Suche aktiv (V4)</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([['Text', 0.7], ['Mix', 0.5], ['Semantik', 0.3]] as [string, number][]).map(([label, val]) => (
              <TouchableOpacity key={label} onPress={() => setFtsWeight(val)}
                style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                  backgroundColor: ftsWeight === val ? C.primary : 'transparent' }}>
                <Text style={{ fontSize: 10, color: ftsWeight === val ? '#fff' : C.primaryDark, fontWeight: '600' }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!v4Modus && parsedHint && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: S.md, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>Erkannt:</Text>
            {parsedHint.map((h, i) => (
              <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.primaryLight, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.primaryDark }}>{h}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {!v4Modus && zeigeSuche && smartSearch.intent !== 'freitext' && (
        <View style={{ marginHorizontal: S.md, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.primaryLight, borderRadius: 999, borderWidth: 1, borderColor: C.primary + '44' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="sparkle" size={10} color={C.primaryDark} weight="fill" />
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.primaryDark }}>{smartSearch.intentLabel}</Text>
            </View>
          </View>
          {smartSearch.processingMs > 0 && (
            <Text style={{ fontSize: 9, color: C.textTertiary }}>{smartSearch.processingMs}ms</Text>
          )}
        </View>
      )}

      {!v4Modus && smartSearch.correctionHint && (
        <TouchableOpacity
          onPress={() => handleSearchWithSmart(smartSearch.correctionHint!)}
          style={{ marginHorizontal: S.md, marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: C.primary }}>
            Meinten Sie: <Text style={{ fontWeight: '700' }}>{smartSearch.correctionHint}</Text>?
          </Text>
        </TouchableOpacity>
      )}

      {v4Fehler && (
        <View style={{ marginHorizontal: S.md, marginBottom: 6, borderRadius: 10, padding: 8,
          backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="warning-circle" size={13} color={C.warningText} />
            <Text style={{ fontSize: 11, color: C.warningText }}>{v4Fehler}</Text>
          </View>
        </View>
      )}

      {!zeigeSuche ? (
        <ScrollView contentContainerStyle={{ padding: S.lg }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8, marginBottom: S.md }}>SCHNELLSUCHE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: S.xl }}>
            {SCHNELLSUCHE.map(t => (
              <SpringChip key={t.query}
                onPress={() => handleSearch(t.query)}
                style={{ paddingVertical: 7, paddingHorizontal: S.md, backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 13, color: C.text }}>{t.label}</Text>
              </SpringChip>
            ))}
          </View>
          {suchVerlauf.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8 }}>ZULETZT GESUCHT</Text>
                <TouchableOpacity onPress={() => setSuchVerlauf([])}><Text style={{ fontSize: 11, color: C.danger }}>Löschen</Text></TouchableOpacity>
              </View>
              {suchVerlauf.map((s, i) => (
                <TouchableOpacity key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border }}
                  onPress={() => handleSearch(s)}>
                  <Icon name="clock" size={15} color={C.textTertiary} />
                  <Text style={{ fontSize: 14, color: C.text, flex: 1 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
          {(state.einstellungen.etikettenVerlauf || []).length > 0 && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8, marginTop: S.xl, marginBottom: S.md }}>NACH ETIKETT SUCHEN</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(state.einstellungen.etikettenVerlauf || []).slice(0, 10).map(e => (
                  <TouchableOpacity key={e}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 0.5, borderColor: C.border }}
                    onPress={() => handleSearch(e)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icon name="tag" size={11} color={C.textSecondary} />
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>{e}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : v4Modus ? (
        <FlatList
          data={v4Ergebnisse as SemanticResult[]}
          keyExtractor={(r, i) => r.doc_id ?? String(i)}
          contentContainerStyle={{ paddingTop: S.sm, paddingBottom: 40 }}
          ListHeaderComponent={v4Laden
            ? <View style={{ alignItems: 'center', paddingVertical: 24 }}><ActivityIndicator color={C.primary} /><Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 8 }}>Semantische Suche läuft…</Text></View>
            : <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8, marginLeft: S.lg, marginBottom: 8 }}>{(v4Ergebnisse as SemanticResult[]).length} SEMANTISCHE TREFFER</Text>
          }
          ListEmptyComponent={!v4Laden ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Icon name="bulb" size={36} color={C.text} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 15, color: C.textSecondary }}>Keine semantischen Treffer</Text>
              {query.length > 0 && <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginTop: 4 }}>"{query}"</Text>}
            </View>
          ) : null}
          renderItem={renderV4}
        />
      ) : (
        <FlatList
          data={displayDocs}
          keyExtractor={d => d.id}
          contentContainerStyle={{ paddingTop: S.sm, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8, marginLeft: S.lg, marginBottom: 8 }}>
              {displayDocs.length} ERGEBNIS{displayDocs.length !== 1 ? 'SE' : ''}{mitErledigt ? ' (inkl. Erledigt)' : ''}
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              variant="search"
              subtitle={smartSearch.correctionHint
                ? `Meinten Sie "${smartSearch.correctionHint}"?`
                : 'Versuchen Sie andere Suchbegriffe oder aktivieren Sie die semantische Suche.'}
              action={smartSearch.correctionHint
                ? { label: `„${smartSearch.correctionHint}" suchen`, onPress: () => handleSearchWithSmart(smartSearch.correctionHint!) }
                : { label: 'Semantische Suche', onPress: toggleV4 }
              }
            />
          }
          renderItem={renderLokal}
        />
      )}

      <Modal visible={filterOffen} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setFilterOffen(false)} />
        <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 20 }}>Erweiterte Suche</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>BETRAG (€)</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <View style={{ flex: 1 }}><AppInput label="Von (€)" placeholder="z. B. 50" value={minBetrag} onChangeText={setMinBetrag} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><AppInput label="Bis (€)" placeholder="z. B. 500" value={maxBetrag} onChangeText={setMaxBetrag} keyboardType="numeric" /></View>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>ZEITRAUM</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <View style={{ flex: 1 }}><AppInput label="Von" placeholder="2024-01-01" value={vonDatum} onChangeText={setVonDatum} /></View>
            <View style={{ flex: 1 }}><AppInput label="Bis" placeholder="2024-12-31" value={bisDatum} onChangeText={setBisDatum} /></View>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>DOKUMENTTYP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TYPEN.map(t => (
                <SpringChip key={t}
                  onPress={() => setTyp(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                    borderColor: typ === t ? C.primary : C.border, backgroundColor: typ === t ? C.primaryLight : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: typ === t ? '700' : '400', color: typ === t ? C.primaryDark : C.textSecondary }}>{t === 'alle' ? 'Alle' : t}</Text>
                </SpringChip>
              ))}
            </View>
          </ScrollView>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>RISIKOLEVEL</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {RISIKEN.map(r => {
              const rColor = r === 'hoch' ? '#e53935' : r === 'mittel' ? '#f57c00' : r === 'niedrig' ? '#2e7d32' : C.primary;
              const isActive = risiko === r;
              return (
                <SpringChip key={r}
                  onPress={() => setRisiko(r)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
                    borderColor: isActive ? rColor : C.border, backgroundColor: isActive ? rColor + '22' : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: isActive ? '700' : '400', color: isActive ? rColor : C.textSecondary }}>
                    {r === 'alle' ? 'Alle' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </SpringChip>
              );
            })}
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
              borderTopWidth: 0.5, borderTopColor: C.border, marginBottom: 20 }}
            onPress={() => setMitErledigt(v => !v)}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
              borderColor: mitErledigt ? C.primary : C.border,
              backgroundColor: mitErledigt ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {mitErledigt && <Icon name="check" size={13} color="#fff" weight="bold" />}
            </View>
            <Text style={{ fontSize: 14, color: C.text }}>Erledigte Dokumente einschließen</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.danger }} onPress={resetFilter}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.danger }}>Zurücksetzen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 2, borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: C.primary }} onPress={() => setFilterOffen(false)}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Anwenden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
