import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { filterBySearch, parseNatuerlicheAbfrage } from '../../utils';
import { useSearch } from '../../hooks/useSearch';
import type { Dokument } from '../../store';

const MAX_VERLAUF = 8;

export interface SearchFilters {
  minBetrag: string;
  maxBetrag: string;
  vonDatum: string;
  bisDatum: string;
  typ: string;
  risiko: string;
  mitErledigt: boolean;
}

export function useSearchState(docs: Dokument[]) {
  const [query, setQuery]             = useState('');
  const [filterOffen, setFilterOffen] = useState(false);
  const [minBetrag, setMinBetrag]     = useState('');
  const [maxBetrag, setMaxBetrag]     = useState('');
  const [vonDatum, setVonDatum]       = useState('');
  const [bisDatum, setBisDatum]       = useState('');
  const [typ, setTyp]                 = useState('alle');
  const [risiko, setRisiko]           = useState('alle');
  const [mitErledigt, setMitErledigt] = useState(false);
  const [suchVerlauf, setSuchVerlauf] = useState<string[]>([]);
  const [v4Modus, setV4Modus]         = useState(false);
  const [ftsWeight, setFtsWeight]     = useState(0.5);
  const v4Timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (v4Timer.current) clearTimeout(v4Timer.current); };
  }, []);

  const { results: v4Ergebnisse, loading: v4Laden, error: v4FehlerRaw, searchRemote, clear: clearV4 } = useSearch();

  const v4Fehler = v4FehlerRaw ? 'V4-Suche nicht erreichbar — lokale Ergebnisse werden angezeigt' : null;

  const filterAktiv = !!(
    minBetrag || maxBetrag || vonDatum || bisDatum ||
    typ !== 'alle' || risiko !== 'alle' || mitErledigt
  );

  const parsedHint = useMemo(() => {
    if (query.length < 3) return null;
    const p = parseNatuerlicheAbfrage(query);
    const hints: string[] = [];
    if (p.ueberfaellig) hints.push('Überfällig');
    if (p.minBetrag) hints.push(`≥ ${parseFloat(p.minBetrag).toFixed(0)} €`);
    if (p.maxBetrag && !p.minBetrag) hints.push(`≤ ${parseFloat(p.maxBetrag).toFixed(0)} €`);
    if (p.vonDatum && p.bisDatum) hints.push(`${p.vonDatum} – ${p.bisDatum}`);
    if (p.typ) hints.push(p.typ);
    if (p.risiko) hints.push(p.risiko.charAt(0).toUpperCase() + p.risiko.slice(1));
    return hints.length > 0 ? hints : null;
  }, [query]);

  const lokal = useMemo(
    () => filterBySearch(docs, { query, minBetrag, maxBetrag, vonDatum, bisDatum, typ, risiko, mitErledigt }),
    [docs, query, minBetrag, maxBetrag, vonDatum, bisDatum, typ, risiko, mitErledigt]
  );

  const zeigeSuche = query.length >= 2 || filterAktiv;

  const triggerV4Search = useCallback((text: string) => {
    if (!v4Modus || text.trim().length < 3) { clearV4(); return; }
    if (v4Timer.current) clearTimeout(v4Timer.current);
    v4Timer.current = setTimeout(() => {
      searchRemote(text, { topK: 15, ftsWeight, vectorWeight: 1 - ftsWeight });
    }, 300);
  }, [v4Modus, ftsWeight, searchRemote, clearV4]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (v4Modus) triggerV4Search(text);
  }, [v4Modus, triggerV4Search]);

  const handleSubmit = useCallback(() => {
    if (query.trim().length < 2) return;
    setSuchVerlauf(prev => [query.trim(), ...prev.filter(s => s !== query.trim())].slice(0, MAX_VERLAUF));
    if (v4Modus) triggerV4Search(query);
  }, [query, v4Modus, triggerV4Search]);

  const toggleV4 = useCallback(() => {
    setV4Modus(prev => {
      const next = !prev;
      clearV4();
      if (next && query.trim().length >= 3) triggerV4Search(query);
      return next;
    });
  }, [clearV4, query, triggerV4Search]);

  const resetFilter = useCallback(() => {
    setMinBetrag('');
    setMaxBetrag('');
    setVonDatum('');
    setBisDatum('');
    setTyp('alle');
    setRisiko('alle');
    setMitErledigt(false);
    setFilterOffen(false);
  }, []);

  return {
    // State
    query,
    filterOffen, setFilterOffen,
    minBetrag, setMinBetrag,
    maxBetrag, setMaxBetrag,
    vonDatum, setVonDatum,
    bisDatum, setBisDatum,
    typ, setTyp,
    risiko, setRisiko,
    mitErledigt, setMitErledigt,
    suchVerlauf, setSuchVerlauf,
    v4Modus,
    ftsWeight, setFtsWeight,
    // Derived
    filterAktiv,
    parsedHint,
    lokal,
    zeigeSuche,
    v4Ergebnisse,
    v4Laden,
    v4Fehler,
    // Actions
    handleSearch,
    handleSubmit,
    toggleV4,
    resetFilter,
    triggerV4Search,
    clearV4,
  };
}
