import { useRouter } from 'expo-router';
import OcrMvpScreen from '@/features/ocr-mvp/OcrMvpScreen';

export default function ScanTab() {
  const router = useRouter();
  return <OcrMvpScreen onClose={() => router.replace('/(tabs)/index')} />;
}
