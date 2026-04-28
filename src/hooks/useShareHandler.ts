import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import {
  processSharedFile,
  normaliseSharedUri,
  detectFileType,
} from '../services/ShareUploadService';

const PDF_EXTENSIONS = /\.(pdf)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|heic|tiff?|webp|bmp)$/i;
const SHARE_SCHEMES = /^(file|content):\/\//;

function isShareableUri(uri: string): boolean {
  if (SHARE_SCHEMES.test(uri)) return true;
  if (PDF_EXTENSIONS.test(uri)) return true;
  if (IMAGE_EXTENSIONS.test(uri)) return true;
  return false;
}

// Handles file URIs arriving from:
//   iOS  — "Open With → BriefPilot" (file:// URL via Linking)
//   Android — Share sheet / ACTION_VIEW (content:// URI via Linking)
//
// For true background iOS Share Extension (stays in originating app),
// a separate native Share Extension target is required — that's a future
// native build step. This hook covers all managed-Expo-reachable cases.

export function useShareHandler() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const processingRef = useRef(false);

  async function handleUri(rawUri: string | null) {
    if (!rawUri || processingRef.current) return;
    if (!isShareableUri(rawUri)) return;

    processingRef.current = true;
    try {
      const uri = await normaliseSharedUri(rawUri);
      if (!uri) return;

      const result = await processSharedFile(uri, state.dokumente);
      if (!result) return;

      dispatch({ type: 'ADD_DOKUMENT', payload: result.dokument });

      // Navigate to detail screen so user can review + confirm
      router.push({ pathname: '/detail', params: { dokId: result.dokument.id } });
    } finally {
      processingRef.current = false;
    }
  }

  // Check for a file that opened the app (cold start)
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleUri(url);
    });
  }, []);

  // Listen for files arriving while the app is already open
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleUri(url));
    return () => sub.remove();
  }, [state.dokumente]);
}
