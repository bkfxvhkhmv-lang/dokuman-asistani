import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../ThemeContext';

interface Kurum {
  ad: string;
  aciklama?: string;
  telefon?: string;
  web?: string;
  onemli?: string;
}

interface Kategorie {
  id: string;
  label: string;
  icon: string;
  renk: string;
  kurumlar: Kurum[];
}

const YARDIM_KATEGORILERI: Kategorie[] = [
  {
    id: 'kostenlos', label: 'Kostenlose Beratung', icon: '🆓', renk: '#1D9E75',
    kurumlar: [
      { ad: 'Verbraucherzentrale', aciklama: 'Rechnungen, Verträge, Inkasso — kostenlose Erstberatung', telefon: '0900 1 400 400', web: 'verbraucherzentrale.de', onemli: 'Mo–Fr 9–18 Uhr · 2 €/Min.' },
      { ad: 'Caritas', aciklama: 'Sozialberatung, Schulden, Behördenangelegenheiten', telefon: '0800 909 090 0', web: 'caritas.de', onemli: 'Kostenlos · mehrsprachig' },
      { ad: 'AWO Beratung', aciklama: 'Soziale Beratung, Migration, Existenzsicherung', telefon: '030 26309 0', web: 'awo.org', onemli: 'Lokale AWO-Stellen kostenfrei' },
      { ad: 'Diakonie', aciklama: 'Schuldnerberatung, Wohnungshilfe, Sozialberatung', web: 'diakonie.de', onemli: 'Kostenlos · auch auf Türkisch' },
    ],
  },
  {
    id: 'miete', label: 'Mietrecht & Wohnen', icon: '🏠', renk: '#D35400',
    kurumlar: [
      { ad: 'Deutscher Mieterbund', aciklama: 'Mieterhöhung, Kündigung, Nebenkosten anfechten', telefon: '030 223 230', web: 'mieterbund.de', onemli: 'Mit Mitgliedschaft kostenlos' },
      { ad: 'Mieterschutzbund', aciklama: 'Rechtliche Beratung für Mieter, Widersprüche', web: 'mieterschutzbund.de', onemli: 'Jahresbeitrag ~50 €' },
    ],
  },
  {
    id: 'schulden', label: 'Schulden & Inkasso', icon: '💳', renk: '#E74C3C',
    kurumlar: [
      { ad: 'Schuldnerberatung (kostenlos)', aciklama: 'Schuldenregulierung, Insolvenzberatung, Pfändungsschutz', web: 'schuldnerberatung.de', onemli: 'Kostenlos über Wohlfahrtsverbände' },
      { ad: 'InkassoKompass', aciklama: 'Inkassoforderungen prüfen — überhöhte Gebühren anfechten', web: 'inkassokompass.de', onemli: 'Kostenloser Forderungscheck' },
    ],
  },
  {
    id: 'anwalt', label: 'Anwaltliche Beratung', icon: '', renk: '#534AB7',
    kurumlar: [
      { ad: 'Anwaltauskunft', aciklama: 'Anwaltsuche nach Fachgebiet und Ort', telefon: '0900 1 875 000', web: 'anwaltauskunft.de', onemli: '1,99 €/Min. · Erstberatung möglich' },
      { ad: 'Beratungshilfe', aciklama: 'Anwalt beim Amtsgericht beantragen — kostenlos bei geringem Einkommen', web: 'bmj.de', onemli: 'Beim Amtsgericht beantragen → Beratungshilfe-Schein' },
      { ad: 'Rechtsschutzversicherung', aciklama: 'Falls vorhanden: Versicherung anrufen, Deckung anfragen', onemli: 'Police nummer bereithalten' },
    ],
  },
  {
    id: 'migration', label: 'Migration & Aufenthalt', icon: '🛂', renk: '#3498DB',
    kurumlar: [
      { ad: 'Migrationsberatung (MBE)', aciklama: 'Aufenthaltsrecht, Behördengänge, Integration', web: 'bamf.de', onemli: 'Kostenlos · mehrsprachig' },
      { ad: 'Flüchtlingsrat', aciklama: 'Asylrecht, Duldung, Abschiebeschutz', web: 'fluechtlingsrat.de', onemli: 'Kostenlos · regional' },
      { ad: 'IQ Netzwerk', aciklama: 'Berufsanerkennung, Arbeitsmarktzugang', web: 'netzwerk-iq.de', onemli: 'Kostenlos · bundesweit' },
    ],
  },
  {
    id: 'notfall', label: 'Notfall-Nummern', icon: '🆘', renk: '#E74C3C',
    kurumlar: [
      { ad: 'Notruf Polizei',     telefon: '110',           onemli: 'Kostenlos · 24/7' },
      { ad: 'Notruf Feuerwehr',   telefon: '112',           onemli: 'Kostenlos · 24/7' },
      { ad: 'Telefonseelsorge',   telefon: '0800 111 0 111', onemli: 'Kostenlos · 24/7 · anonym' },
      { ad: 'Opferschutztelefon', telefon: '116 006',       onemli: 'Kostenlos · 24/7' },
    ],
  },
];

