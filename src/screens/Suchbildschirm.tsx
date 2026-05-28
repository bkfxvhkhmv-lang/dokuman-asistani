/**
 * Suchbildschirm — Arama ekranı orkestratörü.
 *
 * Bu dosya yalnızca state akışını ve callback'leri yönetir; gorsel
 * parcalari `src/features/search/components/` altindaki ozel
 * bilesenlere devreder:
 *
 *  - SearchHeader        — input + V4 toggle + filtre butonu + iptal
 *  - V4Banner            — semantik mod aktif banner'i
 *  - SearchHints         — parsed hints, intent, correction, error
 *  - SearchHomeView      — sorgusuz halde gosterilen sayfa
 *  - SemanticKarte       — V4 sonuc karti
 *  - SearchFilterModal   — gelismis filtre paneli
 *
 * Eski monolithic versiyon 439 satir tek dosyaydi; modulerlestirme
 * sonrasi her bilesen test edilebilir hale geldi.
 */
import React, { useCallback } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useStore } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useSearchState } from '@features/search/useSearchState';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import DokumentKarte from '@/components/DokumentKarte';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';

import SearchHeader      from '@features/search/components/SearchHeader';
import SearchCategoryChips from '@features/search/components/SearchCategoryChips';
import SearchHomeView    from '@features/search/components/SearchHomeView';
import SearchFilterModal from '@features/search/components/SearchFilterModal';
import SemanticKarte     from '@features/search/components/SemanticKarte';
import {
  V4Banner, ParsedHints, IntentBadge, CorrectionHint, V4Error,
} from '@features/search/components/SearchHints';
import type { SemanticResult } from '@features/search/components/constants';

