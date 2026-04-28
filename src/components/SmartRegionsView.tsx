import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import { useTheme } from '../ThemeContext';
import type { Dokument } from '../store';

interface Region {
  id: string;
  type: string;
  label: string;
  value: string;
  display: string;
  icon: string;
}

function extractRegions(rohText = '', dok: Partial<Dokument> = {}): Region[] {
  const regions: Region[] = [];

  const ibanRe = /\b(DE\d{2}[\s\d]{15,25})/g;
  let m;
  while ((m = ibanRe.exec(rohText)) !== null) {
    const val = m[1].replace(/\s/g, '');
    if (!regions.find(r => r.value === val))
      regions.push({ id: `iban_${val}`, type: 'iban', label: 'IBAN', value: val, display: val.replace(/(.{4})/g, '$1 ').trim(), icon: 'bank' });
  }

  const betragRe = /(?:€\s*|EUR\s*)(\d{1,6}[.,]\d{2})|(\d{1,6}[.,]\d{2})\s*(?:€|EUR)/g;
  const seenAmounts = new Set<number>();
  while ((m = betragRe.exec(rohText)) !== null) {
    const raw = (m[1] || m[2]).replace(',', '.');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0 && !seenAmounts.has(val)) {
      seenAmounts.add(val);
      regions.push({ id: `betrag_${val}`, type: 'betrag', label: 'Betrag', value: String(val), display: `${raw.replace('.', ',')} €`, icon: 'currency' });
    }
  }

  const datumRe = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g;
  const seenDates = new Set<string>();
  while ((m = datumRe.exec(rohText)) !== null) {
    const [, d, mo, y] = m;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!seenDates.has(iso)) {
      seenDates.add(iso);
      regions.push({ id: `datum_${iso}`, type: 'datum', label: 'Datum', value: iso, display: `${d}.${mo}.${y}`, icon: 'calendar' });
    }
  }

  const telRe = /(?:Tel\.|Telefon|Fon|☎)[\s:]*([\d\s/()+-]{7,20})/gi;
  while ((m = telRe.exec(rohText)) !== null) {
    const val = m[1].trim().replace(/\s/g, '');
    if (!regions.find(r => r.value === val))
      regions.push({ id: `tel_${val}`, type: 'telefon', label: 'Telefon', value: val, display: m[1].trim(), icon: 'phone' });
  }

  const refRe = /(?:[Aa]ktenzeichen|[Rr]eferenz(?:nummer)?|[Vv]organgs-?Nr\.?):?\s*([A-Z0-9/_-]{4,25})/g;
  while ((m = refRe.exec(rohText)) !== null) {
    const val = m[1].trim();
    if (!regions.find(r => r.value === val))
      regions.push({ id: `ref_${val}`, type: 'referenz', label: 'Aktenzeichen', value: val, display: val, icon: 'hash' });
  }

  const addrRe = /(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s[A-ZÄÖÜ][a-zäöüß]+)?)/g;
  while ((m = addrRe.exec(rohText)) !== null) {
    const val = `${m[1]} ${m[2]}`;
    if (!regions.find(r => r.value === val))
      regions.push({ id: `addr_${m[1]}`, type: 'adresse', label: 'Adresse', value: val, display: val, icon: 'map-pin' });
  }

  const mailRe = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  while ((m = mailRe.exec(rohText)) !== null) {
    const val = m[1];
    if (!regions.find(r => r.value === val))
      regions.push({ id: `mail_${val}`, type: 'email', label: 'E-Mail', value: val, display: val, icon: 'envelope' });
  }

  return regions.slice(0, 15);
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  iban:     { bg: '#E3F2FD', border: '#1E88E5', text: '#1565C0' },
  betrag:   { bg: '#FCE4EC', border: '#E53935', text: '#B71C1C' },
  datum:    { bg: '#E8F5E9', border: '#43A047', text: '#1B5E20' },
  telefon:  { bg: '#FFF3E0', border: '#FB8C00', text: '#E65100' },
  email:    { bg: '#F3E5F5', border: '#8E24AA', text: '#4A148C' },
  adresse:  { bg: '#E0F7FA', border: '#00ACC1', text: '#006064' },
  referenz: { bg: '#F5F5F5', border: '#757575', text: '#424242' },
};

function useFeedback() {
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(text);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => setMsg(null), 2100);
  }, [opacity]);

  return { msg, opacity, show };
}

function useRegionActions(dok: Partial<Dokument>, showFeedback: (msg: string) => void) {
  const addToCalendar = useCallback(async (region: Region) => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') { showFeedback('Kalenderzugriff nicht erlaubt'); return; }
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const def = cals.find(c => c.allowsModifications) ?? cals[0];
    if (!def) { showFeedback('Kein beschreibbarer Kalender gefunden'); return; }
    const start = new Date(region.value); start.setHours(9, 0, 0, 0);
    const end   = new Date(region.value); end.setHours(10, 0, 0, 0);
    await Calendar.createEventAsync(def.id, {
      title: dok.titel || 'BriefPilot Frist', startDate: start, endDate: end,
      notes: dok.absender, alarms: [{ relativeOffset: -24 * 60 }, { relativeOffset: -60 }],
    });
    showFeedback('Termin eingetragen');
  }, [dok, showFeedback]);

  const handleTap = useCallback(async (region: Region) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (region.type) {
      case 'iban':
      case 'referenz':
        await Clipboard.setStringAsync(region.value);
        showFeedback(`${region.label} kopiert`);
        break;
      case 'betrag':
        await Clipboard.setStringAsync(region.value);
        showFeedback(`${region.display} kopiert`);
        break;
      case 'datum':
        await addToCalendar(region);
        break;
      case 'telefon': {
        const url = `tel:${region.value}`;
        const ok = await Linking.canOpenURL(url);
        if (ok) Linking.openURL(url);
        else { await Clipboard.setStringAsync(region.value); showFeedback('Nummer kopiert'); }
        break;
      }
      case 'email':
        Linking.openURL(`mailto:${region.value}?subject=${encodeURIComponent(dok.titel || '')}`);
        break;
      case 'adresse':
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(region.value)}`);
        break;
      default:
        await Clipboard.setStringAsync(region.value);
        showFeedback('Kopiert');
    }
  }, [addToCalendar, dok, showFeedback]);

  return { handleTap };
}

interface SmartRegionsViewProps {
  dok?: Partial<Dokument>;
}

export default function SmartRegionsView({ dok }: SmartRegionsViewProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const regions = useMemo(() => extractRegions(dok?.rohText || '', dok), [dok?.rohText]);
  const { msg, opacity, show } = useFeedback();
  const { handleTap } = useRegionActions(dok ?? {}, show);

  if (!regions.length) return null;

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
        ERKANNTE FELDER
      </Text>
      <View style={{ borderRadius: R.lg, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, padding: S.md, ...Shadow.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'nowrap', gap: 8 }}>
          {regions.map(region => {
            const colors = TYPE_COLORS[region.type] ?? TYPE_COLORS.referenz;
            return (
              <TouchableOpacity key={region.id} onPress={() => handleTap(region)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                  backgroundColor: colors.bg, borderColor: colors.border }}>
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.border, letterSpacing: 0.4 }}>
                    {region.label.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {region.display.length > 18 ? region.display.slice(0, 17) + '…' : region.display}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {msg && (
          <Animated.View style={{ opacity, marginTop: 8, paddingHorizontal: 10, paddingVertical: 5,
            backgroundColor: '#1A1A2E', borderRadius: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>✓ {msg}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
