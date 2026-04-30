import React from 'react';
import KameraScreenView from '@/features/scan/kamera-screen/KameraScreenView';

/** Tab Kamera girişi — Expo Go / prod ayrımı artık aynı ağaca indiği için tek yükleme. */
export default function ScanScreen() {
  return <KameraScreenView />;
}