export default function Suchbildschirm() {
  const router = useRouter();
  const { state } = useStore();
  const { Colors: C, S } = useTheme();

  const {
    query, filterOffen, setFilterOffen,
    minBetrag, setMinBetrag, maxBetrag, setMaxBetrag,
    vonDatum, setVonDatum, bisDatum, setBisDatum,
    typ, setTyp, handleTyp, risiko, setRisiko,
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

  // V4 modu ve filtre aktif degilse smart-ordered docs goster
  const displayDocs: Dokument[] =
    !v4Modus && zeigeSuche && !filterAktiv && smartSearch.mergedResults.length > 0
      ? smartSearch.mergedResults.map(r => r.dok)
      : lokal;

  const renderLokal = useCallback(({ item, index }: { item: Dokument; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 45, 300)).springify().damping(18)}>
      <DokumentKarte
        dok={item}
        onPress={() => router.push({ pathname: '/detail', params: { dokId: item.id } })}
        onLongPress={() => {}}
        secilen={false}
      />
    </Animated.View>
  ), [router]);

  const renderV4 = useCallback(({ item }: { item: SemanticResult }) => (
    <SemanticKarte
      result={item}
      query={query}
      C={C}
      onPress={() => {
        const local = state.dokumente.find((d: Dokument) => d.v4DocId === item.doc_id);
        if (local) router.push({ pathname: '/detail', params: { dokId: local.id } });
      }}
    />
  ), [query, C, state.dokumente, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <SearchHeader
          query={query}
          onChange={handleSearchWithSmart}
          onClear={() => {
            handleSearchWithSmart('');
            clearV4();
            smartSearch.clearSearch();
          }}
          onSubmit={handleSubmit}
          v4Modus={v4Modus}
          filterAktiv={filterAktiv}
          onToggleV4={toggleV4}
          onOpenFilter={() => setFilterOffen(true)}
          onCancel={() => router.back()}
          C={C}
          S={S}
        />
        {!v4Modus ? <SearchCategoryChips typ={typ} onTyp={handleTyp} C={C} S={S} /> : null}

        {/* Banner / hint katmanlari */}
        {v4Modus && (
          <V4Banner ftsWeight={ftsWeight} setFtsWeight={setFtsWeight} C={C} S={S} />
        )}
        {!v4Modus && parsedHint && (
          <ParsedHints hints={parsedHint} C={C} S={S} />
        )}
        {!v4Modus && zeigeSuche && smartSearch.intent !== 'freitext' && (
          <IntentBadge label={smartSearch.intentLabel} processingMs={smartSearch.processingMs} C={C} S={S} />
        )}
        {!v4Modus && smartSearch.correctionHint && (
          <CorrectionHint
            hint={smartSearch.correctionHint}
            onApply={() => handleSearchWithSmart(smartSearch.correctionHint!)}
            C={C} S={S}
          />
        )}
        {v4Fehler && <V4Error error={v4Fehler} C={C} S={S} />}

        {/* Ana icerik — uc state: home, v4 list, lokal list */}
        {!zeigeSuche ? (
          <SearchHomeView
            suchVerlauf={suchVerlauf}
            setSuchVerlauf={setSuchVerlauf}
            etikettenVerlauf={state.einstellungen.etikettenVerlauf || []}
            onSearch={handleSearch}
            C={C}
            S={S}
          />
        ) : v4Modus ? (
          <FlatList
            data={v4Ergebnisse as SemanticResult[]}
            keyExtractor={(r, i) => r.doc_id ?? String(i)}
            contentContainerStyle={{ paddingTop: S.sm, paddingBottom: 40 }}
            ListHeaderComponent={
              v4Laden ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator color={C.primary} />
                  <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 8 }}>
                    Intelligente Suche läuft…
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    fontSize: 10, fontWeight: '600',
                    color: C.textTertiary, letterSpacing: 0.8,
                    marginLeft: S.lg, marginBottom: 8,
                  }}
                >
                  {(v4Ergebnisse as SemanticResult[]).length} INTELLIGENTE TREFFER
                </Text>
              )
            }
            ListEmptyComponent={!v4Laden ? (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Icon name="bulb" size={36} color={C.text} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 15, color: C.textSecondary }}>Keine Treffer</Text>
                {query.length > 0 && (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, marginTop: 4 }}>
                    "{query}"
                  </Text>
                )}
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
              <Text
                style={{
                  fontSize: 10, fontWeight: '600',
                  color: C.textTertiary, letterSpacing: 0.8,
                  marginLeft: S.lg, marginBottom: 8,
                }}
              >
                {displayDocs.length} ERGEBNIS{displayDocs.length !== 1 ? 'SE' : ''}
                {mitErledigt ? ' (inkl. Erledigt)' : ''}
              </Text>
            }
            ListEmptyComponent={
              <View>
                <EmptyState
                  variant="search"
                  title="Keine Treffer"
                  subtitle={
                    smartSearch.correctionHint
                      ? `Meinten Sie "${smartSearch.correctionHint}"?`
                      : 'Passe die Suche an oder nutze einen Schnellfilter.'
                  }
                  action={
                    smartSearch.correctionHint
                      ? { label: `„${smartSearch.correctionHint}" suchen`, onPress: () => handleSearchWithSmart(smartSearch.correctionHint!) }
                      : { label: 'Filter zurücksetzen', onPress: resetFilter }
                  }
                />
                {/* Schnelle Vorschläge — nur wenn kein Korrekturhinweis */}
                {!smartSearch.correctionHint && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, paddingHorizontal: S.lg }}>
                    {['Rechnung', 'Finanzamt', 'Mahnung', 'Versicherung'].map(vorschlag => (
                      <TouchableOpacity
                        key={vorschlag}
                        onPress={() => handleSearchWithSmart(vorschlag)}
                        style={{
                          paddingVertical: 7,
                          paddingHorizontal: S.md,
                          backgroundColor: C.bgCard,
                          borderRadius: 20,
                          borderWidth: 0.5,
                          borderColor: C.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: C.textSecondary }}>{vorschlag}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            }
            renderItem={renderLokal}
          />
        )}

        <SearchFilterModal
          visible={filterOffen}
          onClose={() => setFilterOffen(false)}
          onReset={resetFilter}
          minBetrag={minBetrag} setMinBetrag={setMinBetrag}
          maxBetrag={maxBetrag} setMaxBetrag={setMaxBetrag}
          vonDatum={vonDatum}   setVonDatum={setVonDatum}
          bisDatum={bisDatum}   setBisDatum={setBisDatum}
          typ={typ}             setTyp={setTyp}
          risiko={risiko}       setRisiko={setRisiko}
          mitErledigt={mitErledigt}
          setMitErledigt={setMitErledigt}
          C={C}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
