import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { explainDocument } from '../services/v4Api';
import { isOnline } from '../services/offlineQueue';
import type { Dokument } from '../store';

const _cacheKey = (docId: string, lang: string) => `@bp_aciklama_${docId}_${lang}`;

const TTS_DILLER: Record<string, string> = {
  tr: 'tr-TR', de: 'de-DE', en: 'en-US', ar: 'ar-SA',
  uk: 'uk-UA', ru: 'ru-RU', fr: 'fr-FR', es: 'es-ES',
  pl: 'pl-PL', it: 'it-IT', hr: 'hr-HR', ro: 'ro-RO',
  bg: 'bg-BG', el: 'el-GR', vi: 'vi-VN', fa: 'fa-IR',
};

interface DilItem {
  code: string;
  flag: string;
  name: string;
}

const DILLER: DilItem[] = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'sr', flag: '🇷🇸', name: 'Srpski' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
  { code: 'so', flag: '🇸🇴', name: 'Soomaali' },
  { code: 'ku', flag: '🏳️', name: 'Kurdî' },
];

interface AciklamaResult {
  text: string;
  model_used: string;
}

interface BelgeAciklamaModalProps {
  visible: boolean;
  onClose: () => void;
  dok?: Dokument;
}

export default function BelgeAciklamaModal({ visible, onClose, dok }: BelgeAciklamaModalProps) {
  const { Colors: C, R } = useTheme();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [seciliDil, setSeciliDil] = useState('tr');
  const [aciklama, setAciklama]   = useState<AciklamaResult | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata]           = useState<string | null>(null);
  const [dilSec, setDilSec]       = useState(false);
  const [okuyor, setOkuyor]       = useState(false);

  useEffect(() => {
    if (visible) {
      setAciklama(null);
      setHata(null);
      setDilSec(false);
    } else {
      Speech.stop();
      setOkuyor(false);
    }
  }, [visible]);

  const handleDinle = async () => {
    if (okuyor) {
      await Speech.stop();
      setOkuyor(false);
      return;
    }
    if (!aciklama?.text) return;
    setOkuyor(true);
    Speech.speak(aciklama.text, {
      language: TTS_DILLER[seciliDil] || 'de-DE',
      rate: 0.9,
      onDone: () => setOkuyor(false),
      onError: () => setOkuyor(false),
    });
  };

  const handleAcikla = async (dilKodu = seciliDil) => {
    if (!dok?.id) return;
    setYukleniyor(true);
    setHata(null);
    setAciklama(null);
    try {
      const online = await isOnline();
      if (!online) {
        const cached = await AsyncStorage.getItem(_cacheKey(dok.id, dilKodu));
        if (cached) {
          setAciklama({ ...JSON.parse(cached), model_used: 'cache/offline' });
          return;
        }
        setHata('Kein Internet. Bitte zuerst online öffnen, dann wird die Erklärung gespeichert.');
        return;
      }
      const sonuc = await explainDocument(dok.id, dilKodu) as unknown as AciklamaResult;
      if (!mountedRef.current) return;
      setAciklama(sonuc);
      await AsyncStorage.setItem(_cacheKey(dok.id, dilKodu), JSON.stringify(sonuc));
    } catch {
      if (!mountedRef.current) return;
      setHata('Erklärung konnte nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      if (mountedRef.current) setYukleniyor(false);
    }
  };

  const handleDilSec = (dil: DilItem) => {
    setSeciliDil(dil.code);
    setDilSec(false);
    handleAcikla(dil.code);
  };

  const handleKopyala = async () => {
    if (aciklama?.text) await Clipboard.setStringAsync(aciklama.text);
  };

  const handlePaylas = async () => {
    if (aciklama?.text) await Share.share({ message: aciklama.text });
  };

  const seciliDilObj = DILLER.find(d => d.code === seciliDil) || DILLER[0];

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '90%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
          alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 10 }}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Dokument verstehen</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary }}>KI-gestützt — nur Metadaten werden verwendet</Text>
          </View>
          <TouchableOpacity onPress={() => setDilSec(!dilSec)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 7,
              backgroundColor: C.bgInput, borderRadius: R.full,
              borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 16 }}>{seciliDilObj.flag}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{seciliDilObj.name}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>▾</Text>
          </TouchableOpacity>
        </View>

        {dilSec && (
          <View style={{ marginHorizontal: 16, marginBottom: 12,
            backgroundColor: C.bgCard, borderRadius: R.lg,
            borderWidth: 1, borderColor: C.border, maxHeight: 240,
            shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DILLER.map(dil => (
                <TouchableOpacity key={dil.code} onPress={() => handleDilSec(dil)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                    borderBottomWidth: 0.5, borderBottomColor: C.borderLight,
                    backgroundColor: seciliDil === dil.code ? C.primaryLight : 'transparent' }}>
                  <Text style={{ fontSize: 18 }}>{dil.flag}</Text>
                  <Text style={{ fontSize: 14,
                    fontWeight: seciliDil === dil.code ? '700' : '400',
                    color: seciliDil === dil.code ? C.primaryDark : C.text }}>{dil.name}</Text>
                  {seciliDil === dil.code && (
                    <Text style={{ marginLeft: 'auto', fontSize: 14, color: C.primary }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {!aciklama && !yukleniyor && !hata && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>
                Was bedeutet dieses Dokument?
              </Text>
              <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                Die KI erklärt das Dokument auf {seciliDilObj.name}.{'\n'}
                Der Dokumentinhalt wird niemals übertragen.
              </Text>
              <TouchableOpacity onPress={() => handleAcikla()}
                style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: R.full, backgroundColor: C.primary }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  {seciliDilObj.flag}  Auf {seciliDilObj.name} erklären
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {yukleniyor && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 16 }}>KI analysiert…</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 6 }}>
                Dauert in der Regel 3–10 Sekunden
              </Text>
            </View>
          )}

          {hata && (
            <View style={{ backgroundColor: C.dangerLight, borderRadius: R.lg,
              padding: 16, borderWidth: 1, borderColor: C.dangerBorder, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: C.dangerText }}>{hata}</Text>
              <TouchableOpacity onPress={() => handleAcikla()} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>Tekrar dene →</Text>
              </TouchableOpacity>
            </View>
          )}

          {aciklama && !yukleniyor && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                marginBottom: 14, padding: 8, borderRadius: R.md,
                backgroundColor: aciklama.model_used.startsWith('local') ? C.successLight : C.primaryLight }}>
                <Text style={{ fontSize: 12 }}>
                  {aciklama.model_used.startsWith('local') ? '🟢' : '🟣'}
                </Text>
                <Text style={{ fontSize: 11,
                  color: aciklama.model_used.startsWith('local') ? C.successText : C.primaryDark }}>
                  {aciklama.model_used.startsWith('local')
                    ? 'Local AI — 100 % DSGVO-konform, keine Zusatzkosten'
                    : 'Cloud AI (Claude Haiku) — Nur Metadaten übertragen'}
                </Text>
              </View>

              <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg,
                padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 14, color: C.text, lineHeight: 22,
                  textAlign: seciliDil === 'ar' || seciliDil === 'fa' ? 'right' : 'left' }}>
                  {aciklama.text}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity onPress={handleDinle}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center',
                    backgroundColor: okuyor ? C.warningLight : C.successLight,
                    borderWidth: 1, borderColor: okuyor ? C.warningBorder : C.successBorder }}>
                  <Text style={{ fontSize: 13, fontWeight: '600',
                    color: okuyor ? C.warningText : C.successText }}>
                    {okuyor ? '⏹ Dur' : '🔊 Dinle'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleKopyala}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center',
                    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bgInput }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>📋 Kopyala</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePaylas}
                  style={{ flex: 1, padding: 12, borderRadius: R.lg, alignItems: 'center', backgroundColor: C.primary }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>⬆ Teilen</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setDilSec(true)}
                style={{ padding: 12, borderRadius: R.lg, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 13, color: C.textSecondary }}>🌍 Farklı dilde açıkla</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
