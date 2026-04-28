import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme, type ThemeColors } from '../ThemeContext';
import { parseGiroCode, giroCodeToText } from '../services/giroCodeService';
import type { GiroCode } from '../services/giroCodeService';

type ScanResult = (GiroCode & { raw?: never }) | { raw: string; iban?: never };

interface QrScanModalProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (result: ScanResult) => void;
}

export default function QrScanModal({ visible, onClose, onResult }: QrScanModalProps) {
  const { Colors: C } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [tarama, setTarama] = useState(true);
  const [sonuc, setSonuc] = useState<ScanResult | null>(null);
  const scanned = useRef(false);

  const handleBarcode = ({ data }: { data: string }) => {
    if (!tarama || scanned.current) return;
    scanned.current = true;
    setTarama(false);
    const parsed = parseGiroCode(data);
    if (parsed) {
      setSonuc(parsed as ScanResult);
    } else {
      setSonuc({ raw: data });
    }
  };

  const handleKaydet = () => {
    if (onResult && sonuc) onResult(sonuc);
    handleKapat();
  };

  const handleKopyala = async () => {
    const gc = sonuc as GiroCode;
    const text = gc?.iban ? giroCodeToText(gc) : ((sonuc as { raw: string })?.raw || '');
    const { setStringAsync } = await import('expo-clipboard');
    await setStringAsync(text);
  };

  const handleKapat = () => {
    scanned.current = false;
    setTarama(true);
    setSonuc(null);
    onClose?.();
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: C.bg }]}>
          <Text style={{ color: C.text, marginBottom: 12 }}>Kamera izni gerekli.</Text>
          <TouchableOpacity onPress={requestPermission} style={[styles.btn, { backgroundColor: C.primary }]}>
            <Text style={{ color: '#fff' }}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleKapat} style={styles.kapat}>
            <Text style={{ color: C.textSecondary }}>İptal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {tarama ? (
          <>
            <CameraView style={{ flex: 1 }} facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcode} />
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>QR-Code in den Rahmen halten</Text>
            </View>
            <TouchableOpacity onPress={handleKapat} style={styles.kapatBtn}>
              <Text style={{ color: '#fff', fontSize: 16 }}>✕ Schließen</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.overlay, { backgroundColor: C.bg }]}>
            {(sonuc as GiroCode)?.iban ? (
              (() => { const g = sonuc as GiroCode; return (
              <>
                <Text style={[styles.baslik, { color: C.text }]}>💳 GiroCode erkannt</Text>
                <InfoRow label="Empfänger" value={g.name} C={C} />
                <InfoRow label="IBAN"      value={g.iban} C={C} />
                {g.bic       && <InfoRow label="BIC"      value={g.bic} C={C} />}
                {g.amount    && <InfoRow label="Betrag"   value={`${g.amount.toFixed(2)} €`} C={C} />}
                {g.reference && <InfoRow label="Referenz" value={g.reference} C={C} />}
                {g.info      && <InfoRow label="Info"     value={g.info} C={C} />}
              </>
              ); })()
            ) : (
              <>
                <Text style={[styles.baslik, { color: C.text }]}>QR-Inhalt</Text>
                <Text style={{ color: C.textSecondary, marginBottom: 12 }}>{(sonuc as { raw: string })?.raw}</Text>
              </>
            )}
            <View style={styles.butonlar}>
              <TouchableOpacity onPress={handleKopyala} style={[styles.btn, { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border }]}>
                <Text style={{ color: C.text }}>📋 Kopyala</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleKaydet} style={[styles.btn, { backgroundColor: C.primary }]}>
                <Text style={{ color: '#fff' }}>Kaydet</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { scanned.current = false; setTarama(true); setSonuc(null); }} style={styles.kapat}>
              <Text style={{ color: C.textSecondary }}>Tekrar Tara</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleKapat} style={styles.kapat}>
              <Text style={{ color: C.textSecondary }}>Kapat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, C }: { label: string; value: string; C: ThemeColors }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 11, color: C.textTertiary }}>{label}</Text>
      <Text style={{ fontSize: 14, color: C.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, padding: 24, justifyContent: 'center' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  scanFrame:   { width: 220, height: 220, borderWidth: 2, borderColor: '#fff', borderRadius: 12 },
  scanHint:    { color: '#fff', marginTop: 16, fontSize: 13 },
  kapatBtn:    { position: 'absolute', top: 48, right: 20, padding: 8 },
  baslik:      { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  butonlar:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn:         { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  kapat:       { alignSelf: 'center', marginTop: 16, padding: 8 },
});
