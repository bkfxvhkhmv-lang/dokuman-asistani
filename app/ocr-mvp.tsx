import OcrMvpScreen from '@/features/ocr-mvp/OcrMvpScreen';
import { useRouter } from 'expo-router';

export default function OcrMvpRoute() {
  const router = useRouter();
  return <OcrMvpScreen onClose={() => router.back()} />;
}
