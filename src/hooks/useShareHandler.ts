import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { useAuth } from '@/providers/AuthContext';
import { useT } from '@/hooks/useT';
import { canAddDocument, recordDocument } from '@/services/guestLimitService';
import {
  getPendingAndroidShareUris,
  subscribeAndroidShareIntents,
} from '@/services/androidShareIntentBridge';
import {
  processSharedFile,
  normaliseSharedUri,
  extractFileNameFromUri,
} from '@/services/ShareUploadService';

const PDF_EXTENSIONS = /\.(pdf)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|heic|tiff?|webp|bmp)$/i;
const SHARE_SCHEMES = /^(file|content):\/\//;

function isShareableUri(uri: string): boolean {
  if (SHARE_SCHEMES.test(uri)) return true;
  if (PDF_EXTENSIONS.test(uri)) return true;
  if (IMAGE_EXTENSIONS.test(uri)) return true;
  return false;
}

function dedupeUris(uris: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const uri of uris) {
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push(uri);
  }
  return out;
}

export interface PendingShare {
  uri: string;
  fileName: string;
}

// Handles file URIs arriving from:
//   iOS  — "Open With → BriefPilot" (file:// URL via Linking)
//   Android — ACTION_VIEW via Linking; ACTION_SEND via BriefPilotShareIntent native bridge

export function useShareHandler() {
  const { state, dispatch, storeHydrated } = useStore();
  const router = useRouter();
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { t: T } = useT();

  const processingRef = useRef(false);
  const pendingUrisRef = useRef<string[]>([]);
  const userRef = useRef(user);
  const docsRef = useRef(state.dokumente);

  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { docsRef.current = state.dokumente; }, [state.dokumente]);

  const handleUri = useCallback(async (rawUri: string) => {
    if (!rawUri || processingRef.current) return;
    if (!isShareableUri(rawUri)) return;

    processingRef.current = true;
    try {
      const uri = await normaliseSharedUri(rawUri);
      if (!uri) {
        processingRef.current = false;
        return;
      }

      const canAdd = await canAddDocument();
      const currentUser = userRef.current;
      if (currentUser?.isGuest && !canAdd) {
        Alert.alert(
          T('guest.limit.title'),
          T('guest.limit.body'),
          [
            { text: T('guest.limit.cta_later'), style: 'cancel' },
            { text: T('guest.limit.cta_register'), onPress: () => router.push('/login') },
            { text: T('guest.limit.cta_google'), onPress: () => { void loginWithGoogle(); } },
          ],
        );
        processingRef.current = false;
        return;
      }

      // Show confirm sheet; processingRef stays true until user acts
      const fileName = extractFileNameFromUri(uri);
      setPendingShare({ uri, fileName });
    } catch {
      processingRef.current = false;
    }
  }, [dispatch, router, T, loginWithGoogle]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissShare = useCallback(() => {
    setPendingShare(null);
    processingRef.current = false;
  }, []);

  const navigateToDocument = useCallback((dokId: string, tab: 'analiz' | 'ozet' = 'analiz') => {
    if (!dokId?.trim()) return;
    const target = { pathname: '/detail' as const, params: { dokId, tab } };
    try {
      router.replace(target);
      return;
    } catch {}
    setTimeout(() => {
      try {
        router.replace(target);
      } catch {}
    }, 0);
  }, [router]);

  const confirmAnalyse = useCallback(async () => {
    if (!pendingShare) return;
    const { uri } = pendingShare;
    setPendingShare(null);
    setProcessing(true);
    try {
      let duplicateNavigationHandled = false;
      const result = await processSharedFile(uri, docsRef.current, dispatch, {
        onUploaded: ({ duplicate, existingDocumentId }) => {
          if (!duplicate || !existingDocumentId) return;
          const existingLocal = docsRef.current.find(d => d.v4DocId === existingDocumentId);
          if (!existingLocal) return;
          duplicateNavigationHandled = true;
          Alert.alert(T('share.confirm.title'), T('ocr.upload.duplicate_toast'));
          navigateToDocument(
            existingLocal.id,
            existingLocal.v4JobStatus === 'pending' || existingLocal.v4JobStatus === 'processing'
              ? 'analiz'
              : 'ozet',
          );
        },
      });
      if (!result) return;
      dispatch({ type: 'ADD_DOKUMENT', payload: result.dokument });
      if (userRef.current?.isGuest) await recordDocument();
      if (!duplicateNavigationHandled) {
        navigateToDocument(result.dokument.id, 'analiz');
      }
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [pendingShare, dispatch, navigateToDocument, T]);

  const processUris = useCallback(async (uris: string[]) => {
    const novel = dedupeUris(uris);
    for (const uri of novel) {
      await handleUri(uri);
    }
  }, [handleUri]);

  // Both auth and store must be ready before processing share URIs.
  const notReady = authLoading || !storeHydrated;

  const enqueueUris = useCallback((uris: string[]) => {
    const novel = dedupeUris(uris);
    if (!novel.length) return;
    if (notReady) {
      pendingUrisRef.current.push(...novel);
      pendingUrisRef.current = dedupeUris(pendingUrisRef.current);
      return;
    }
    void processUris(novel);
  }, [notReady, processUris]);

  // Flush URIs queued while auth/store was hydrating.
  useEffect(() => {
    if (notReady) return;
    if (!pendingUrisRef.current.length) return;
    const batch = pendingUrisRef.current.splice(0);
    void processUris(batch);
  }, [notReady, processUris]);

  // Cold start: Linking (ACTION_VIEW) + native ACTION_SEND pending queue.
  useEffect(() => {
    if (notReady) return;
    let cancelled = false;
    (async () => {
      const [linkUrl, nativeUris] = await Promise.all([
        Linking.getInitialURL(),
        getPendingAndroidShareUris(),
      ]);
      if (cancelled) return;
      const uris = [...nativeUris, ...(linkUrl ? [linkUrl] : [])];
      enqueueUris(uris);
    })();
    return () => { cancelled = true; };
  }, [notReady, enqueueUris]);

  // Warm: Linking ACTION_VIEW deep links.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => { enqueueUris([url]); });
    return () => sub.remove();
  }, [enqueueUris]);

  // Warm: native ACTION_SEND while app is open.
  useEffect(() => {
    return subscribeAndroidShareIntents((uris) => { enqueueUris(uris); });
  }, [enqueueUris]);

  return { pendingShare, processing, dismissShare, confirmAnalyse };
}
