import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
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
  // Stable ref to latest enqueueUris — subscriptions use this so they never need to
  // teardown/re-register when enqueueUris reference changes between renders.
  const enqueueUrisRef = useRef<(uris: string[]) => void>(() => {});
  // Accumulates cold-start URIs if the cold-start effect is cancelled mid-flight.
  // getPendingAndroidShareUris() drains the native queue immediately, so drained
  // URIs must survive effect cancellation to be processed in the next effect run.
  const drainedUrisRef = useRef<string[]>([]);

  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { docsRef.current = state.dokumente; }, [state.dokumente]);

  // Show sheet IMMEDIATELY on URI receipt — file copy is deferred to confirmAnalyse.
  // This prevents normaliseSharedUri / FileSystem.copyAsync failures from silently
  // swallowing the share event before the user ever sees anything.
  const handleUri = useCallback(async (rawUri: string) => {
    console.warn('[ShareHandler] handleUri called:', rawUri.slice(0, 100));
    if (!rawUri || processingRef.current) {
      console.warn('[ShareHandler] handleUri blocked —', processingRef.current ? 'processingRef=true' : 'empty URI');
      return;
    }
    if (!isShareableUri(rawUri)) {
      console.warn('[ShareHandler] handleUri: URI not shareable:', rawUri.slice(0, 100));
      return;
    }

    processingRef.current = true;
    try {
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

      const fileName = extractFileNameFromUri(rawUri);
      console.warn('[ShareHandler] setPendingShare:', fileName);
      setPendingShare({ uri: rawUri, fileName });
      // processingRef stays true until user acts (confirm or dismiss)
    } catch (e) {
      console.warn('[ShareHandler] handleUri error:', e);
      processingRef.current = false;
    }
  }, [T, router, loginWithGoogle]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissShare = useCallback(() => {
    setPendingShare(null);
    processingRef.current = false;
  }, []);

  const navigateToDocument = useCallback((dokId: string, tab: 'analiz' | 'ozet' = 'analiz') => {
    if (!dokId?.trim()) return;
    const target = { pathname: '/detail' as const, params: { dokId, tab } };
    // Use push so the back stack is preserved — safeBack() in DetailScreen can then
    // navigate back to the previous screen rather than falling through to /(tabs)/index.
    const tryNavigate = (attempt: number) => {
      try {
        router.push(target);
        console.warn('[ShareHandler] navigated to detail (attempt', attempt, ')');
      } catch (e) {
        console.warn('[ShareHandler] navigation failed attempt', attempt, String(e));
        if (attempt < 3) {
          // Exponential backoff: 100ms, 300ms — gives router time to finish transitions.
          setTimeout(() => tryNavigate(attempt + 1), 100 * attempt);
        }
      }
    };
    tryNavigate(1);
  }, [router]);

  const confirmAnalyse = useCallback(async () => {
    if (!pendingShare) return;
    const { uri: rawUri } = pendingShare;
    setPendingShare(null);
    setProcessing(true);
    console.warn('[ShareHandler] confirmAnalyse: upload started for', rawUri.slice(0, 100));
    try {
      // Normalise URI here (after user confirmed, not before showing sheet).
      // Fail-soft: if copyAsync fails, use raw URI and let processSharedFile attempt it.
      let resolvedUri = rawUri;
      const normalised = await normaliseSharedUri(rawUri);
      if (normalised) {
        resolvedUri = normalised;
        console.warn('[ShareHandler] URI normalised:', resolvedUri.slice(0, 100));
      } else {
        console.warn('[ShareHandler] normaliseSharedUri failed — using raw URI fallback:', rawUri.slice(0, 100));
      }

      let duplicateNavigationHandled = false;
      const result = await processSharedFile(resolvedUri, docsRef.current, dispatch, {
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
      if (!result) {
        console.warn('[ShareHandler] processSharedFile returned null — import failed');
        return;
      }
      console.warn('[ShareHandler] dispatch ADD_DOKUMENT:', result.dokument.id);
      dispatch({ type: 'ADD_DOKUMENT', payload: result.dokument });
      const targetId = result.dokument.id;
      if (userRef.current?.isGuest) await recordDocument();
      if (!duplicateNavigationHandled) {
        // Defer navigation by one scheduler tick so React commits ADD_DOKUMENT
        // before DetailScreen reads state.dokumente; prevents DocumentNotFoundView flash.
        console.warn('[ShareHandler] navigate to /detail?dokId=', targetId, '&tab=analiz');
        setTimeout(() => navigateToDocument(targetId, 'analiz'), 0);
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

  // Keep ref in sync so stable subscriptions always call the latest enqueueUris.
  useEffect(() => { enqueueUrisRef.current = enqueueUris; }, [enqueueUris]);

  // Flush URIs queued while auth/store was hydrating.
  useEffect(() => {
    if (notReady) return;
    if (!pendingUrisRef.current.length) return;
    const batch = pendingUrisRef.current.splice(0);
    void processUris(batch);
  }, [notReady, processUris]);

  // Cold start: native ACTION_SEND pending queue + iOS Linking ("Open With").
  // Android uses the native bridge exclusively — Linking.getInitialURL() on Android
  // triggers Expo Router's own linking machinery ("configured in multiple places" warning)
  // which remounts the navigation tree and resets share state before the sheet renders.
  // drainedUrisRef ensures URIs drained from the native queue are not lost when
  // this effect re-runs (notReady change) before the async body completes.
  useEffect(() => {
    if (notReady) return;
    let cancelled = false;
    (async () => {
      const [linkUrl, nativeUris] = await Promise.all([
        Platform.OS === 'ios' ? Linking.getInitialURL() : Promise.resolve(null),
        getPendingAndroidShareUris(),
      ]);
      // Persist drained URIs BEFORE checking cancelled.
      // The native queue is already emptied by this point; they must not be discarded.
      if (nativeUris.length) drainedUrisRef.current.push(...nativeUris);
      if (cancelled) return;
      const saved = drainedUrisRef.current.splice(0);
      const uris = dedupeUris([...saved, ...(linkUrl ? [linkUrl] : [])]);
      if (uris.length) enqueueUrisRef.current(uris);
    })();
    return () => { cancelled = true; };
  }, [notReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm: Linking ACTION_VIEW — iOS only.
  // Android: skip — native bridge handles all intents and Linking.addEventListener
  // conflicts with Expo Router's built-in Linking listener, causing "Looks like you
  // have configured linking in multiple places" + navigation tree remount on share.
  useEffect(() => {
    if (Platform.OS === 'android') return;
    const sub = Linking.addEventListener('url', ({ url }) => { enqueueUrisRef.current([url]); });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm: native ACTION_SEND — stable, never re-subscribes between renders.
  // Frequent re-subscription caused listener gaps during which share events were lost.
  useEffect(() => {
    return subscribeAndroidShareIntents((uris) => { enqueueUrisRef.current(uris); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Foreground drain: recovers URIs stuck in the native pending queue when
  // hasActiveReactInstance()=false prevented emitShareUris from firing.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      getPendingAndroidShareUris().then(uris => {
        if (uris.length) enqueueUrisRef.current(uris);
      }).catch(() => {});
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { pendingShare, processing, dismissShare, confirmAnalyse };
}
