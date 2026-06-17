import { useCallback, useEffect, useRef } from 'react';
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

function dedupeUris(uris: string[], seen: Set<string>): string[] {
  const out: string[] = [];
  for (const uri of uris) {
    if (!uri || seen.has(uri)) continue;
    out.push(uri);
  }
  return out;
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
  const seenUrisRef = useRef(new Set<string>());
  const pendingUrisRef = useRef<string[]>([]);
  const userRef = useRef(user);
  const docsRef = useRef(state.dokumente);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { docsRef.current = state.dokumente; }, [state.dokumente]);

  const handleUri = useCallback(async (rawUri: string) => {
    if (!rawUri || processingRef.current || seenUrisRef.current.has(rawUri)) return;
    if (!isShareableUri(rawUri)) return;

    seenUrisRef.current.add(rawUri);
    processingRef.current = true;
    try {
      const uri = await normaliseSharedUri(rawUri);
      if (!uri) return;

      const canAdd = await canAddDocument();

      const currentUser = userRef.current;
      if (currentUser?.isGuest && !canAdd) {
        Alert.alert(
          T('guest.limit.title'),
          T('guest.limit.body'),
          [
            { text: T('guest.limit.cta_later'), style: 'cancel' },
            {
              text: T('guest.limit.cta_register'),
              onPress: () => router.push('/login'),
            },
            {
              text: T('guest.limit.cta_google'),
              onPress: () => { void loginWithGoogle(); },
            },
          ],
        );
        return;
      }

      const result = await processSharedFile(uri, docsRef.current, dispatch);
      if (!result) return;

      dispatch({ type: 'ADD_DOKUMENT', payload: result.dokument });

      if (currentUser?.isGuest) {
        await recordDocument();
      }

      try {
        router.push({ pathname: '/detail', params: { dokId: result.dokument.id } });
      } catch {
        // Navigation may fail if called before root navigator mounts (cold-start share).
        // Document is already added to store; user will find it in the list.
      }
    } finally {
      processingRef.current = false;
    }
  }, [dispatch, router, T, loginWithGoogle]);

  const processUris = useCallback(async (uris: string[]) => {
    const novel = dedupeUris(uris, seenUrisRef.current);
    for (const uri of novel) {
      await handleUri(uri);
    }
  }, [handleUri]);

  // Both auth and store must be ready before processing share URIs.
  // Auth resolves faster than store (smaller key); if we process before
  // LOAD fires, ADD_DOKUMENT gets overwritten by the hydration payload.
  const notReady = authLoading || !storeHydrated;

  const enqueueUris = useCallback((uris: string[]) => {
    const novel = dedupeUris(uris, seenUrisRef.current);
    if (!novel.length) return;
    if (notReady) {
      pendingUrisRef.current.push(...novel);
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
    const sub = Linking.addEventListener('url', ({ url }) => {
      enqueueUris([url]);
    });
    return () => sub.remove();
  }, [enqueueUris]);

  // Warm: native ACTION_SEND while app is open.
  useEffect(() => {
    return subscribeAndroidShareIntents((uris) => {
      enqueueUris(uris);
    });
  }, [enqueueUris]);
}
