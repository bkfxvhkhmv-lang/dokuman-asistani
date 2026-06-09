import { Redirect, useLocalSearchParams } from 'expo-router';
import DetailScreen from '@/features/detail/DetailScreen';

export function normalizedDokIdFromParams(raw: string | string[] | undefined): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return (raw[0] ?? '').trim();
  return String(raw).trim();
}

/**
 * Geçersiz/boş dokId ile /detail veya paralel navigator girişlerinde çökme önlenir → tabs’e güvenli dönüş.
 */
export default function DetailRouteGate() {
  const { dokId } = useLocalSearchParams<{ dokId?: string | string[] }>();
  if (!normalizedDokIdFromParams(dokId)) {
    return <Redirect href="/(tabs)" />;
  }
  return <DetailScreen />;
}