interface HilfeModalProps {
  visible: boolean;
  onClose: () => void;
  dokTyp?: string;
}

export default function HilfeModal({ visible, onClose, dokTyp }: HilfeModalProps) {
  const { Colors: C, R, S } = useTheme();
  const [aktifKat, setAktifKat] = useState<Kategorie | null>(null);

  const handleTelefon = (tel: string) => { Linking.openURL(`tel:${tel.replace(/\s/g, '')}`).catch(() => null); };
  const handleWeb    = (url: string) => { Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() => null); };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
        {aktifKat ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
              <TouchableOpacity onPress={() => setAktifKat(null)}>
                <Text style={{ fontSize: 15, color: C.primary }}>← Zurück</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: C.text }}>{aktifKat.icon}  {aktifKat.label}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {aktifKat.kurumlar.map((k, i) => (
                <View key={i} style={{ backgroundColor: C.bg, borderRadius: R.lg, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 }}>{k.ad}</Text>
                  {k.aciklama && <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, lineHeight: 18 }}>{k.aciklama}</Text>}
                  {k.onemli && (
                    <View style={{ backgroundColor: C.primaryLight, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 11, color: C.primaryDark, fontWeight: '600' }}>ℹ️  {k.onemli}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {k.telefon && (
                      <TouchableOpacity onPress={() => handleTelefon(k.telefon!)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: R.md, backgroundColor: C.successLight, borderWidth: 1, borderColor: C.successBorder }}>
                        <Text style={{ fontSize: 14 }}>📞</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.successText }}>{k.telefon}</Text>
                      </TouchableOpacity>
                    )}
                    {k.web && (
                      <TouchableOpacity onPress={() => handleWeb(k.web!)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: R.md, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary + '44' }}>
                        <Text style={{ fontSize: 14 }}>🌐</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.primaryDark }} numberOfLines={1}>{k.web}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>🆘 Hilfe & Beratung</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>Kostenlose und günstige Beratungsstellen in Deutschland</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {YARDIM_KATEGORILERI.map(kat => (
                <TouchableOpacity key={kat.id} onPress={() => setAktifKat(kat)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, marginBottom: 10, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border }}>
                  <View style={{ width: 46, height: 46, borderRadius: R.md, backgroundColor: kat.renk + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{kat.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{kat.label}</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                      {kat.kurumlar.length} Anlaufstelle{kat.kurumlar.length !== 1 ? 'n' : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, color: C.textTertiary }}>›</Text>
                </TouchableOpacity>
              ))}
              <View style={{ backgroundColor: C.warningLight, borderRadius: R.lg, padding: 14, marginTop: 8, borderWidth: 1, borderColor: C.warningBorder }}>
                <Text style={{ fontSize: 12, color: C.warningText, lineHeight: 18 }}>
                   Diese App ist kein Rechtsanwalt. Die Informationen dienen nur zur Orientierung. Bei rechtlichen Fragen wenden Sie sich an eine Beratungsstelle.
                </Text>
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}
